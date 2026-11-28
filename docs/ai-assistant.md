# Gợi ý hội nghị bằng AI

Người dùng mô tả đề tài bằng tiếng Việt hoặc tiếng Anh, hệ thống trả về tối đa 5 hội nghị phù hợp kèm lý do.
AI **không tự tìm hội nghị**: AI chỉ dịch câu hỏi thành bộ lọc, việc lọc do SQL làm, và AI chỉ được chọn trong danh sách có thật.
Quyết định thiết kế: QĐ8, QĐ9 trong [t5-feedback-improvement-plan.md](t5-feedback-improvement-plan.md).

## Trạng thái

| Phần | Trạng thái |
|---|---|
| Backend: luồng 5 bước, cache, ngân sách AI, giới hạn tần suất | Xong, có test (82 test backend) |
| Chuẩn hóa quốc gia/khu vực (backend) | Xong: 100% kỳ có địa điểm thật nhận ra quốc gia; Việt Nam 11 kỳ (đã gỡ 2 bản ghi kiểm thử giả `fixture-*` lẫn trong snapshot) |
| Widget frontend (mọi trang trừ trang Gợi ý AI) | Xong, đã chạy thử bằng Chrome headless ở 360px và 1366px |
| Trang `match.html` (TV2-04, TV2-05, TV2-06, TV2-09) | Xong: form bên trái, kết quả dùng thẻ hội nghị chung + khối lý do; menu "Gợi ý AI" chỉ hiện khi có backend; `?q=` điền sẵn và tự gợi ý |
| Gọi Gemini thật | Chạy được với `gemini-3.5-flash-lite` (khoảng 2,5–3 giây mỗi câu); 10 câu thử phân tích đúng, câu lừa và câu lạc đề bị chặn |
| Topics từ trang CFP (TV1-07/08) | Chưa làm; BM25 đang chạy trên tên hội nghị + mô tả lĩnh vực |
| Lọc quốc gia trên trang Explore (TV3-04) | Chưa làm; URL "Xem trong trang Hội nghị" đã có `region`/`country` để dùng khi xong |

## 1. Luồng xử lý `POST /api/match`

| Bước | Ở đâu | Làm gì | Khi lỗi |
|---|---|---|---|
| 0 | `match.js` | Tra cache 24 giờ theo SHA-256 của (phiên bản prompt, mô tả đã chuẩn hóa, bộ lọc) | — |
| 1 | `prompts.js` + `gemini.js` | Gemini đọc câu hỏi, trả JSON bộ lọc theo `PARSE_SCHEMA`. **Bỏ qua** khi request có `filters` (người dùng sửa chip) | 503 cho người dùng |
| 2 | `filters.js` `validateFilters` | Chỉ giữ giá trị trong danh sách cho phép; giá trị lạ bị bỏ, không throw | — |
| 3 | `db.js` `queryEditionIds` | SQL lọc cứng: khu vực (gồm vùng con), quốc gia, hạng tối thiểu, lĩnh vực, còn hạn trong N ngày. Mỗi hội nghị giữ 1 kỳ (`pickOnePerSeries`). Rỗng thì `relaxFilters` nới dần: thời gian → khu vực → hạng → lĩnh vực | — |
| 4 | `retrieval.js` `rankByKeywords` | BM25 theo **từ khóa tiếng Anh AI đã mở rộng** (không phải nguyên câu người dùng), cộng điểm cụm từ liền nhau và tên viết tắt; lấy 20 | — |
| 5 | `prompts.js` + `gemini.js` | Gemini chọn ≤ 5 trong 20, kèm điểm và lý do tiếng Việt. `validateRerank` bỏ ID không có trong 20, bỏ trùng, kẹp điểm, cắt độ dài | Trả 5 kết quả BM25, `rerankFailed: true`, không lưu cache |

Vì sao BM25 trên nguyên câu không đủ: người dùng viết "bảo mật" còn dữ liệu là "security"; viết "prompt injection" còn CFP ghi "LLM security". Bước 1 dịch và thêm từ đồng nghĩa nên bước 4 mới khớp được.

## 2. Hợp đồng API

`POST /api/match` — body tối đa 10 KB.

