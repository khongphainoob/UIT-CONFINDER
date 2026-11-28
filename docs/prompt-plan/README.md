# Lưu vết dùng AI (prompt plan)

Thầy cho phép dùng AI khi làm đồ án, với điều kiện nhóm làm chủ kiến trúc và ghi lại trung thực đã dùng AI ra sao.
Thư mục này là bản ghi đó. Nguyên tắc: **AI viết nháp, người quyết định và kiểm tra.** Mọi thay đổi do AI sinh
đều qua test tự động, review chéo trong Pull Request và chạy thử trên trình duyệt trước khi merge.

| File | Nội dung | Ai giữ |
|---|---|---|
| [01-ui-spec.md](01-ui-spec.md) | Đặc tả giao diện đưa cho AI trước khi sinh code: màu, chữ, khoảng cách, bố cục 6 trang, component | TV2 |
| [02-architecture-db.md](02-architecture-db.md) | Kiến trúc, luồng dữ liệu, lược đồ SQLite, API, lịch cron | TV1, TV4 duyệt |
| [03-prompt-log.md](03-prompt-log.md) | Nhật ký prompt: ai, công cụ, task, prompt rút gọn, **AI sai ở đâu**, cách phát hiện và sửa | Cả nhóm, TV4 gom |
| [04-matcher-prompt.md](04-matcher-prompt.md) | Prompt đang chạy trong sản phẩm (Gemini): phân tích câu hỏi, chọn hội nghị, tóm tắt CFP, kèm lịch sử sửa | TV4, TV1 |

Công cụ AI nhóm đã dùng:

| Công cụ | Dùng cho |
|---|---|
| Claude Code (trong VS Code) | Sinh nháp code, test, tài liệu; đọc repo để đề xuất cách sửa |
| Google Gemini API | Chạy **trong sản phẩm**: phân tích câu hỏi, chọn hội nghị, tóm tắt CFP (xem 04) |
| _(thành viên tự bổ sung)_ | Công cụ khác từng dùng, ghi đúng sự thật |

Quy ước khi dùng AI (áp dụng từ đợt T5):

1. Viết đặc tả trước (01, 02, kế hoạch `docs/t5-feedback-improvement-plan.md`), rồi mới đưa AI sinh code theo đặc tả.
2. Không nhận code AI sinh nếu chưa có test chạy đạt. Test do người viết hoặc người đọc lại từng ca.
3. Mỗi task có dùng AI phải có ít nhất một dòng trong `03-prompt-log.md`, ghi cả lỗi AI gây ra.
4. Không dán khóa API, mật khẩu hay dữ liệu cá nhân vào prompt.
