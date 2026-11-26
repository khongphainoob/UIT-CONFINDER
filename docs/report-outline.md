# Khung báo cáo đồ án

> Mỗi thành viên điền phần module mình phụ trách. Không gộp trách nhiệm viết nội
> dung của cả nhóm vào TV4. Bản này đã sửa theo góp ý của thầy ngày 26/11/2026,
> xem [t5-feedback-improvement-plan.md](t5-feedback-improvement-plan.md).
>
> Nguyên tắc viết: mỗi mục phải trả lời được câu thầy hỏi là **"cái này khác gì
> vào thẳng CCFDDL?"**. Mục nào chỉ mô tả lại dữ liệu gốc thì viết ngắn, dành chỗ
> cho phần nhóm tự làm thêm.

## 1. Tổng quan sản phẩm (TV2)

- Bối cảnh: người làm nghiên cứu ở Việt Nam phải theo dõi hạn nộp ở nhiều trang, múi giờ AoE/PT/UTC dễ nhầm, không biết hội nghị nào hợp đề tài.
- **So sánh với CCFDDL** (bảng bắt buộc): cột "CCFDDL" và cột "UIT ConFinder" cho các tiêu chí giờ Việt Nam, lọc quốc gia, dự báo hạn năm sau, chủ đề chi tiết từ CFP, gợi ý bằng AI theo mô tả, lưu và xuất lịch.
- Mục tiêu và đối tượng: sinh viên, học viên cao học, giảng viên ngành CNTT.
- Phạm vi không làm và lý do (thầy đã xác nhận): đăng nhập, load balancing, OAuth lịch.

## 2. Phân công và đóng góp

| Thành viên | Module/task | File chính | Kết quả | Link PR/commit |
|---|---|---|---|---|
| TV1 | Catalog, chuẩn hóa quốc gia, dự báo hạn, ingest, crawler CFP, enrich | `data-adapter.js`, `deadline-utils.js`, `scripts/ingest.js`, `crawl-cfp.js`, `enrich.js` | ... | ... |
| TV2 | UI foundation, Home, About, trang Gợi ý hội nghị, slide | `common.js`, `pages/home.js`, `match.html`, `pages/match.js` | ... | ... |
| TV3 | Explore, sửa lỗi search ẩn kỳ đã qua, lọc quốc gia/180 ngày/topic, retrieval BM25 | `explore-state.js`, `pages/conference-list.js`, `backend/src/retrieval.js` | ... | ... |
| TV4 | Saved/calendar, backend Express, rate limit, cron, deploy, prompt log | `saved-store.js`, `backend/src/server.js`, `backend/src/match.js`, `.github/workflows/ingest.yml` | ... | ... |

Kèm ảnh bảng task trên Notion (cột người phụ trách, trạng thái, link PR).

## 3. Kiến trúc hệ thống (TV1 viết, TV4 duyệt)

- 3.1 Sơ đồ tổng thể: CCFDDL → cron (GitHub Actions) → JSON → SQLite → Express (rate limit) → frontend; frontend fallback snapshot.
- 3.2 Lý do chọn công nghệ: Node.js + Express, SQLite có sẵn trong Node, GitHub Actions cron, Gemini free tier, GitHub Pages + Render. Nêu phương án khác đã cân nhắc (PostgreSQL, Cloudflare Workers + D1) và vì sao chưa cần.
- 3.3 Thiết kế CSDL: sơ đồ ERD 5 bảng `series`, `editions`, `deadlines`, `match_cache`, `ingest_log`.
- 3.4 Đặc tả API: `GET /api/conferences`, `POST /api/match`, `GET /api/health`, gồm request, response, mã lỗi 400/429/503. Xem [contracts.md](contracts.md).
- 3.5 Luồng cập nhật dữ liệu: lịch cron, xử lý khi nguồn lỗi (giữ dữ liệu cũ, ghi `ingest_log`).

## 4. Nội dung theo module

Mỗi module viết đủ 4 ý: **Vấn đề → Thiết kế → Kết quả (ảnh) → Kiểm thử**.

### 4.1 TV1 — Dữ liệu và làm giàu dữ liệu