```json
{ "description": "20–1500 ký tự", "filters": { "region": "asia", "ccfMin": "B" } }
```

`filters` tùy chọn; có thì backend bỏ qua bước 1. Schema bộ lọc: mục 5.4 của plan (`region`, `countries`, `ccfMin`, `coreMin`, `withinDays` ∈ 30/90/180, `kind`, `fields`, `keywords`).

Response 200:

```json
{
  "offTopic": false,
  "parsedFilters": { "region": "asia", "countries": [], "ccfMin": "B", "coreMin": null, "withinDays": 90, "kind": "any", "fields": ["SC"], "keywords": ["llm security"] },
  "relaxed": ["withinDays"],
  "exploreUrl": "conferences.html?field=SC&ccf=A&ccf=B&region=asia",
  "results": [{ "id": "…", "score": 92, "reason": "…", "matchedTopics": ["…"], "edition": { "…": "edition đầy đủ theo contracts.md, thêm country/region" } }],
  "cached": false,
  "rerankFailed": true
}
```

`rerankFailed` chỉ có khi bước 5 lỗi. `offTopic: true` thì `results` rỗng.

| Mã | `error` | Khi nào |
|---|---|---|
| 400 | `INVALID_INPUT` | Mô tả ngoài 20–1500 ký tự, JSON hỏng, `filters` không phải object |
| 413 | `PAYLOAD_TOO_LARGE` | Body trên 10 KB |
| 422 | `AI_BLOCKED` | Bộ lọc an toàn của Gemini chặn câu hỏi |
| 429 | `RATE_LIMITED` | Quá 5 lần/phút hoặc 20 lần/ngày mỗi IP; có `retryAfter` và header `Retry-After` |
| 503 | `AI_UNAVAILABLE` | Chưa cấu hình, Gemini lỗi/hết giờ/hết quota ở bước 1 |
| 503 | `AI_BUSY` | Quá 4 yêu cầu AI đang chạy cùng lúc; `retryAfter: 5` |
| 503 | `AI_BUDGET_EXHAUSTED` | Cả hệ thống đã dùng hết lượt AI trong ngày |

`/api/conferences` trả thêm `country` và `region` cho mỗi edition (mở rộng, không đổi trường cũ).

## 3. Widget frontend

| File | Vai trò |
|---|---|
| `site/js/ai-match-client.js` | Hàm thuần: gọi API (không throw), đổi lỗi thành thông báo, bộ lọc ↔ chip, kiểm tra URL |
| `site/js/ui/ai-session.js` | Phần chung của widget và trang: đếm ký tự, gửi yêu cầu, chờ, đếm ngược 429, chip "AI hiểu là", khối lý do |
| `site/js/ui/ai-assistant.js` | Widget nổi: khung panel, thẻ kết quả gọn, link "Mở trang đầy đủ" |
| `site/match.html`, `site/js/pages/match.js`, `site/css/pages/match.css` | Trang Gợi ý AI: bố cục HTML, kết quả bằng `createEditionCard` |
| `site/css/ai-assistant.css` | Style, chỉ dùng token; tái dùng `.button`, `.field`, `.chip`, `.filter-chip`, `.ribbon`, `.urgency`, `.skeleton` |
| `site/js/common.js` | `initCommonUI` nạp widget bằng `import()` khi `AI_API_BASE` có giá trị |
| `site/js/config.js` | `AI_API_BASE`: localhost → `http://localhost:3000`; nơi khác để trống (widget ẩn) cho tới khi có URL Render |

Trạng thái được thiết kế: đóng, mở, đang chờ (3 chấm nhảy + khung xương + chữ tiến độ), kết quả, câu lạc đề, đã nới bộ lọc, AI không viết được lý do, lỗi, **429 đếm ngược và khóa nút**.

Chuyển động: viền gradient mận → hồng xoay quanh nút (`@property --ai-angle`), icon lấp lánh, panel bật ra từ góc nút, kết quả hiện lần lượt, thanh điểm chạy từ 0. Chỉ dùng `transform`/`opacity`; tắt hết khi người dùng chọn giảm chuyển động (`prefers-reduced-motion`).

