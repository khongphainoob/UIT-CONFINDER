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
| Import New Outlook | File tải từ Detail được Outlook nhận dạng và import | Blob tải file có UTF-8 BOM; Outlook xác nhận import vào Calendar | PASS |

## Kiểm tra đã thực hiện

- Đã kiểm tra K01/T01 và các trường hợp date-only, TBA, Estimated bằng dữ liệu
  fixture trong phiên làm việc.
- Đã sinh file bằng đúng dữ liệu K01/T01 tại
  `docs/evidence/t3-tv4-k01-demo.ics`: UID `demo-2027-r2-paper`,
  `DTSTART:20270116T115959Z`, kết thúc CRLF và không có
  `DTEND`/`DURATION`/`VALARM`.
- Ngày 12/11/2026 đã mở và import file `.ics` bằng Microsoft Outlook vào
  Calendar. Outlook xác nhận `Imported "UIT-ConFinder-Test.ics" to Calendar`.
  File đã import: `docs/evidence/t3-tv4-k01-outlook.ics`.
  Ảnh bằng chứng: `docs/evidence/t3-tv4-ics-import-outlook.png`.
- Lần thử đầu không có BOM bị New Outlook từ chối bằng thông báo
  `Incorrect file type`. Đã sửa `conference-detail.js` để Blob tải xuống thêm
  UTF-8 BOM; bản sau sửa được import thành công.
- `git diff --check`: không báo lỗi.

## Trạng thái nghiệm thu thủ công

| Bước | Expected | Actual | Trạng thái |
|---|---|---|---|
| Mở file `.ics` | Windows chuyển file cho ứng dụng lịch mặc định | File được chuyển cho Microsoft Outlook for Windows | PASS |
| Lưu/import sự kiện | Outlook nhận file và import vào Calendar | Outlook báo `Imported "UIT-ConFinder-Test.ics" to Calendar` | PASS |
| Reviewer TV2 | TV2 kiểm tra UI và thao tác CalendarActions | Chưa có xác nhận reviewer | PENDING |

## Giới hạn thực tế

- Google Calendar cần người dùng xác nhận trong form; code không gọi API và không
  tự tuyên bố đã thêm lịch.
- ICS đã được parser kiểm tra cấu trúc và dữ liệu sự kiện; môi trường này không
  tự lưu vào tài khoản lịch nếu người dùng chưa xác nhận trong Outlook.
- Mốc đã hết hạn hiện vẫn bị disable ở UI để tránh tạo nhắc hẹn không còn hữu ích;
  helper thuần chỉ kiểm tra độ chính xác của dữ liệu, không tự chọn mốc khác.
