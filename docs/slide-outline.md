# Dàn slide bảo vệ (khoảng 15 slide, 10 phút nói và 5 phút demo)

> TV2 dựng slide, mỗi người tự viết nội dung slide của mình. Nguyên tắc: mỗi slide
> một ý, ít chữ, có ảnh hoặc số liệu thật. Không chiếu lại cây chức năng cũ như
> phần chính, vì thầy đã nhận xét bản đó "đơn giản quá".

| # | Tiêu đề | Nội dung chính | Ai nói | Hình |
|---|---|---|---|---|
| 1 | UIT ConFinder | Tên đề tài, Nhóm 7, GVHD, link web | TV2 | Ảnh trang chủ |
| 2 | Vấn đề | 3 nỗi đau: nhiều nguồn, múi giờ AoE dễ nhầm, không biết hội nghị nào hợp đề tài | TV2 | 3 icon |
| 3 | Khác gì CCFDDL? | Bảng so sánh 6 tiêu chí (lấy ở mục 1 báo cáo). Đây là câu trả lời trực tiếp cho góp ý "vào thẳng trang gốc là được" | TV2 | Bảng ✓/✗ |
| 4 | Góp ý lần trước và đã sửa | Bảng 5 dòng: góp ý → đã làm gì → bằng chứng | TV4 | Bảng |
| 5 | Kiến trúc hệ thống | Sơ đồ CCFDDL → cron → JSON → SQLite → Express + rate limit → web; có fallback snapshot | TV1 | Sơ đồ |
| 6 | Cơ sở dữ liệu và cập nhật | ERD 5 bảng, cron 03:00 hằng ngày, ảnh log GitHub Actions | TV1 | ERD và ảnh log |
| 7 | Làm giàu dữ liệu | Chuẩn hóa quốc gia (tỷ lệ %), crawl CFP (N chuỗi), AI tóm tắt topic, dự báo hạn năm sau | TV1 | Ví dụ một thẻ trước và sau |
| 8 | Lỗi CVPR: nguyên nhân thật | Không phải lỗi so khớp: mặc định ẩn kỳ đã đóng, 274/385 chuỗi bị ảnh hưởng, chỉ còn 84/2346 kỳ hiện ra. Đã loại trừ giả thuyết "chỉ tìm acronym" và "phân biệt hoa thường" | TV3 | Ảnh trước và sau |
| 9 | Tìm và lọc mới | Search nhiều trường, lọc quốc gia (chip Việt Nam), 180 ngày, topic | TV3 | Ảnh Explore |
| 10 | Gợi ý hội nghị bằng AI | Luồng 5 bước: AI dịch câu hỏi thành bộ lọc → backend kiểm tra → SQL lọc → BM25 theo từ khóa AI → AI chọn 5 kèm lý do. Nhấn mạnh: AI không tự tìm hội nghị, chỉ điền bộ lọc; người dùng thấy và sửa được chip "AI hiểu là". Vì sao BM25 trên nguyên câu không chuẩn (tiếng Việt và từ đồng nghĩa) | TV4 + TV3 | Sơ đồ 5 bước và ảnh chip "AI hiểu là" |
| 11 | Chống spam và bảo vệ quota | Bảng hạn mức: 60/phút, 5/phút, 20/ngày, 1.500 ký tự, cache 24 giờ, 429 + Retry-After. Ảnh kết quả spam test | TV4 | Bảng và ảnh terminal |
| 12 | Giao diện | Trang Gợi ý, nhãn Dự kiến, responsive mobile | TV2 | 3 ảnh |
| 13 | Dùng AI có kiểm soát | Quy trình: đặc tả → prompt → review → test → PR. 2 ca AI sinh sai và cách nhóm sửa (dùng ca CVPR) | TV4 | Trích prompt log |
| 14 | Kiểm thử và phân công | Số test, Lighthouse, ảnh bảng Notion | TV4 | Ảnh Notion |
| 15 | Demo và Hỏi đáp | Chuyển sang demo trực tiếp | Cả nhóm | — |

## Kịch bản demo (sau slide 15)

Theo mục 10 của [t5-feedback-improvement-plan.md](t5-feedback-improvement-plan.md): CVPR → Việt Nam → 180 ngày → Gợi ý AI → spam test → prompt log.

Chuẩn bị dự phòng:

- Quay video demo trước, phòng khi mạng hoặc Render ngủ (free tier mất khoảng 30–50 giây để khởi động lại). Gọi `/api/health` trước buổi khoảng 2 phút để đánh thức server.
- Chuẩn bị sẵn 3 câu mô tả cho matcher và đã chạy thử để có cache.
- Kiểm tra lại các hạn trong demo vào sáng hôm bảo vệ.

## Câu hỏi thầy có thể hỏi, và người trả lời

| Câu hỏi | Người trả lời |
|---|---|
| Sao không đưa cả danh sách hội nghị cho AI? | TV4 |
| Nếu CCFDDL đổi format hoặc sập thì sao? | TV1 |
| Rate limit theo IP có bị lách bằng đổi IP không? Sau NAT ở trường thì sao? | TV4 |
| Hạn dự kiến sai thì người dùng có bị hiểu nhầm không? | TV1 + TV2 |
| Phần nào AI làm, phần nào nhóm tự làm? | Mỗi người trả lời cho module của mình |