- Chuẩn hóa múi giờ AoE/PT/UTC sang giờ Việt Nam (đã có).
- Chuẩn hóa `place` thành `country`/`region`: bảng tra, tỷ lệ nhận diện, các ca khó (ví dụ "Singapore EXPO", "Ho Chi Minh City").
- Dự báo hạn năm sau: công thức, cách gắn nhãn "dự kiến", giới hạn.
- Crawler CFP: cách tìm trang CFP, giới hạn tốc độ, `robots.txt`, số chuỗi crawl được và tỷ lệ lỗi.
- Tóm tắt bằng LLM: prompt, schema JSON, cách validate, chi phí (chạy offline một lần).

### 4.2 TV2 — Giao diện, Home, About, Gợi ý hội nghị

- Hệ token và component (đã có), thêm nhãn "Dự kiến" và chip quốc gia.
- Trang Gợi ý hội nghị: luồng người dùng, các trạng thái (đang tải, kết quả, lỗi, 429), giới hạn 1.500 ký tự.
- Trang chủ: lối vào nhanh (mô tả nghiên cứu, Việt Nam, 3 tháng tới).
- Responsive và truy cập bằng bàn phím (đã có).

### 4.3 TV3 — Tìm kiếm, lọc và retrieval

- **Phân tích lỗi CVPR** (mục bắt buộc): hiện tượng khi thầy test → nguyên nhân thật (mặc định ẩn kỳ đã đóng, 274/385 chuỗi bị ảnh hưởng, "Đặt lại" không giải quyết) → các giả thuyết sai đã loại trừ → cách sửa (báo số kết quả bị ẩn, gộp theo chuỗi, dự báo năm sau) → test chống lặp lại.
- Search nhiều trường: acronym, tên, địa điểm, quốc gia, lĩnh vực, topic; bỏ dấu.
- Bộ lọc mới: quốc gia/khu vực, 180 ngày, topic.
- Retrieval BM25 cho AI matcher: công thức, các trường dùng, ví dụ điểm.

### 4.4 TV4 — Backend, AI matcher, bảo vệ hệ thống, tích hợp

- Luồng AI matcher 5 bước (QĐ8 trong plan): Gemini phân tích câu hỏi thành bộ lọc theo schema → backend kiểm tra theo danh sách cho phép → SQL lọc cứng (nới dần khi rỗng) → BM25 chấm theo từ khóa AI đã dịch và mở rộng → Gemini chọn 5 kèm lý do. So sánh với BM25 trên nguyên câu và với agent gọi tool nhiều vòng. Giải thích vì sao không đưa cả danh sách cho LLM (giới hạn context, giảm bịa, tiết kiệm quota).
- Chống bịa: LLM chỉ được chọn ID trong danh sách ứng viên; backend loại kết quả có ID lạ.
- **Rate limit và chống spam**: bảng hạn mức theo endpoint, giới hạn độ dài input, timeout, cache, mã 429 kèm `Retry-After`. Ảnh kết quả `spam-test.js`.
- Bảo mật khóa API: chỉ nằm trong env, không có trong repo hay frontend.
- Lưu và xuất lịch (đã có).

## 5. Quy trình dùng AI và lưu vết (cả nhóm, TV4 gom)

- 5.1 Công cụ AI đã dùng và dùng vào phần nào (trung thực: phần nào AI sinh, phần nào nhóm thiết kế, sửa).
- 5.2 Quy trình: đặc tả trước (UI spec, schema, contract) → prompt → review → test → PR.
- 5.3 Trích prompt log: 5–8 ca tiêu biểu, mỗi ca gồm prompt, kết quả, **lỗi AI gây ra**, cách nhóm phát hiện và sửa.
- 5.4 Link `docs/prompt-plan/`.

## 6. Kiểm thử và giới hạn (TV4 gom, mỗi người điền phần mình)

- Lệnh test: `npm test` cho cả frontend và backend (đều dùng `node --test`). Ghi số test, ví dụ "57 → N test".
- Test chức năng theo kịch bản: CVPR, Việt Nam, 180 ngày, matcher 3 câu, spam test.
- Lighthouse, trình duyệt và viewport.
- Giới hạn còn lại: dữ liệu phụ thuộc CCFDDL, crawler không đọc được một số trang, hạn dự kiến có thể lệch, free tier Gemini có quota.

## 7. Hướng phát triển

- Embedding thay BM25, thông báo email khi sắp đến hạn, mở rộng nguồn ngoài CCFDDL (WikiCFP), chuyển sang PostgreSQL.

## Phụ lục

- A. Bảng phân công Notion · B. Prompt log đầy đủ · C. Biên bản góp ý của thầy và bảng đối chiếu đã sửa gì.
