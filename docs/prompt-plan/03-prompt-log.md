# 03. Nhật ký prompt

Mỗi dòng: ngày · người · công cụ · task · prompt rút gọn · AI sinh gì · **lỗi AI gây ra** · cách phát hiện và sửa · commit.
Ghi trung thực, kể cả khi AI sai. Cột "Lỗi AI gây ra" là phần quan trọng nhất: nó cho thấy nhóm kiểm soát được code chứ không nhận nguyên.

> Quy định ALL-01: mỗi thành viên ghi ít nhất 3 dòng cho task của mình, trong đó ít nhất 1 ca AI sinh sai.
> Các dòng dưới đây là phần TV4 làm ở đợt T5; TV1, TV2, TV3 bổ sung phần của mình ở cuối bảng.

## Đợt T5 (sau buổi góp ý)

| Ngày | Người | Công cụ | Task | Prompt (rút gọn) | AI sinh | Lỗi AI gây ra | Phát hiện và sửa | Commit |
|---|---|---|---|---|---|---|---|---|
| 26/11 | TV4 | Claude Code | Kế hoạch T5 | "Phân tích góp ý của thầy, lên kế hoạch cho từng người" | Kế hoạch dùng Python FastAPI + PostgreSQL | Môn yêu cầu JS, không dùng Python | Người đọc thấy sai phạm vi, yêu cầu đổi sang Express + SQLite và ghi lý do chọn A thay vì B (QĐ1–QĐ13) | 615c517 |
| 26/11 | TV4 | Claude Code | TV4-01 dựng backend | "Dựng backend Express theo đúng cấu trúc chuẩn" | `app.js`/`server.js` tách nhau, router, middleware lỗi, rate limit | — | Người đối chiếu lại với tài liệu Express (security, performance, behind proxies) trước khi nhận; `trust proxy` đặt bằng số proxy cụ thể để rate limit đếm đúng IP | 3d49d5d |
| 28/11 | TV4 | Claude Code | TV1-05 lọc SQL | "Viết queryEditionIds lọc theo hạn trong N ngày" | Câu SQL + test | Đọc `deadline.kind` nhưng dữ liệu dùng `deadline.type`, nên lọc theo thời gian luôn rỗng | Test "còn hạn trong 90 ngày" trả 0 kỳ; sửa thành `type` | 0d1e678 |
| 28/11 | TV4 | Claude Code | TV4-10 prompt | "Viết prompt chọn 5 hội nghị kèm lý do" | Prompt v1–v2 | AI ghi MobiSys 2027 "đã đóng" dù còn hạn; lý do tiếng Việt không dấu | Chạy thử với Gemini thật, so với dữ liệu; prompt v3–v4 bỏ hẳn hạn khỏi dữ liệu gửi AI, code tự xếp theo trạng thái (xem 04) | 0d1e678 |
| 28/11 | TV4 | Claude Code | TV4-10 ứng viên | (như trên) | Danh sách ứng viên lấy mọi kỳ | Gợi ý WSDM 2023, FSE 2023 (kỳ cũ đã qua) | Đọc kết quả thật; chỉ giữ kỳ còn hạn hoặc kỳ mới nhất của mỗi hội nghị | 0d1e678 |
| 28/11 | TV4 | Claude Code | Sửa lỗi CVPR | "Tìm cvpr không ra, tìm nguyên nhân" | Phân tích + sửa `applyFilters` | Test cũ do AI viết trước đó lại **khẳng định** hành vi sai (tìm tên không ra kỳ đã qua) | Thầy thử trực tiếp không ra CVPR; đếm dữ liệu thấy 274/385 hội nghị có kỳ mới nhất đã qua; sửa code và sửa test | 0c5d524 |
| 28/11 | TV4 | Claude Code | Dữ liệu snapshot | (trong lúc sửa CVPR) | — | Phát hiện 2 bản ghi `fixture-*` của test lẫn vào snapshot thật, hiện ra cho người dùng | Test API kiểm tra không còn `fixture-` | 0c5d524 |
| 28/11 | TV4 | Claude Code | Widget AI | "Tạo widget AI nhỏ, kế thừa CSS của site" | Widget + trang Gợi ý AI | Import vòng `common.js` ↔ widget làm trang trắng | Console báo lỗi; đổi sang `import()` động | 0d1e678 |
| 28/11 | TV4 | Claude Code | Trang Gợi ý AI | — | — | Trang hiện "undefined" | Do trình duyệt giữ `routes.js` cũ trong cache; `tools/serve.py` gửi `Cache-Control: no-cache` | cfc68b6 |
| 28/11 | TV4 | Claude Code | Menu | "Trang Gợi ý AI không có đường vào" | — | Mục menu bị ẩn khi chưa có backend, nên GitHub Pages không có link | Luôn hiện link; trang tự báo "chưa bật" khi thiếu backend | a756274 |
| 28/11 | TV4 | Claude Code | TV1-04/07/08 crawler | "Viết ingest, crawl CFP, enrich theo TODO" | 3 script + test | Lần đầu lấy nhầm CFP Journal Track của AAAI; lẫn chữ menu; nhận trang chủ ACL, CHI là CFP | Đọc tay văn bản crawl của 15 hội nghị; loại link journal/workshop, bỏ `<nav>/<header>/<footer>`, đi thêm một bước qua trang "Calls", siết điều kiện nhận CFP; thêm test cho từng ca | 086b011 |
| 28/11 | TV4 | Claude Code | TV1-07 crawler | (chạy đủ 387 hội nghị) | 324/387 lấy được CFP | ICSE lấy nhầm CFP của CAIN (tổ chức chung trên conf.researchr.org); tương tự ICSME, CGO, MoDELS | Đọc nhật ký thấy link `track/cain-2027`; loại link track không chứa tên hội nghị, crawl và enrich lại 4 hội nghị, thêm test | 135943a |

## Phần các thành viên bổ sung

| Ngày | Người | Công cụ | Task | Prompt (rút gọn) | AI sinh | Lỗi AI gây ra | Phát hiện và sửa | Commit |
|---|---|---|---|---|---|---|---|---|
| | TV1 | | | | | | | |
| | TV2 | | | | | | | |
| | TV3 | | | | | | | |
