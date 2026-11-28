# 01. Đặc tả giao diện (UI spec)

Đặc tả này là đầu vào khi nhờ AI sinh HTML/CSS. Giá trị lấy đúng từ `site/css/tokens.css`; đổi token ở đó thì cả site đổi theo.
Hướng thiết kế: **"thẻ đeo hội nghị"**. Mỗi hội nghị là một tấm thẻ trắng trên nền giấy tím nhạt, có ruy-băng hạng,
ngày chót viết bằng chữ mono. Phong cách phẳng, dùng đường kẻ thay cho bóng đổ.

> TV2 bổ sung: ảnh trang tham khảo và link Figma (wireframe desktop, mobile) dùng lúc thiết kế.

## 1. Màu

| Vai trò | Token | Giá trị | Dùng ở |
|---|---|---|---|
| Nhấn chính | `--color-primary` | `#5b2d9b` (tím mận) | Link, tiêu đề, nút phụ |
| Dây đeo | `--color-lanyard` | `#d6336c` (hồng) | **Chỉ** dải đỉnh trang và gạch dưới mục nav đang mở |
| Mực | `--color-ink` | `#1d1a24` | Chữ chính, nút chính, footer |
| Nền giấy | `--color-paper` | `#f1eff5` | Nền trang |
| Thẻ | `--color-card` | `#ffffff` | Thẻ hội nghị, ô nhập |
| Chữ phụ | `--color-mute` | `#625c70` | Mô tả, nhãn |
| Đã lưu | `--color-saved` | `#1f8a4c` (xanh lá) | Ngôi sao và nút lưu khi đã lưu |
| Mức khẩn | `--color-urgent/week/month/open-*` | đỏ / cam / xanh dương / xanh lá | **Chỉ** nhãn "Gấp", "Trong tuần", "Trong tháng", "Còn rộng" |

Quy tắc: không viết thẳng mã màu ở file khác ngoài `tokens.css`. Không dùng đỏ cam cho ruy-băng hạng
(đỏ dành riêng cho mức khẩn). Chữ trên nền phải đạt tương phản tối thiểu 4,5:1 (WCAG AA).

## 2. Chữ

| Token | Font | Dùng ở |
|---|---|---|
| `--font-ui` | Be Vietnam Pro | Toàn bộ chữ thường (đủ dấu tiếng Việt) |
| `--font-serif` | Bricolage Grotesque | Tiêu đề trang, tên hội nghị |
| `--font-mono` | JetBrains Mono | Ngày chót, giờ, đồng hồ đếm ngược |

Cỡ chữ dùng `rem` (theo cỡ chữ người dùng chọn): nhãn 12px, chữ phụ 13–14px, thân 16px, tên thẻ 19px,
tiêu đề mục 22px, h1 28–34px, tiêu đề trang chủ 34–64px (`clamp`).

## 3. Khoảng cách, bo góc, điểm ngắt

- Khoảng cách theo bậc 4px (`--space-1` = 4px … `--space-8`).
- Bo góc 6px cho thẻ, nút, ô nhập; 3px cho chip, ruy-băng, nhãn.
- Thiết kế mobile trước. Kiểm tra ở 360px, 768px, 1366px; không được có thanh cuộn ngang.

## 4. Bố cục 6 trang

| Trang | File | Bố cục |
|---|---|---|
| Trang chủ | `index.html` | Hero nền mực "ĐỪNG LỠ HẠN NỘP", đồng hồ đếm ngược hạn gần nhất, thẻ hạn sắp tới |
| Hội nghị | `conferences.html` | Cột trái: bộ lọc (tìm, lĩnh vực, CCF, CORE, châu lục/quốc gia, hình thức, khung hạn). Cột phải: danh sách thẻ, phân trang 12 thẻ/trang |
| Chi tiết | `conference.html?id=` | Tên, hạng, địa điểm; bảng mốc theo vòng với giờ gốc và giờ Việt Nam; xuất `.ics` / Google Calendar; các kỳ khác |
| Gợi ý AI | `match.html` | Cột trái: ô mô tả, câu ví dụ, nút. Cột phải: chip tiêu chí AI hiểu được, tối đa 5 thẻ kèm lý do |
| Đã lưu | `saved.html` | Danh sách đã lưu, xuất lịch hàng loạt, đồng bộ Google Calendar |
| Giới thiệu dữ liệu | `about.html` | Nguồn dữ liệu, cách quy đổi múi giờ, giới hạn, nhóm thực hiện |

## 5. Component dùng chung (`site/js/ui/`, `site/css/components.css`)

| Component | Ghi chú |
|---|---|
| Thẻ hội nghị (`edition-card.js`) | Ruy-băng hạng, tên, nơi tổ chức, ngày chót mono, nhãn mức khẩn, nút sao lưu, nhãn "Kỳ sau dự kiến" cho kỳ đã qua |
| Chip bộ lọc | Bấm để bỏ; có `aria-pressed` |
| Trạng thái (`state.js`) | Đang tải (skeleton), rỗng, lỗi, luôn có hành động gợi ý |
| Widget AI (`ai-assistant.js`) | Nút tròn góc phải dưới, mở khung hỏi nhanh, dẫn sang trang Gợi ý AI |

## 6. Khả năng truy cập

Mọi nút có nhãn đọc được, focus nhìn thấy rõ, tôn trọng `prefers-reduced-motion`, ảnh có `alt`.
Mục tiêu Lighthouse Accessibility 100 trên cả 5 trang (đã đạt, xem báo cáo mục 5).
