# CalendarActions — kiểm thử xuất lịch

## Phạm vi

- `site/js/calendar-export.js`
- `site/js/pages/conference-detail.js`

CalendarActions nhận đúng `edition` và `deadline` đang chọn trên trang chi tiết.
Ứng dụng chỉ mở Google Calendar template hoặc tải `.ics`; không tự thêm sự kiện
và không hiển thị thông báo thành công nếu thao tác tạo thất bại.

## Expected / actual

| Case | Expected | Actual | Kết quả |
|---|---|---|---|
| K01 — đổi sang Round 2 / Paper rồi export | Google URL và ICS giữ `r2-paper`, không chọn lại mốc khác | `dates=20270116T115959Z/20270116T115959Z`, UID `demo-2027-r2-paper@uit-confinder.local`, Round `Fast track` | PASS |
| T01 — AoE sang GMT+7 | `2027-01-15 23:59:59 UTC-12` thành `2027-01-16 18:59:59 GMT+7` và ICS dùng UTC | ICS dùng `DTSTART:20270116T115959Z`; trang chi tiết hiển thị cùng instant là 18:59 GMT+7 | PASS |
| Date-only / TBA / Estimated | Vô hiệu hóa ở UI và từ chối khi gọi helper, có lý do | Nút bị disable; helper ném lỗi, không tạo URL/ICS | PASS |
| Duration / reminder | Không tự suy diễn `DTEND`, `DURATION` hoặc `VALARM` | ICS chỉ có `DTSTART`, không có các trường trên | PASS |
| Định dạng ICS | UID ổn định, text được escape, dòng kết thúc CRLF | UID gồm edition + deadline; output kết thúc CRLF | PASS |

## Kiểm tra đã thực hiện

- Đã kiểm tra K01/T01 và các trường hợp date-only, TBA, Estimated bằng dữ liệu
  fixture trong phiên làm việc.
- `git diff --check`: không báo lỗi.

## Giới hạn thực tế

- Google Calendar cần người dùng xác nhận trong form; code không gọi API và không
  tự tuyên bố đã thêm lịch.
- ICS đã được parser kiểm tra cấu trúc và dữ liệu sự kiện; môi trường này không
  có ứng dụng lịch/tài khoản lịch thật để xác nhận đồng bộ máy chủ.
- Mốc đã hết hạn hiện vẫn bị disable ở UI để tránh tạo nhắc hẹn không còn hữu ích;
  helper thuần chỉ kiểm tra độ chính xác của dữ liệu, không tự chọn mốc khác.
