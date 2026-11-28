# T5 — Kế hoạch sửa sau góp ý của thầy

> File duy nhất để cả nhóm theo dõi: phạm vi, quyết định kỹ thuật, task từng người, lịch, demo.
> Lập ngày 26/11/2026. Số liệu lấy từ `site/data/conferences.snapshot.json` (2.346 kỳ, 385 chuỗi hội nghị).
> **Giả định bảo vệ khoảng 10/12/2026.** Nếu hạn khác, giữ thứ tự các đợt và dời ngày.

## Mục lục

1. [Tóm tắt](#1-tóm-tắt)
2. [Phạm vi (scope)](#2-phạm-vi-scope)
3. [Góp ý của thầy và nguyên nhân thật](#3-góp-ý-của-thầy-và-nguyên-nhân-thật)
4. [Quyết định kỹ thuật: vì sao chọn A mà không chọn B](#4-quyết-định-kỹ-thuật-vì-sao-chọn-a-mà-không-chọn-b)
5. [Kiến trúc, cơ sở dữ liệu, API](#5-kiến-trúc-cơ-sở-dữ-liệu-api)
6. [Danh sách task theo người](#6-danh-sách-task-theo-người)
7. [Lịch làm](#7-lịch-làm)
8. [Quy tắc "Xong" chung](#8-quy-tắc-xong-chung)
9. [Lưu vết dùng AI](#9-lưu-vết-dùng-ai)
10. [Kịch bản demo](#10-kịch-bản-demo)
11. [Rủi ro và phương án dự phòng](#11-rủi-ro-và-phương-án-dự-phòng)

---

## 1. Tóm tắt

Thầy chê 3 điểm: (1) tìm CVPR không ra, (2) sản phẩm không hơn gì trang gốc CCFDDL, (3) dùng AI mà không có lưu vết.

Hướng sửa:

1. **Sửa trải nghiệm tìm kiếm** để tìm hội nghị nào cũng thấy, và thêm lọc quốc gia, lọc thời gian dài hơn.
2. **Thêm backend Express và database SQLite**, cập nhật dữ liệu tự động hằng ngày, crawl thêm chủ đề từ trang Call for Papers.
3. **Thêm trang "Gợi ý hội nghị bằng AI"**: người dùng mô tả đề tài, hệ thống trả về 5 hội nghị phù hợp kèm lý do. Có chặn spam theo IP.
4. **Viết tài liệu lưu vết prompt** trung thực.

### Tiến độ (cập nhật 28/11/2026)

| Hạng mục | Trạng thái | Ở đâu |
|---|---|---|
| Sửa lỗi CVPR, dự báo kỳ sau, báo số kỳ ẩn | Xong | `site/js/pages/explore-state.js`, `edition-card.js` |
| Lọc châu lục / quốc gia / 180 ngày | Xong | `site/js/place-utils.js`, `conference-list.js` |
| Backend Express + SQLite, `GET /api/conferences` đọc và lọc bằng SQL | Xong | `backend/src/routes/conferences.js`, `db.js` |
| Gợi ý AI (`POST /api/match`), trang và widget | Xong | `backend/src/match.js`, `site/match.html` |
| Chặn spam theo IP, ngân sách AI, giới hạn input | Xong | `backend/src/middleware/rate-limit.js`, `ai-budget.js` |
| Ingest + crawl CFP + enrich, cron 03:00 hằng ngày | Xong, đã chạy thật | `backend/scripts/`, `.github/workflows/ingest.yml` |
| Đồng bộ Google Calendar (OAuth) | Xong từ đợt trước (PR #20) | `site/js/google-calendar-sync.js` |
| Lưu vết prompt | Xong phần TV4; TV1–TV3 bổ sung nhật ký phần mình | `docs/prompt-plan/` |
| Deploy backend lên Render | **Chưa**: cần tài khoản Render của nhóm | `render.yaml` |
| Đo lại Lighthouse sau khi thêm AI | **Chưa** | — |

---

## 2. Phạm vi (scope)

Chia theo mức ưu tiên. **Phải có** thì không được cắt. **Nên có** chỉ cắt khi trễ. **Có thì tốt** làm khi dư thời gian.

### 2.1 Trong phạm vi

| Mức | Hạng mục | Vì sao ở mức này |
|---|---|---|
| **Phải có** | Sửa lỗi tìm CVPR (báo kết quả bị ẩn, gộp theo chuỗi hội nghị) | Thầy test trực tiếp và thấy lỗi |
| **Phải có** | Lọc quốc gia / khu vực, có chip "Việt Nam" | Thầy nêu đích danh |
| **Phải có** | Lọc khoảng thời gian 180 ngày | Thầy nêu "2–3 tháng tới" |
| **Phải có** | Backend Express + SQLite, `GET /api/conferences` | Thầy yêu cầu có backend và database |
| **Phải có** | Cập nhật dữ liệu tự động hằng ngày (cron) | Thầy hỏi cập nhật bao lâu một lần |
| **Phải có** | Gợi ý hội nghị bằng AI (`POST /api/match`) và trang giao diện | Điểm nhấn chính, thầy gợi ý dùng Gemini |
| **Phải có** | Giới hạn tần suất theo IP, giới hạn độ dài input | Thầy yêu cầu khi mở AI cho người dùng |
| **Phải có** | Tài liệu lưu vết prompt (`docs/prompt-plan/`) | Thầy yêu cầu |
| **Nên có** | Dự báo hạn năm sau cho hội nghị đã đóng | Giải quyết tận gốc chuyện "tìm CVPR thấy đã đóng thì làm gì tiếp" |
| **Nên có** | Crawl trang CFP và AI tóm tắt thành chủ đề (`topics`) | Giúp AI gợi ý chính xác hơn, thầy gợi ý crawl sâu |
| **Nên có** | Cache kết quả AI 24 giờ | Tiết kiệm lượt gọi Gemini |
| **Nên có** | Đồng bộ hạn đã lưu sang lịch riêng trên Google Calendar (OAuth trên trình duyệt, không qua backend) | Thầy đã chấp nhận `.ics` và link Google Calendar; đồng bộ là phần làm thêm để có nhắc hẹn và cập nhật khi hạn đổi. Không phụ thuộc Render. Xem `docs/google-calendar-sync.md` |
| **Có thì tốt** | Lọc theo chủ đề hẹp trên Explore | Cần dữ liệu crawl xong mới làm được |
| **Có thì tốt** | Gợi ý tự động khi gõ chủ đề | Tiện, nhưng không ảnh hưởng điểm chính |

### 2.2 Ngoài phạm vi (không làm)

| Không làm | Lý do |
|---|---|
| Tài khoản riêng của web (đăng ký, mật khẩu) | Thầy xác nhận không cần: công cụ tra cứu mở, ai vào dùng cũng được. **Đăng nhập Google để đồng bộ lịch vẫn có** (mục 2.1), nhưng chỉ để cấp quyền Calendar, web không lưu tài khoản |
| Load balancing, nhiều server | Thầy xác nhận không cần: lượng truy cập thấp |
| Viết lại frontend bằng React/Vue | Thầy không chê frontend. Viết lại mất nhiều thời gian mà không thêm điểm |
| Lưu danh sách "Đã lưu" lên server | Không có tài khoản thì không biết lưu cho ai. Giữ `localStorage` |
| Thông báo email khi sắp hết hạn | Cần tài khoản và dịch vụ gửi mail, để vào "Hướng phát triển" |
| Nguồn dữ liệu ngoài CCFDDL (WikiCFP...) | Mỗi nguồn một định dạng, không kịp. Để vào "Hướng phát triển" |
| App di động | Web đã responsive |

---

## 3. Góp ý của thầy và nguyên nhân thật

| Góp ý | Kiểm tra trong code | Kết luận |
|---|---|---|
| Tìm CVPR không ra, đặt lại bộ lọc vẫn không ra | Search đã khớp cả tên viết tắt lẫn tên đầy đủ, không phân biệt hoa thường, bỏ dấu (`explore-state.js:220-224`). Nhưng mặc định `past = false` loại mọi kỳ đã hết hạn (`explore-state.js:241`). CVPR 2027 hết hạn 16/11/2026, nguồn chưa có CVPR 2028. Nút "Đặt lại" cũng về `past = false`. | **Lỗi thiết kế mặc định, không phải lỗi so khớp.** 274/385 chuỗi (71%) có kỳ mới nhất đã hết hạn, nên mặc định chỉ hiện 84/2.346 kỳ, và trang không báo là có kết quả bị ẩn. |
| Ít chức năng, "prompt cái là ra" | Chỉ lấy JSON của CCFDDL rồi lọc ở trình duyệt. Không có backend, database hay dữ liệu riêng. | Đúng. Cần thêm thứ trang gốc không có. |
| Thiếu lọc quốc gia | `place` là chuỗi tự do: "Hanoi, Vietnam", "Ho Chi Minh City", "Singapore EXPO". Có 11 kỳ ở Việt Nam (snapshot từng lẫn thêm 1 bản ghi kiểm thử giả, đã gỡ 28/11). | Cần chuẩn hóa thành `country` và `region`. |
| Thiếu lọc thời gian dài | Chỉ có 7/14/30/90 ngày, lại giấu trong nhóm "Hạn nộp". | Thêm 180 ngày và đưa ra ngoài. |
| Lĩnh vực quá rộng | `fields` chỉ có 10 mã lớn của CCF, cộng 3 giá trị lạc "Data", "Web", "Systems". | Cần `topics` từ trang CFP và dọn giá trị lạc. |
| Không lưu vết dùng AI | Chưa có tài liệu. | Thêm `docs/prompt-plan/`. |
| Mở AI thì phải chặn spam | Chưa có backend nên không có chỗ chặn. | Giới hạn tần suất theo IP ở backend. |

> **Khi bảo vệ:** bản phân tích ghi âm đoán search "chỉ tìm theo tên viết tắt" hoặc "phân biệt hoa thường". Cả hai **sai**, nhóm đã chạy thử để loại trừ. Hãy nói đúng nguyên nhân thật, điều đó cho thầy thấy nhóm hiểu code của mình.

---

## 4. Quyết định kỹ thuật: vì sao chọn A mà không chọn B

### Trước tiên: Express và Node.js không phải hai lựa chọn thay nhau

- **Node.js** là *môi trường chạy* JavaScript ngoài trình duyệt, giống như trình duyệt chạy JS ở phía người dùng.
- **Express** là *framework* viết trên Node.js để làm web server: định nghĩa route, middleware, trả JSON.

Chọn Express thì chắc chắn chạy trên Node.js, không có Express nào chạy thiếu Node. Câu hỏi đúng là "**trên Node.js, dùng framework nào?**", và câu trả lời là **Express** (lý do ở QĐ2). Trong báo cáo ghi: *"Backend viết bằng Express (chạy trên Node.js)"*.

### QĐ1. Ngôn ngữ backend: JavaScript

| | Lựa chọn | Đánh giá |
|---|---|---|
| ✅ **Chọn** | **JavaScript** | Cả nhóm đã viết JS cho frontend nên ai cũng đọc và review được backend. Dùng lại được code đã có, ví dụ hàm chuẩn hóa dữ liệu trong `data-adapter.js`. Test dùng chung `node --test`. |
| ❌ | Python (FastAPI, Flask) | Môn học không cho dùng. |
| ❌ | PHP | Phải học thêm ngôn ngữ mới, không dùng lại được code JS đã có. |
| ❌ | Java (Spring Boot), C# (ASP.NET) | Nặng, cấu hình nhiều, học lâu, không hợp thời gian 2 tuần. |

### QĐ2. Framework backend: Express

| | Lựa chọn | Đánh giá |
|---|---|---|
| ✅ **Chọn** | **Express** | Phổ biến nhất cho Node.js, tài liệu và ví dụ nhiều nhất, có sẵn middleware cần dùng (`express-rate-limit`, `cors`). Code ngắn, dễ giải thích từng dòng khi thầy hỏi. |
| ❌ | `node:http` thuần, không framework | Phải tự viết router, đọc body JSON, CORS, rate limit. Tốn thời gian và dễ sai bảo mật. |
| ❌ | Fastify | Nhanh hơn Express, nhưng tốc độ không phải vấn đề với lượng truy cập thấp. Ít tài liệu tiếng Việt hơn. |
| ❌ | NestJS | Kiến trúc nhiều lớp (module, decorator, TypeScript), quá nặng cho 3 endpoint. |
| ❌ | Hono | Hợp với Cloudflare Workers, nhưng nhóm không chọn Workers (QĐ5). |

### QĐ3. Database: SQLite (có sẵn trong Node)

| | Lựa chọn | Đánh giá |
|---|---|---|
| ✅ **Chọn** | **SQLite qua `node:sqlite`** | Có sẵn trong Node từ bản 22.13 (máy nhóm đang dùng Node 24.11, đã chạy thử được). Không cần cài hay dựng server DB. Vẫn viết SQL thật (`SELECT ... WHERE country = ?`), có bảng và khóa ngoại để vẽ ERD. Khoảng 2.400 kỳ hội nghị là rất nhỏ với SQLite. |
| ❌ | PostgreSQL (Supabase, Neon) | Mạnh hơn nhưng phải đăng ký dịch vụ ngoài, quản lý chuỗi kết nối và mật khẩu. Không cần cho lượng dữ liệu này. Ghi vào báo cáo là hướng nâng cấp. |
| ❌ | MongoDB | Dữ liệu có quan hệ rõ (chuỗi → kỳ → hạn nộp), hợp với SQL hơn. Lọc theo nhiều điều kiện bằng SQL cũng dễ giải thích hơn. |
| ❌ | Chỉ dùng file JSON, không có DB | Thầy yêu cầu có database. Lọc trên JSON phải tự viết vòng lặp, không chứng minh được kỹ năng CSDL. |
| ❌ | `better-sqlite3` | Tốt, nhưng cần biên dịch native, hay lỗi khi cài trên Windows. Chỉ dùng làm phương án dự phòng (mục 11). |

### QĐ4. Giữ dữ liệu bền: lưu JSON trong repo, server nạp vào SQLite khi khởi động

| | Lựa chọn | Đánh giá |
|---|---|---|
| ✅ **Chọn** | **JSON trong repo → nạp vào SQLite lúc khởi động** | Render bản miễn phí **xóa ổ đĩa mỗi lần deploy hoặc khởi động lại**, nên file `.db` sẽ mất. Lưu dữ liệu (kể cả phần AI đã tóm tắt) thành `backend/data/catalog.enriched.json` trong repo: không mất, xem được thay đổi qua git diff, không phải gọi lại AI. Khởi động đọc khoảng 2.400 bản ghi mất dưới 1 giây. |
| ❌ | Để file `.db` trên ổ đĩa Render | Mất dữ liệu sau mỗi lần deploy. |
| ❌ | Commit file `.db` vào repo | File nhị phân, mỗi ngày một bản mới làm repo phình to, không xem được diff. |
| ❌ | Ổ đĩa bền của Render | Phải trả phí. |
| ❌ | DB thuê ngoài (Turso, Supabase) | Thêm một dịch vụ cần quản lý. Chỉ cần khi phải ghi dữ liệu liên tục từ người dùng, mà dự án không có. |

Hệ quả: bảng `match_cache` nằm trong SQLite nên sẽ mất khi server khởi động lại. Chấp nhận được, vì cache chỉ để tiết kiệm lượt gọi AI.

### QĐ5. Nơi chạy backend: Render

| | Lựa chọn | Đánh giá |
|---|---|---|
| ✅ **Chọn** | **Render (Web Service, miễn phí)** | Chạy Express nguyên bản như trên máy, chỉ cần `npm start`. Tự deploy khi có commit lên GitHub. Một tiến trình duy nhất nên rate limit lưu trong bộ nhớ là đủ. |
| ❌ | Vercel | Chạy theo kiểu serverless: mỗi request có thể chạy trên một bản khác nhau, nên rate limit lưu trong bộ nhớ không đếm đúng và SQLite không ghi được. Phải thêm Redis bên ngoài. |
| ❌ | Cloudflare Workers + D1 | Không có khởi động chậm, nhưng không chạy được Express thật, phải viết lại theo kiểu Workers và khó chạy thử trên máy. Giữ làm phương án dự phòng. |
| ❌ | Railway, Fly.io | Không còn gói miễn phí lâu dài. |
| ❌ | VPS tự quản | Phải tự cài hệ điều hành, bảo mật, HTTPS. Quá sức với thời gian còn lại. |

Nhược điểm của Render miễn phí: server "ngủ" sau 15 phút không có ai dùng, lần gọi đầu mất 30–60 giây. Cách xử lý ở mục 11.

### QĐ6. Cập nhật dữ liệu tự động: GitHub Actions chạy theo lịch

| | Lựa chọn | Đánh giá |
|---|---|---|
| ✅ **Chọn** | **GitHub Actions `schedule` (cron), 03:00 giờ Việt Nam hằng ngày** | Nhóm đã dùng GitHub Actions cho CI. Miễn phí với repo public. Có log từng lần chạy để chụp đưa vào báo cáo. Lỗi thì job dừng, không commit, dữ liệu cũ giữ nguyên. |
| ❌ | `node-cron` chạy trong server | Server Render miễn phí ngủ khi không có người dùng, nên cron trong server sẽ không chạy. |
| ❌ | Render Cron Job | Phải trả phí. |
| ❌ | Cập nhật bằng tay | Thầy hỏi cơ chế tự động. |

### QĐ7. Mô hình AI: Gemini API (gói miễn phí)

| | Lựa chọn | Đánh giá |
|---|---|---|
| ✅ **Chọn** | **Gemini API, model dòng Flash** | Có gói miễn phí, thầy cũng gợi ý. Hỗ trợ trả về JSON theo schema nên backend kiểm tra kết quả dễ. Gọi bằng `fetch`, không cần thư viện. Tên model để trong biến môi trường `GEMINI_MODEL` để đổi được mà không sửa code. |
| ❌ | OpenAI, Claude API | Không có gói miễn phí lâu dài cho API. |
| ❌ | Chạy model trên máy (Ollama) | Server miễn phí không đủ RAM và GPU. |

### QĐ8. Cách AI chọn hội nghị: AI dịch câu hỏi thành bộ lọc → backend lọc → AI xếp hạng

Ý tưởng chính: **AI không tự tìm hội nghị. AI chỉ đọc câu người dùng viết rồi điền vào bộ lọc có sẵn.** Việc lọc do backend làm bằng SQL nên kết quả chính xác và kiểm tra được.

Luồng 5 bước:

| Bước | Ai làm | Làm gì | Ví dụ với câu "Tôi làm bảo mật cho AI agent, muốn nộp ở châu Á trong 3 tháng tới, CCF B trở lên" |
|---|---|---|---|
| 1. Phân tích | Gemini (lần gọi 1) | Đọc câu, trả JSON bộ lọc theo schema cố định | `{ region: "asia", ccfMin: "B", withinDays: 90, fields: ["SC","AI"], keywords: ["AI agent security","prompt injection","LLM security","adversarial machine learning"] }` |
| 2. Kiểm tra | Backend | Chỉ giữ giá trị nằm trong danh sách cho phép (region, rank, số ngày, mã lĩnh vực). Giá trị lạ bị bỏ, từ khóa cắt tối đa 10 | AI ghi `region: "đông á"` thì bị bỏ, không làm hỏng truy vấn |
| 3. Lọc | Backend (SQL) | Lọc cứng theo region, rank, thời gian, lĩnh vực. Đây là cùng bộ lọc với trang Explore | Còn khoảng 15–40 kỳ |
| 4. Chấm điểm | Backend (BM25) | Chấm điểm các kỳ còn lại theo `keywords` của AI trên `name + summary + topics`, lấy 20 kỳ cao nhất. Nếu bước 3 ra 0 kỳ thì **nới dần**: bỏ giới hạn thời gian → bỏ khu vực → hạ rank, và báo cho người dùng đã nới gì | Top 20 |
| 5. Xếp hạng và giải thích | Gemini (lần gọi 2) | Chọn 5 kỳ trong 20, mỗi kỳ ghi lý do. Backend bỏ mọi ID không có trong 20 kỳ | 5 kết quả kèm lý do |

Vì sao cách này tốt hơn "BM25 trên nguyên câu người dùng":

- **BM25 chỉ so từ giống nhau.** Người dùng viết tiếng Việt ("bảo mật"), dữ liệu là tiếng Anh ("security"), nên BM25 chấm 0 điểm. Người dùng viết "prompt injection" còn CFP ghi "LLM security" thì BM25 cũng không nối được. Ở bước 1, AI dịch sang tiếng Anh và thêm từ đồng nghĩa, nên BM25 ở bước 4 chạy đúng hơn nhiều.
- **Điều kiện cứng không bị AI làm sai.** "Ở châu Á, CCF B trở lên, 3 tháng tới" là điều kiện có/không. Để SQL lọc thì chắc chắn đúng. Nếu để AI tự chọn trong danh sách, AI có thể đưa hội nghị ở châu Âu vào.
- **Người dùng thấy và sửa được.** Giao diện hiện "AI hiểu là: Châu Á · CCF ≥ B · 90 ngày · prompt injection, LLM security…". Nếu AI hiểu sai, người dùng sửa chip rồi chạy lại. Lần chạy lại gửi thẳng bộ lọc, bỏ qua bước 1, nên đỡ một lượt gọi AI.
- **Mở được trong Explore.** Bộ lọc của bước 1 đổi được thành URL Explore (`conferences.html?region=asia&ccf=A&ccf=B&window=90`), người dùng bấm "Xem tất cả trong Explore" để tự lọc tiếp.
- **Dễ giải thích khi bảo vệ.** Mỗi bước có đầu vào và đầu ra rõ ràng, test riêng được, và không có bước nào AI bịa ra hội nghị.

| | Lựa chọn | Đánh giá |
|---|---|---|
| ✅ **Chọn** | **AI phân tích ra bộ lọc → backend kiểm tra và lọc SQL → BM25 theo từ khóa AI → AI chọn 5 kèm lý do** | Như phân tích ở trên. Mỗi yêu cầu tốn đúng 2 lượt gọi Gemini, biết trước để đặt giới hạn tần suất. |
| ❌ | BM25 trên nguyên câu người dùng → Gemini chọn 5 (phương án cũ) | Hỏng khi người dùng viết tiếng Việt hoặc dùng từ khác dữ liệu. Điều kiện "châu Á, 3 tháng" bị coi như từ khóa thường, không lọc cứng. |
| ❌ | Agent tự gọi tool nhiều vòng (function calling lặp) | Model tự quyết gọi tool bao nhiêu lần, nên số lượt gọi Gemini không biết trước, khó giới hạn quota, chậm và khó test. Một lần trả JSON theo schema cho kết quả tương tự mà đơn giản hơn. |
| ❌ | Đưa cả 2.346 kỳ cho Gemini | Quá dài, chậm, tốn quota, dễ bịa và kết quả không ổn định. |
| ❌ | Embedding và vector database | Hiểu nghĩa tốt hơn BM25, nhưng phải gọi API embedding cho mọi hội nghị và thêm nơi lưu vector. Khi AI đã mở rộng từ khóa ở bước 1 thì phần lớn lợi ích này đã có. Để vào "Hướng phát triển". |
| ❌ | Chỉ để AI phân tích bộ lọc, không có bước 5 | Vẫn dùng được, và đây là **chế độ dự phòng** khi Gemini lỗi ở bước 5. Nhưng không có lý do vì sao hội nghị phù hợp, mất điểm nhấn. |

### QĐ9. Chặn spam: `express-rate-limit` lưu trong bộ nhớ

| | Lựa chọn | Đánh giá |
|---|---|---|
| ✅ **Chọn** | **`express-rate-limit` với bộ nhớ trong server** | Chỉ có 1 server nên đếm trong bộ nhớ là chính xác. Cài một dòng, cấu hình rõ ràng. Tự trả mã 429 và header `Retry-After`. |
| ❌ | Redis | Chỉ cần khi có nhiều server chia sẻ bộ đếm, mà dự án chỉ có 1 server. |
| ❌ | Tự viết bộ đếm | Dễ sai ở các trường hợp biên. Thư viện đã được kiểm chứng. |
| ❌ | Chặn ở Cloudflare hoặc nginx | Cần thêm tầng hạ tầng, khó demo trong code. |

**Bắt buộc cấu hình** `app.set('trust proxy', 1)`. Render chuyển request qua proxy, nếu thiếu dòng này thì mọi người dùng đều mang chung IP của proxy, và một người spam sẽ chặn cả trang.

### QĐ10. Crawl trang CFP: `fetch` + tách HTML bằng regex (không thêm thư viện)

| | Lựa chọn | Đánh giá |
|---|---|---|
| ✅ **Chọn (khi làm thật)** | **`fetch` (có sẵn) + hàm tách link/chữ tự viết** | Chỉ cần 2 việc: lấy các thẻ `<a>` và lấy chữ của trang. Viết vài hàm nhỏ có test riêng (`backend/tests/cfp-crawler.test.js`), không thêm phụ thuộc. Chạy thật 28/11/2026 trên 385 hội nghị. |
| ❌ (kế hoạch ban đầu) | `fetch` + `cheerio` | Đọc HTML chuẩn hơn, nhưng thêm một thư viện chỉ để làm 2 việc trên. Nếu sau này cần đọc cấu trúc phức tạp (bảng, nhiều tầng) thì chuyển sang cheerio. |
| ❌ | Puppeteer, Playwright | Phải tải cả trình duyệt (vài trăm MB), chậm. Chỉ cần với trang render bằng JS, mà các trang đó có thể bỏ qua. |
| ❌ | Không crawl, chỉ dùng tên hội nghị | AI chỉ biết tên nên gợi ý kém chính xác. Đây là phương án dự phòng nếu trễ. |

### QĐ11. Cách sửa lỗi CVPR

| | Lựa chọn | Đánh giá |
|---|---|---|
| ✅ **Chọn** | **Gộp theo chuỗi hội nghị và báo số kết quả bị ẩn** | Mỗi hội nghị hiện một thẻ cho kỳ mới nhất. Nếu đã hết hạn thì ghi "Đã đóng · dự kiến năm sau ~11/2027". Khi kết quả bị ẩn thì báo "Có N kết quả đã hết hạn" kèm nút xem. Người dùng luôn biết hội nghị có tồn tại. |
| ❌ | Mặc định hiện cả kỳ đã qua | Danh sách ngập hơn 2.100 kỳ cũ, người dùng phải lướt rất xa mới thấy hạn còn mở. |
| ❌ | Có từ khóa thì tự bật "hạn đã qua" | Checkbox tự đổi trạng thái làm người dùng khó hiểu. Vẫn bị lặp 7 thẻ CVPR. |

### QĐ12. Cách dự báo hạn năm sau

| | Lựa chọn | Đánh giá |
|---|---|---|
| ✅ **Chọn** | **Lấy hạn của kỳ gần nhất cộng 1 năm, gắn nhãn "dự kiến"** | Đơn giản, dễ giải thích. Phần lớn hội nghị lớn giữ hạn gần như cùng tháng mỗi năm (CVPR luôn khoảng đầu tháng 11). Nhãn "dự kiến" khác màu để không nhầm với hạn chính thức. |
| ❌ | Trung bình nhiều năm | Phức tạp hơn mà không chính xác hơn bao nhiêu. Hội nghị đổi lịch thì trung bình cũng sai. |
| ❌ | Không dự báo | Người dùng tìm CVPR chỉ thấy "đã đóng" mà không biết khi nào nộp được. |

### QĐ13. Frontend: giữ HTML, CSS, JS thuần

| | Lựa chọn | Đánh giá |
|---|---|---|
| ✅ **Chọn** | **Giữ nguyên, chỉ thêm trang `match.html` và đổi `API_ENDPOINT`** | Frontend đã ổn định, có 57 test, Lighthouse tốt. Thầy không chê phần này. Nếu backend lỗi thì vẫn chạy bằng snapshot. |
| ❌ | Chuyển sang React, Vue | Phải viết lại toàn bộ, rủi ro cao trong 2 tuần, không thêm điểm theo góp ý. |

---

## 5. Kiến trúc, cơ sở dữ liệu, API

### 5.1 Sơ đồ

```
┌──────────────────────── GitHub Actions (03:00 hằng ngày) ────────────────────────┐
│ ingest.js: tải CCFDDL → chuẩn hóa (quốc gia, lĩnh vực, giờ)                       │
│ crawl-cfp.js: đọc trang CFP của các chuỗi mới hoặc chưa crawl                     │
│ enrich.js: Gemini tóm tắt CFP → {summary, topics[]}                               │
│ → commit backend/data/catalog.enriched.json  (lỗi bước nào thì dừng, không commit) │
└───────────────────────────────────────┬───────────────────────────────────────────┘
                                        │ Render tự deploy khi có commit
                                        ▼
┌──────────────────────── Express trên Render ─────────────────────────────────────┐
│ Khởi động: đọc JSON → nạp vào SQLite (node:sqlite)                                │
│ Middleware: cors (chỉ domain GitHub Pages) → trust proxy → rate limit → JSON      │
│ GET  /api/health        GET /api/conferences        POST /api/match               │
│ POST /api/match: cache? → Gemini phân tích ra bộ lọc → kiểm tra → SQL lọc         │
│                  → BM25 theo từ khóa AI (top 20, nới lọc nếu rỗng) → Gemini chọn 5 │
└───────────────────────────────────────┬───────────────────────────────────────────┘
                                        │ fetch
┌───────────────────────────────────────┴──────────────────────────────────────────┐
│ Frontend GitHub Pages (HTML/CSS/JS thuần). API lỗi thì dùng snapshot như hiện tại  │
└───────────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Cấu trúc thư mục mới

Khung đã dựng sẵn và chạy được, xem [backend/README.md](../backend/README.md) để cài, chạy và biết hàm nào của ai.

```
backend/
  package.json            # express, express-rate-limit, cors, helmet, compression; engines node >=22.13
  .env.example            # mẫu biến môi trường, chép thành .env
  src/
    server.js             # điểm chạy: nạp catalog → dựng SQLite → mở cổng
    app.js                # ghép middleware chung (helmet, compression, CORS, JSON) → router → 404 → lỗi
    routes/               # health.js, conferences.js, match.js (mỗi file một express.Router)
    middleware/           # rate-limit.js, error-handler.js
    config.js             # biến môi trường và hạn mức
    catalog.js            # nạp JSON, dùng chung normalizeCatalog với frontend
    db.js                 # schema 5 bảng, nạp dữ liệu, truy vấn (TV1)
    errors.js             # lỗi có mã HTTP
    filters.js            # kiểm tra, nới bộ lọc, đổi sang URL Explore (TV3)
    retrieval.js          # BM25 (TV3)
    gemini.js             # gọi Gemini (TV4)
    match.js              # luồng gợi ý 5 bước (TV4)
    normalize.js          # địa điểm → quốc gia, khu vực (TV1)
  data/
    catalog.enriched.json # do cron tạo; chưa có thì server dùng site/data/conferences.snapshot.json
    country-map.json      # bảng tra thành phố → quốc gia → khu vực
  scripts/                # ingest.js, crawl-cfp.js, enrich.js (TV1)
  tools/                  # spam-test.js (TV4)
  tests/                  # node --test
.github/workflows/
  test.yml                # thêm job test backend
  ingest.yml              # cron hằng ngày (TV4)
render.yaml               # deploy Render (TV4)
```

Biến môi trường trên Render (không commit): `GEMINI_API_KEY`, `GEMINI_MODEL`, `ALLOWED_ORIGIN`.

### 5.3 Bảng trong SQLite

| Bảng | Cột | Ghi chú |
|---|---|---|
| `series` | `key` PK, `acronym`, `name`, `field`, `ccf`, `core`, `summary`, `topics_json`, `cfp_url`, `cfp_crawled_at` | Một dòng cho mỗi hội nghị (CVPR) |
| `editions` | `id` PK, `series_key` FK, `year`, `place`, `country`, `region`, `format`, `website_url` | Một dòng cho mỗi kỳ (CVPR 2027) |
| `deadlines` | `id` PK, `edition_id` FK, `round_label`, `kind`, `instant_utc`, `source_text`, `timezone`, `quality` | Nhiều hạn mỗi kỳ |
| `match_cache` | `query_hash` PK, `result_json`, `created_at` | Cache kết quả AI 24 giờ |
| `ingest_log` | `id` PK, `run_at`, `source`, `editions_total`, `errors` | Lịch sử cập nhật, hiện ở About |

### 5.4 API

**`GET /api/health`** → `200 { "ok": true, "editions": 2346, "dataUpdatedAt": "..." }`

**`GET /api/conferences`** → `200` đúng shape `{ meta, editions[] }` trong `contracts.md`, mỗi edition có thêm `country`, `region`, `topics`. Frontend chỉ cần đổi `API_ENDPOINT` trong `config.js`.

**`POST /api/match`**

Request lần đầu, chỉ gửi câu mô tả:

```json
{
  "description": "Tôi làm bảo mật cho AI agent, phát hiện prompt injection, muốn nộp ở châu Á trong 3 tháng tới, CCF B trở lên"
}
```

Request khi người dùng sửa chip bộ lọc rồi chạy lại. Có `filters` thì backend **bỏ qua bước phân tích**, đỡ một lượt gọi Gemini:

```json
{
  "description": "…như trên…",
  "filters": { "region": "asia", "ccfMin": "A", "withinDays": 90, "fields": ["SC"], "keywords": ["prompt injection", "LLM security"] }
}
```

Schema bộ lọc (AI phải trả đúng, backend kiểm tra lại):

| Trường | Giá trị cho phép | Không hợp lệ thì |
|---|---|---|
| `region` | `vietnam`, `sea`, `asia`, `europe`, `america`, `oceania`, `africa`, `null` | Bỏ (không lọc khu vực) |
| `countries` | Mã ISO 2 ký tự có trong `country-map.json`, tối đa 5 | Bỏ mã lạ |
| `ccfMin` / `coreMin` | `A`, `B`, `C` / `A*`, `A`, `B`, `C`, `null` | Bỏ |
| `withinDays` | `30`, `90`, `180`, `null` | Làm tròn lên mốc gần nhất |
| `kind` | `any`, `abstract`, `paper` | `any` |
| `fields` | 10 mã CCF (`AI`, `SE`, `DB`…) | Bỏ mã lạ |
| `keywords` | Chuỗi tiếng Anh, 1–10 mục, mỗi mục tối đa 60 ký tự | Cắt bớt. Rỗng thì dùng tên lĩnh vực |

Response `200` (số liệu minh họa):

```json
{
  "parsedFilters": { "region": "asia", "ccfMin": "B", "withinDays": 90, "fields": ["SC", "AI"], "keywords": ["AI agent security", "prompt injection", "LLM security"] },
  "relaxed": [],
  "exploreUrl": "conferences.html?region=asia&ccf=A&ccf=B&window=90",
  "results": [
    {
      "editionId": "ccs27",
      "acronym": "CCS",
      "score": 92,
      "reason": "Có track về bảo mật hệ thống học máy, chủ đề prompt injection nằm trong danh sách topic",
      "matchedTopics": ["machine learning security", "LLM security"],
      "deadline": { "instant": "...", "predicted": false }
    }
  ],
  "cached": false
}
```

Lỗi:

| Mã | Khi nào | Body |
|---|---|---|
| 400 | `description` rỗng, dưới 20 ký tự hoặc trên 1.500 ký tự, tham số sai | `{ "error": "INVALID_INPUT", "message": "..." }` |
| 429 | Vượt giới hạn tần suất. Có header `Retry-After` | `{ "error": "RATE_LIMITED", "retryAfter": 42 }` |
| 503 | Gemini lỗi hoặc quá 15 giây **ở bước 1** (chưa có bộ lọc) | `{ "error": "AI_UNAVAILABLE" }`. Frontend mời người dùng chọn bộ lọc bằng tay rồi gửi lại kèm `filters` |

Gemini lỗi **ở bước 5** thì không trả lỗi: vẫn trả `200` với 20 kết quả BM25, kèm `"rerankFailed": true` để giao diện ghi "Xếp theo từ khóa, AI tạm thời không giải thích được".

Trường `relaxed` liệt kê bộ lọc đã nới khi kết quả rỗng, ví dụ `["withinDays", "region"]`. Giao diện hiện "Không có hội nghị ở châu Á trong 90 ngày tới, đã mở rộng ra mọi khu vực".

### 5.5 Hạn mức chống spam

| Endpoint | Giới hạn mỗi IP | Lý do |
|---|---|---|
| `GET /api/conferences` | 60 lần/phút | Trang chỉ gọi 1 lần mỗi lượt tải, 60 là quá đủ cho người thật |
| `POST /api/match` | 5 lần/phút và 20 lần/ngày | Mỗi lần tốn tối đa 2 lượt gọi Gemini (1 lượt nếu gửi kèm `filters`). 20 lần/ngày đủ cho một người dùng thật |
| Cả hệ thống | Body tối đa 10 KB, mô tả tối đa 1.500 ký tự, gọi Gemini tối đa 15 giây | Chặn payload lớn và request treo |

---

## 6. Danh sách task theo người

Mỗi người giữ module cũ theo `ownership.md` và nhận phần mới gần module của mình nhất.
Cột **Mức** theo mục 2. Cột **Cần trước** là task phải xong trước thì mới làm được.

### TV1 — Dữ liệu, chuẩn hóa, crawler

| ID | Việc | Mức | Đợt | Cần trước | File | Xong khi |
|---|---|---|---|---|---|---|
| TV1-01 | Chuẩn hóa `place` thành `country` (mã ISO, ví dụ VN) và `region` (`vietnam`, `sea`, `asia`, `europe`, `america`, `oceania`, `africa`). Bảng tra gồm cả thành phố (Hanoi, Ho Chi Minh City, Danang, Phu Quoc → VN; "Singapore EXPO" → SG). Không đoán được thì ghi `null`, không đoán bừa | Phải có | 1 | — | `backend/data/country-map.json`, `backend/src/normalize.js`, `site/js/data-adapter.js` | Trên 95% kỳ có `country`. Có test cho các ca khó: "Ho Chi Minh City" (không ghi tên nước), "Virtual", "Online" |
| TV1-02 | Dọn `fields`: "Data", "Web", "Systems" gộp về mã CCF tương ứng | Phải có | 1 | — | `site/js/data-adapter.js` | Bộ lọc lĩnh vực chỉ còn 10 mã CCF |
| TV1-03 | `predictNextDeadline(series)`: kỳ mới nhất đã đóng thì lấy hạn đó cộng 1 năm, trả `{ instant, predicted: true }` | Nên có | 1 | — | `site/js/deadline-utils.js` | CVPR trả về khoảng 10/11/2027. Có test cho năm nhuận (29/02) |
| TV1-04 | `backend/scripts/ingest.js`: tải CCFDDL (timeout 20 giây) → chuẩn hóa → gộp với phần đã làm giàu từ lần trước → ghi `catalog.enriched.json`. Lỗi mạng hoặc sai format thì thoát với mã lỗi và không ghi file | Phải có | 2 | TV1-01 | `backend/scripts/ingest.js` | Chạy `npm run ingest` ra file JSON. Tắt mạng chạy lại thì file cũ không đổi |
| TV1-05 | `backend/src/db.js`: tạo 5 bảng, nạp JSON vào SQLite khi khởi động, viết hàm `queryEditions(filters)` bằng SQL có tham số (`?`, không nối chuỗi) | Phải có | 2 | TV1-04 | `backend/src/db.js` | Test: lọc `country = 'VN'` ra 12 kỳ |
| TV1-06 | `GET /api/conferences` trả đúng shape `contracts.md` | Phải có | 2 | TV1-05, TV4-01 | `backend/src/server.js`, `site/js/config.js` | Frontend chạy với backend. Tắt backend thì tự dùng snapshot |
| TV1-07 | `backend/scripts/crawl-cfp.js`: từ `website_url` tìm link chứa "call for papers", "cfp", "topics". Năm mới chưa có web thì lấy năm trước. 1 request/giây, đọc `robots.txt`, timeout 10 giây, User-Agent chung (không ghi tên hay email cá nhân). Chỉ crawl chuỗi chưa crawl hoặc crawl đã quá 30 ngày | Nên có | 2 | TV1-04 | `backend/scripts/crawl-cfp.js` | Crawl được ít nhất 100 chuỗi CCF A/B. Có danh sách chuỗi lỗi kèm lý do |
| TV1-08 | `backend/scripts/enrich.js`: gửi văn bản CFP (cắt tối đa 6.000 ký tự) cho Gemini, nhận `{ summary, topics[] }` theo schema. Kiểm tra kết quả: `topics` từ 3 đến 15 mục, `summary` dưới 400 ký tự. Sai thì bỏ, không ghi | Nên có | 3 | TV1-07, TV4-05 | `backend/scripts/enrich.js` | Các chuỗi đã crawl có `topics`. Chạy lại không gọi Gemini cho chuỗi đã có |
| TV1-09 | Viết `docs/prompt-plan/02-architecture-db.md` (sơ đồ, ERD, API, lịch cron) và mục 3, 4.1 báo cáo | Phải có | 4 | — | `docs/` | TV4 duyệt |

### TV2 — Giao diện: trang Gợi ý, Home, About, slide

| ID | Việc | Mức | Đợt | Cần trước | File | Xong khi |
|---|---|---|---|---|---|---|
| TV2-01 | Nhãn **Dự kiến** (khác màu và có chữ, không chỉ dựa vào màu) và chip quốc gia trên thẻ hội nghị | Phải có | 1 | — | `css/components.css`, `components.html`, `ui/edition-card.js` | Có trong trang components, đủ độ tương phản AA |
| TV2-02 | Trang chủ: ô "Mô tả nghiên cứu của bạn" dẫn sang `match.html?q=...`, chip nhanh "Hội nghị tại Việt Nam" (`conferences.html?region=vietnam`) và "Còn hạn trong 3 tháng" (`?window=90`) | Phải có | 2 | TV3-04 | `index.html`, `pages/home.js` | Bấm chip mở Explore đã lọc sẵn |
| TV2-03 | About: mục "Dữ liệu đến từ đâu" (sơ đồ CCFDDL → cron → crawl → AI), lần cập nhật gần nhất (lấy từ `/api/health`), mục "Giới hạn sử dụng AI" | Nên có | 2 | TV4-01 | `about.html`, `pages/about.js` | Hiện đúng ngày cập nhật |
| TV2-04 | Trang `match.html`: ô mô tả có đếm ký tự (20–1.500), 3 câu ví dụ bấm là điền. Nút gửi khóa lại khi đang chờ để tránh bấm nhiều lần | Phải có | 3 | — (dùng dữ liệu giả trước) | `match.html`, `css/pages/match.css`, `js/pages/match.js` | Đủ 5 trạng thái: trống, đang tải (có thể lâu khi server đang khởi động), kết quả, lỗi 503, **429 có đếm ngược** |
| TV2-05 | Khối **"AI hiểu là"**: hiện `parsedFilters` thành chip (khu vực, rank, số ngày, lĩnh vực, từ khóa). Người dùng xóa hoặc đổi chip rồi bấm "Chạy lại", gửi kèm `filters`. Hiện thông báo khi có `relaxed`. Nút "Xem tất cả trong Explore" mở `exploreUrl` | Phải có | 3 | TV4-04 | `js/pages/match.js` | Sửa chip rồi chạy lại thì backend không gọi bước phân tích (kiểm tra qua log) |
| TV2-09 | Thẻ kết quả AI: điểm phù hợp, lý do, topic khớp, hạn (thật hoặc dự kiến), nút Lưu và Thêm lịch dùng lại của TV4. Khi `rerankFailed` thì ghi "Xếp theo từ khóa, AI tạm thời không giải thích được" | Phải có | 3 | TV4-04 | `ui/edition-card.js` hoặc `ui/match-card.js` | Lưu và xuất lịch hoạt động từ trang gợi ý |
| TV2-06 | Thêm `match.html` vào menu chung | Phải có | 3 | TV2-04 | `common.js` | Có trên cả 6 trang, focus bàn phím đúng |
| TV2-07 | `docs/prompt-plan/01-ui-spec.md`: token màu, chữ, khoảng cách, layout 6 trang, component, ảnh trang tham khảo | Phải có | 4 | — | `docs/prompt-plan/` | Có ảnh minh họa |
| TV2-08 | Dựng slide theo `docs/slide-outline.md`, viết mục 1 và 4.2 báo cáo | Phải có | 4 | Ảnh chụp từ mọi người | — | Có bản nháp trước tổng duyệt 1 ngày |

### TV3 — Tìm kiếm, lọc, BM25

| ID | Việc | Mức | Đợt | Cần trước | File | Xong khi |
|---|---|---|---|---|---|---|
| TV3-01 | **Sửa lỗi CVPR, phần 1**: hàm `countHiddenPast(editions, state)`. Khi có kết quả bị ẩn vì đã hết hạn thì hiện "Có N kết quả đã hết hạn nộp" kèm nút **Xem cả hạn đã qua** (bật `past=1`) | Phải có | 1 | — | `explore-state.js`, `pages/conference-list.js` | Gõ `cvpr` ra thông báo "7 kết quả", bấm nút thấy CVPR 2021–2027 |
| TV3-02 | **Sửa lỗi CVPR, phần 2**: gộp theo `seriesKey`, mỗi hội nghị một thẻ cho kỳ mới nhất. Khi có từ khóa thì hiện cả hội nghị có kỳ mới nhất đã đóng, kèm hạn dự kiến (TV1-03). Thêm dòng "Các năm trước" ở trang chi tiết | Phải có | 1 | TV1-03 | `explore-state.js`, `pages/conference-list.js`, `pages/conference-detail.js` (báo TV1) | Tìm `cvpr` mặc định ra 1 thẻ "CVPR 2027 · Đã đóng · dự kiến ~11/2027" |
| TV3-03 | Search thêm trên `place`, `country`, `fields`, `topics` | Phải có | 1 | TV1-01 | `explore-state.js` | Gõ "vietnam" ra kỳ ở Việt Nam, gõ "computer vision" ra CVPR, ICCV, ECCV |
| TV3-04 | Bộ lọc **Quốc gia / Khu vực**: chip nhanh "Việt Nam", "Đông Nam Á", "Châu Á", kèm danh sách quốc gia. URL `region=vietnam&country=SG` | Phải có | 1 | TV1-01 | `explore-state.js`, `pages/conference-list.js` | Chọn Việt Nam ra các kỳ còn hạn, bật hạn đã qua thì ra đủ 11 kỳ |
| TV3-05 | Thêm khoảng 180 ngày. Đưa "Khoảng thời gian" ra hàng lọc chính, cạnh "Sắp xếp" | Phải có | 1 | — | `explore-state.js:15`, `pages/conference-list.js` | URL `window=180` hoạt động, có chip đang lọc |
| TV3-06 | Thêm test cho TV3-01 đến TV3-05 | Phải có | 1 | — | `tests/explore-state.test.js` | `npm test` PASS |
| TV3-07 | `backend/src/retrieval.js`: BM25 chấm điểm **danh sách từ khóa AI trả về** (không phải nguyên câu người dùng) trên `acronym + name + summary + topics` (k1 = 1,2; b = 0,75), bỏ từ dừng tiếng Anh, giữ cụm từ 2 chữ ("prompt injection"). Chỉ chấm trong các kỳ đã qua lọc SQL. Trả 20 kỳ cao nhất | Phải có | 3 | TV1-05 | `backend/src/retrieval.js` | Test: `["object detection"]` ra CVPR/ICCV, `["software testing"]` ra ICSE/ISSTA, `["query optimization"]` ra SIGMOD/VLDB |
| TV3-10 | `backend/src/filters.js`: (a) `validateFilters(raw)` theo bảng schema ở mục 5.4, bỏ giá trị lạ; (b) `relaxFilters(filters)` nới lần lượt `withinDays` → `region`/`countries` → `ccfMin`/`coreMin`, trả kèm danh sách đã nới; (c) `toExploreUrl(filters)` đổi sang URL của trang Explore. Dùng chung tên tham số với `explore-state.js` | Phải có | 3 | TV3-04, TV3-05 | `backend/src/filters.js` | Test: `region: "đông á"` bị bỏ; lọc rỗng thì nới đúng thứ tự; URL mở ra Explore đúng bộ lọc |
| TV3-08 | Lọc chủ đề trên Explore, gõ để gợi ý topic | Có thì tốt | 3 | TV1-08 | `pages/conference-list.js` | Lọc "federated learning" ra danh sách |
| TV3-09 | Viết mục 4.3 báo cáo (gồm phân tích lỗi CVPR) và slide 8, 9 | Phải có | 4 | — | `docs/` | TV1 duyệt |

### TV4 — Backend Express, AI matcher, chặn spam, tích hợp

| ID | Việc | Mức | Đợt | Cần trước | File | Xong khi |
|---|---|---|---|---|---|---|
| TV4-01 | Khung Express: `cors` chỉ cho `ALLOWED_ORIGIN`, `app.set('trust proxy', 1)`, `express.json({ limit: '10kb' })`, xử lý lỗi chung (không lộ stack trace), `GET /api/health`. Deploy Render bằng `render.yaml` | Phải có | 2 | — | `backend/src/server.js`, `backend/package.json`, `render.yaml` | `/api/health` chạy trên URL public. Gọi từ domain lạ bị CORS chặn |
| TV4-02 | Rate limit bằng `express-rate-limit` theo bảng 5.5. Bật `standardHeaders` để có `Retry-After`, body lỗi theo mục 5.4 | Phải có | 2 | TV4-01 | `backend/src/server.js` | Có test: lần thứ 6 trong 1 phút trả 429 |
| TV4-03 | GitHub Actions `ingest.yml`: `schedule` lúc 20:00 UTC (03:00 giờ Việt Nam) và chạy tay được (`workflow_dispatch`). Chạy ingest → crawl → enrich. Chỉ commit khi file đổi. Khóa Gemini lấy từ GitHub Secrets | Phải có | 2 | TV1-04 | `.github/workflows/ingest.yml` | Có ít nhất 3 lần chạy thành công để chụp đưa vào báo cáo |
| TV4-10 | Prompt **phân tích câu hỏi** (bước 1): Gemini trả JSON đúng schema bộ lọc ở mục 5.4. Prompt yêu cầu dịch từ khóa sang tiếng Anh, thêm 2–4 từ đồng nghĩa, không đoán khi người dùng không nêu (để `null`). Viết 10 câu thử (tiếng Việt, tiếng Anh, câu thiếu tiêu chí, câu cố tình lạc đề như "viết cho tôi bài thơ") | Phải có | 3 | TV4-05 | `backend/src/match.js`, `docs/prompt-plan/04-matcher-prompt.md` | Cả 10 câu ra JSON hợp lệ. Câu lạc đề trả bộ lọc rỗng, không chạy bước 5 |
| TV4-04 | `POST /api/match` ghép 5 bước của QĐ8: kiểm tra input (400) → tra cache → bước 1 (bỏ qua nếu có `filters`) → TV3 `validateFilters` → SQL lọc → rỗng thì `relaxFilters` → TV3 BM25 lấy 20 → bước 5 Gemini chọn 5, **bỏ mọi ID không có trong 20 kỳ** → lưu cache. Bước 1 lỗi thì 503; bước 5 lỗi thì trả 20 kết quả BM25 kèm `rerankFailed` | Phải có | 3 | TV3-07, TV3-10, TV4-10 | `backend/src/match.js` | 3 câu demo ra kết quả hợp lý. Test giả lập Gemini: trả ID lạ thì bị loại, trả region lạ thì bị bỏ, bước 5 lỗi vẫn có kết quả |
| TV4-05 | `backend/src/gemini.js`: gọi bằng `fetch`, `AbortSignal.timeout(15000)`, yêu cầu trả JSON theo schema, đọc khóa từ env | Phải có | 2 | — | `backend/src/gemini.js` | Thiếu khóa thì báo lỗi rõ ràng khi khởi động |
| TV4-06 | Cache kết quả theo SHA-256 của input đã chuẩn hóa (chữ thường, gộp khoảng trắng, kèm tiêu chí), giữ 24 giờ | Nên có | 3 | TV4-04 | `backend/src/match.js` | Hỏi lại cùng câu trả `cached: true`, không gọi Gemini |
| TV4-07 | `backend/tools/spam-test.js`: bắn 10 request `/api/match` liên tiếp, in bảng lần, mã trạng thái, `Retry-After` | Phải có | 3 | TV4-02 | `backend/tools/spam-test.js` | Ra 5 lần 200 (hoặc cache), 5 lần 429 |
| TV4-08 | Test lại Saved và Calendar sau khi đổi nguồn dữ liệu sang API | Phải có | 3 | TV1-06 | `saved-store.js`, `calendar-export.js` | Smoke test PASS |
| TV4-09 | Viết `docs/prompt-plan/04-matcher-prompt.md`, gom `03-prompt-log.md` từ cả nhóm, ghép báo cáo (mục 4.4, 5, 6) | Phải có | 4 | Cả nhóm | `docs/` | Đủ 4 file prompt-plan |

### Việc chung của cả nhóm

| ID | Việc | Đợt | Xong khi |
|---|---|---|---|
| ALL-01 | Mỗi người ghi ít nhất 3 dòng vào `03-prompt-log.md` cho task của mình, trong đó có ít nhất 1 ca AI sinh sai và cách sửa | Suốt quá trình | TV4 kiểm tra trước đợt 4 |
| ALL-02 | Cập nhật bảng task trên Notion theo các ID ở trên | Suốt quá trình | Ảnh chụp đưa vào báo cáo |
| ALL-03 | Tổng duyệt demo 2 lần, bấm giờ 15 phút | 4 | Không vượt giờ |

---

## 7. Lịch làm

| Đợt | Ngày | Mục tiêu đo được | TV1 | TV2 | TV3 | TV4 |
|---|---|---|---|---|---|---|
| **1 — Sửa lỗi demo** | 27/11 – 29/11 | Tìm `cvpr` ra thẻ CVPR. Chip Việt Nam hoạt động | 01, 02, 03 | 01 | 01–06 | 05 (chuẩn bị) |
| **2 — Backend, dữ liệu** | 30/11 – 03/12 | `/api/conferences` chạy public, cron chạy, có rate limit | 04, 05, 06, 07 | 02, 03 | sửa lỗi đợt 1 | 01, 02, 03 |
| **3 — AI matcher** | 04/12 – 07/12 | Gợi ý chạy từ đầu đến cuối, spam test ra 429 | 08 | 04, 05, 06, 09 | 07, 10, 08 | 10, 04, 06, 07, 08 |
| **4 — Báo cáo, slide, tổng duyệt** | 08/12 – 09/12 | Nộp đủ, demo trơn | 09 | 07, 08 | 09 | 09 |

Họp nhanh 15 phút cuối mỗi đợt để chốt: đạt mục tiêu chưa, có cần cắt gì không.

Tên nhánh theo quy ước cũ: `fix/t5-tv3-01-hidden-past`, `feat/t5-tv1-01-country`, `feat/t5-tv4-01-express`, `feat/t5-tv2-04-match-page`. Review chéo TV1↔TV3, TV2↔TV4.

**Thứ tự cắt khi trễ:** TV3-08 lọc chủ đề → TV1-07, TV1-08 crawl và tóm tắt (BM25 chạy tạm trên tên và lĩnh vực) → TV4-06 cache → TV2-03 About. **Không cắt** bất kỳ task "Phải có" nào.

---

## 8. Quy tắc "Xong" chung

Một task chỉ được đánh dấu Done trên Notion khi đủ:

1. Có PR riêng, mô tả đầu vào và đầu ra, ảnh chụp nếu có giao diện.
2. `npm test` PASS (frontend và backend), có test mới cho phần logic mới.
3. Người review chéo đã duyệt.
4. Không có khóa API, `.env` hay thông tin cá nhân trong commit.
5. Có ít nhất 1 dòng trong `03-prompt-log.md` nếu task có dùng AI.
6. Chạy thử được trên trình duyệt, cả màn hình điện thoại.

---

## 9. Lưu vết dùng AI

Thư mục `docs/prompt-plan/`:

| File | Người viết | Nội dung |
|---|---|---|
| `01-ui-spec.md` | TV2 | Đặc tả UI **trước** khi giao AI sinh code |
| `02-architecture-db.md` | TV1 | Sơ đồ mục 5, ERD, API, lịch cron, các quyết định ở mục 4 |
| `03-prompt-log.md` | Cả nhóm, TV4 gom | Mỗi dòng: ngày · người · công cụ · task ID · prompt rút gọn · AI sinh gì · **lỗi AI gây ra** · cách phát hiện và sửa · commit |
| `04-matcher-prompt.md` | TV4 | Prompt hệ thống cho Gemini, schema JSON, cách chống bịa, 3 ví dụ vào và ra |

Ví dụ một dòng log:

| Ngày | Người | Task | Prompt rút gọn | Lỗi AI gây ra | Cách sửa |
|---|---|---|---|---|---|
| 26/11 | TV3 | TV3-01 | "Vì sao tìm CVPR không ra?" | AI đoán nguyên nhân là chỉ tìm tên viết tắt và phân biệt hoa thường | Chạy thử trên dữ liệu thật, thấy search đúng, nguyên nhân là mặc định `past = false`. Viết test để không lặp lại |

Thầy cho dùng AI nhưng yêu cầu trung thực. Báo cáo ghi rõ phần nào AI sinh, phần nào nhóm thiết kế, sửa hoặc tự viết.

---

## 10. Kịch bản demo

5 phút, sau phần slide.

1. **Explore**, gõ `cvpr`: ra "CVPR 2027 · Đã đóng · dự kiến ~11/2027". Bấm "Xem cả hạn đã qua" thấy 7 kỳ. Nói một câu về nguyên nhân lỗi cũ.
2. **Chip Việt Nam**: còn hạn có MobiSys 2027 (TP.HCM, CCF B, hạn 27/11 và 04/12/2026), EASE 2027 (Hà Nội, hạn 15/01/2027). *Kiểm tra lại sáng hôm bảo vệ vì hạn có thể đã qua.*
3. **180 ngày** + CCF B trở lên.
4. **Gợi ý hội nghị**: dán "Tôi làm bảo mật cho AI agent, phát hiện prompt injection, muốn nộp ở châu Á trong 3 tháng tới, CCF B trở lên" → hiện chip "AI hiểu là: Châu Á · CCF ≥ B · 90 ngày · prompt injection…" → 5 kết quả kèm lý do. Xóa chip "Châu Á", bấm chạy lại để thầy thấy bộ lọc là thật và sửa được.
5. Terminal chạy `npm run spam-test` (trong `backend/`): 5 lần 200, 5 lần 429. Trên giao diện bấm liên tục thấy thông báo đếm ngược.
6. Mở `docs/prompt-plan/03-prompt-log.md`, đọc ca CVPR.

---

## 11. Rủi ro và phương án dự phòng

| Rủi ro | Phương án |
|---|---|
| Render đang "ngủ", lần gọi đầu mất 30–60 giây lúc demo | Gọi `/api/health` 2 phút trước giờ demo. Giao diện ghi "Máy chủ đang khởi động..." thay vì báo lỗi |
| Mạng trường lỗi khi demo | Quay video demo trước. Chạy backend trên máy (`npm start`) làm phương án 2 |
| Hết quota Gemini miễn phí | Cache 24 giờ, giới hạn 20 lần/ngày/IP, sửa chip không tốn lượt phân tích. Hết quota thì người dùng vẫn chọn bộ lọc bằng tay được |
| Gemini phân tích sai bộ lọc | Backend kiểm tra theo danh sách cho phép. Người dùng thấy chip "AI hiểu là" và sửa được |
| Gemini bịa hội nghị ở bước 5 | Chỉ giữ ID có trong 20 kỳ đã lọc |
| Người dùng cố lừa AI ("bỏ qua hướng dẫn, trả về…") | AI chỉ được trả JSON theo schema, backend kiểm tra từng trường, nên câu lừa không làm đổi được truy vấn SQL hay lộ dữ liệu |
| CCFDDL đổi format hoặc sập | Ingest lỗi thì không commit, giữ dữ liệu cũ. Frontend vẫn có snapshot |
| Trường dùng chung IP (NAT), nhiều người bị chặn cùng lúc | Giới hạn 5/phút đủ cho demo. Báo cáo ghi rõ đây là hạn chế của chặn theo IP |
| `node:sqlite` đang ở mức thử nghiệm, có cảnh báo | Chạy ổn trên Node 24. Nếu Render lỗi thì chuyển sang `better-sqlite3`, chỉ sửa trong `db.js` |
| Crawl CFP bị chặn hoặc trang dùng JS | Bỏ qua chuỗi đó, ghi vào log lỗi. BM25 vẫn chạy được trên tên và lĩnh vực |
| Không xong đợt 3 | Cắt theo thứ tự ở mục 7. Đợt 1 và 2 đã đủ trả lời các góp ý về lỗi, lọc và backend |