Truy cập: nút có `aria-expanded`/`aria-controls`; panel `role="dialog"` có tiêu đề; mở thì focus vào ô nhập, Escape đóng và trả focus về nút; vùng `role="status"` đọc tiến độ; điểm có `aria-label`; mọi chữ từ AI gắn bằng `textContent`.

## 4. Rà soát hệ thống và bảo mật

Phạm vi theo góp ý của thầy: công cụ tra cứu mở, không đăng nhập, lưu lượng thấp, có mở AI cho người dùng nhập.

| Rủi ro | Cách chặn | Kiểm chứng |
|---|---|---|
| Spam một IP làm cháy quota AI | `express-rate-limit`: `/api/match` 5/phút **và** 20/ngày; bộ đếm đặt **trước** bước kiểm tra nên request sai cũng bị tính | `app.test.js`: lần 6 → 429; request 400 vẫn bị đếm |
| Tấn công từ nhiều IP (botnet, proxy xoay vòng) | Ngân sách toàn hệ thống `AI_DAILY_BUDGET` (300 lượt Gemini/ngày) + tối đa 4 yêu cầu AI đồng thời (`ai-budget.js`) | `match.test.js`: hết ngân sách, quá đồng thời, sang ngày mới |
| Giả mạo IP bằng `X-Forwarded-For` | `trust proxy` dạng số (0 trên máy, 1 trên Render), không dùng `true`; kiểm tra bằng `/api/debug/ip` sau deploy | `app.test.js`: header giả không lách được khi `TRUST_PROXY=0` |
| Nhiều sinh viên chung một IP (NAT ký túc xá, Wi-Fi trường) | Chấp nhận: 5/phút đủ cho một nhóm nhỏ; cache giúp câu trùng không tính lượt Gemini | Giới hạn đã biết, ghi trong báo cáo |
| Giữ kết nối nhỏ giọt (slowloris), body lớn | `headersTimeout` 15 giây, `requestTimeout` 45 giây, body ≤ 10 KB, mô tả ≤ 1500 ký tự, Gemini timeout 15 giây | `app.test.js`: 413; `gemini.test.js`: hết giờ → 503 |
| Prompt injection ("bỏ qua hướng dẫn…") | Câu người dùng nằm trong thẻ `<request>` và prompt yêu cầu coi là dữ liệu; Gemini **chỉ được trả JSON theo schema**; backend kiểm tra từng trường theo danh sách cho phép; ID ở bước 5 phải nằm trong 20 ứng viên; AI không có công cụ hay dữ liệu bí mật nào để lộ | `filters.test.js`, `match.test.js` (ID bịa bị loại, câu lạc đề). Chưa thử với Gemini thật |
| AI bịa hội nghị, hạn nộp | Chỉ chọn trong danh sách đã lọc; hạn, hạng, địa điểm hiển thị lấy từ dữ liệu, không lấy từ chữ AI | `match.test.js` |
| XSS qua chữ AI hoặc dữ liệu | Frontend chỉ dùng `textContent`; `exploreUrl` chỉ nhận `conferences.html?…`; `AI_API_BASE` chỉ nhận http/https | `ai-match-client.test.js`; `app.test.js` gửi `<img onerror>` trong lý do |
| SQL injection | Mọi giá trị đi qua tham số `?`; tên cột do code sinh | `db.test.js` với chuỗi `'; DROP TABLE` |
| Prototype pollution qua JSON | `validateFilters` chỉ đọc thuộc tính của chính object (`Object.hasOwn`), luôn tạo object mới | `filters.test.js` với `__proto__` |
| Lộ khóa Gemini | Khóa chỉ ở `.env` (đã `.gitignore`), Render env, GitHub Secrets; gửi qua header `x-goog-api-key`, không trong URL; lỗi trả cho người dùng không kèm chi tiết | `gemini.test.js` |
| Lộ thông tin lỗi | Middleware lỗi trả JSON chung, không stack trace; `helmet`; tắt `X-Powered-By` | `app.test.js` |
| CORS | Chỉ domain trong `ALLOWED_ORIGIN`. **CORS không phải lớp bảo mật** với curl/bot; lớp chặn thật là rate limit + ngân sách | `app.test.js` |
| Thư viện có lỗ hổng | `npm audit` = 0; `package-lock.json`; CI dùng `npm ci` | Chạy lại `npm audit` trước khi nộp |

### Cân bằng tải (load balancing)

Thầy xác nhận không cần. Hệ thống chạy **một tiến trình trên Render**, nên bộ đếm rate limit, ngân sách AI và cache trong bộ nhớ là chính xác.
Nếu sau này chạy nhiều bản (nhiều instance sau load balancer) thì **phải đổi**, vì mỗi bản có bộ đếm riêng làm giới hạn thực tế nhân lên N lần:

- rate limit: dùng store chung (ví dụ Redis với `rate-limit-redis`);
- ngân sách AI và `match_cache`: chuyển ra Redis/Postgres;
- `trust proxy`: đếm lại số proxy (load balancer thêm một tầng).

### Chưa làm (ngoài phạm vi hiện tại, ghi vào hướng phát triển)

- CSP cho frontend: GitHub Pages không cho đặt header; có thể thêm `<meta http-equiv="Content-Security-Policy">`.
- Crawler CFP (TV1-07) phải chặn SSRF: chỉ http/https, không gọi IP nội bộ (127.0.0.0/8, 10/8, 172.16/12, 192.168/16, 169.254/16), giới hạn kích thước trang và số lần chuyển hướng.
- Cloudflare phía trước Render để chặn DDoS tầng mạng (rate limit ứng dụng không chống được lưu lượng cực lớn).

## 5. Giới hạn đã biết

- BM25 chỉ có tên hội nghị và mô tả lĩnh vực cho tới khi có topics từ CFP. Ví dụ: từ khóa "computer vision" ra đúng CVPR/ICCV/ECCV, nhưng thêm "image recognition" thì các hội nghị nhận dạng mẫu (PRCV, ICPR) vượt ICCV. Bước 5 xử lý phần này; test `retrieval.test.js` ghi lại hành vi để biết khi nào BM25 tốt lên.
- Bộ lọc cứng có thể chỉ còn 1–2 kết quả (ví dụ: châu Á + CCF ≥ B + an toàn hệ thống + còn hạn 90 ngày). Hệ thống chỉ nới khi kết quả bằng 0.
- Cache và ngân sách mất khi server khởi động lại (chấp nhận được, xem QĐ4).
- Render bản miễn phí ngủ sau 15 phút; lần gọi đầu có thể mất 30–60 giây. Widget chờ tối đa 60 giây.

## 6. Kiểm chứng

| Lệnh / cách | Kết quả |
|---|---|
| `cd backend && npm test` | 82/82 đạt |
| `npm test` (thư mục gốc) | 73/73 đạt |
| Chrome headless qua DevTools Protocol, 360×780 và 1366×900, backend thật + Gemini giả | Nút hiện đúng góc; mở panel focus vào ô nhập; ví dụ → đang chờ → kết quả; bỏ chip "Châu Á" chạy lại với bộ lọc; lần 6 → nút "Thử lại sau 39 giây"; Escape đóng và trả focus; không tràn ngang; console chỉ có lỗi 429 cố ý gây ra |
| Khóa thật: `GET /v1beta/models` | 200, có `gemini-3.5-flash-lite`, `gemini-3.8-flash` |
| Khóa thật: `generateContent` | 403 "free tier is not available for this project" → server trả 503 đúng thiết kế |

Chưa kiểm: chất lượng câu trả lời của Gemini thật, trình đọc màn hình thật, Safari/Firefox.

## 7. Bật AI thật

1. Lấy khóa ở Google AI Studio từ một project **có gói miễn phí** (tạo project mới bằng tài khoản Google cá nhân), hoặc bật thanh toán cho project hiện tại.
2. Điền `backend/.env`: `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-3.5-flash-lite`.
3. `cd backend && npm run dev`, mở site bằng `python tools/serve.py`, bấm nút "Hỏi AI".
4. Ghi lại prompt và kết quả 10 câu thử vào `docs/prompt-plan/04-matcher-prompt.md` (TV4-10).
