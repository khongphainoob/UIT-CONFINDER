# T4-TV3-01 — Review Detail và tổng hợp bảng test

## 1. Phạm vi và bản ghép được kiểm tra

Tài liệu này tổng hợp kết quả review độc lập cho trang Detail, deadline/timezone,
Calendar/ICS và luồng Explore sau khi ghép các phần phụ thuộc của bốn thành viên.

| Thành viên/phần phụ thuộc | Commit hoặc nguồn đã kiểm tra | Trạng thái đầu vào |
|---|---|---|
| TV1 — Detail + data/time | `e8da3f0`, `bce3fd5` | Đã có trên `main` |
| TV2 — UI dùng chung/detail responsive | `5e6f75d`, `e3f9510` | Đã có trên `main` |
| TV3 — Explore URL/deadline/state | `a576177` | Nhánh TV3, đã ghép vào nhánh review |
| TV4 — Google Calendar/ICS | `8f579d5` | Đã có trên `main` |

Nhánh review: `feat/t4-tv3-review-test-matrix`.

Base `main` lúc review: `88f193a`.

## 2. Môi trường chạy

| Thuộc tính | Giá trị |
|---|---|
| Ngày chạy | 12/11/2026 |
| Người tổng hợp | Huy Phạm (TV3) |
| Trình duyệt | Microsoft Edge 157, headless qua DevTools Protocol |
| Test hàm thuần | Node.js 22.12.0 |
| Viewport | 360 × 900, 768 × 900, 1366 × 900 |
| Dữ liệu | Live CCFDDL khi khả dụng; snapshot 2.346 edition dùng kiểm tra toàn vẹn |
| Reviewer TV1 | Chờ xác nhận |

## 3. Test matrix — 16 nhóm case

| Nhóm | Phạm vi | Expected | Actual | Kết quả |
|:---:|---|---|---|:---:|
| D-ID-01 | Detail thiếu `id` | Hiện empty state và link về Khám phá | Hiện “Chưa chọn kỳ hội nghị” và “Đến trang Khám phá” | PASS |
| D-ID-02 | Detail có edition ID sai | Không crash; thông báo ID không tồn tại | Hiện “Không tìm thấy kỳ hội nghị” kèm `khong-ton-tai` | PASS |
| D-ID-03 | Detail có edition ID đúng | Dựng hero, rounds và trạng thái nguồn | `AAAI`, 2 rounds, notice nguồn live CCFDDL | PASS |
| D-DL-01 | `deadlineId=r2-paper` | Chọn đúng deadline, round và type; Calendar nhận đúng object | Hàng Paper được chọn, highlight đúng nhãn round, URL giữ `r2-paper` | PASS |
| D-DL-02 | `deadlineId` sai | Fallback an toàn và xóa tham số sai khỏi URL | Đã fallback; URL đổi từ `deadlineId=sai-id` về chỉ còn edition `id` | PASS sau sửa |
| D-DATA-01 | Edition/rounds thiếu dữ liệu | Helper trả `unknown`, không ném lỗi | `{status:'unknown', deadline:null, futureDeadlines:[]}` | PASS |
| D-DATA-02 | Source/quality/freshness | Phân biệt nguồn live/snapshot; không giả ngày kiểm chứng | Notice live CCFDDL, có giờ tải, ghi “Chưa có lần kiểm chứng” khi `checkedAt=null` | PASS |
| D-DATA-03 | ID/shape toàn snapshot | Không trùng edition/deadline ID; không thiếu shape cơ bản | 2.346 edition; 0 ID edition trùng; 0 deadline ID trùng trong edition; 0 shape thiếu | PASS |
| CAL-01 | Google Calendar với mốc đã chọn | Dùng đúng `r2-paper` và UTC instant | URL chứa Paper deadline và `20261201T000000Z` | PASS |
| CAL-02 | Nội dung ICS | UID/time ổn định, CRLF; không tự thêm duration/reminder | UID `demo-2027-r2-paper`; DTSTART đúng; CRLF đúng; không có DTEND/DURATION/VALARM | PASS |
| CAL-03 | Date-only/TBA/Estimated | Từ chối cả ba trường hợp, có lỗi rõ | Cả 3 helper call đều ném lỗi; UI disable theo contract | PASS |
| EXP-01 | URL filter kết hợp | Params lặp/canonical; OR trong Field, AND giữa nhóm | `field=AI&field=SE&ccf=A&kind=paper&window=30&sort=name`; 2 chip Field active; 3 kết quả live | PASS |
| EXP-02 | Empty + page quá giới hạn | Clamp page về 1, 0 result, ẩn pager | `page=99` bị xóa; `0–0`; không có pager | PASS |
| EXP-03 | Phân trang mặc định | Tối đa 12 card và summary đúng | 12 card; `Trang 1/19`; live count 218 tại thời điểm chạy | PASS |
| EXP-04 | Back/Forward | Khôi phục đúng URL và page state | Trang 1 → trang 2 → Back trang 1 → Forward trang 2 | PASS |
| UI-01 | Responsive | Không tràn ngang ở 360/768/1366 | `scrollWidth <= innerWidth` ở cả ba viewport | PASS |

## 4. Lỗi và quan sát đã phân loại

| Mã | Loại | Mức độ | Mô tả | Xử lý |
|---|---|:---:|---|---|
| BUG-01 | Functional / URL state | Medium | Detail fallback khi `deadlineId` sai nhưng trước đó vẫn giữ ID sai trên URL | Đã sửa trong `conference-detail.js`; browser test D-DL-02 đã PASS |
| DATA-01 | Data quality | Info | Nguồn live hiện có `checkedAt=null`; không thể tuyên bố dữ liệu đã được kiểm chứng thủ công | UI hiển thị đúng “Chưa có lần kiểm chứng”; không sửa giả dữ liệu |
| EXT-01 | External integration | Info | Google Calendar vẫn cần người dùng xác nhận; ICS chưa được import bằng ứng dụng lịch/tài khoản thật trong môi trường test | Ghi là ca chưa chạy thực tế, không tính FAIL của helper |

## 5. Ca chưa chạy và giới hạn

- Chưa xác nhận thao tác lưu sự kiện bằng một tài khoản Google Calendar thật.
- Chưa import file `.ics` vào Outlook/Apple Calendar để kiểm tra đồng bộ máy chủ.
- Kết quả live CCFDDL phụ thuộc dữ liệu tại thời điểm chạy; các case logic cố định dùng fixture/snapshot để tái lập.
- Chưa có xác nhận review cuối của TV1. Vì vậy task chưa được tự đánh dấu Done.

## 6. Kết luận

- 16/16 nhóm case đạt sau khi sửa BUG-01.
- Phần Detail truyền đúng deadline đang chọn sang Calendar/ICS.
- Explore giữ đúng URL/filter/page khi Back/Forward và không tràn ngang ở ba viewport.
- Không có lỗi ID trùng hoặc shape cơ bản bị thiếu trong snapshot 2.346 edition.
- Có thể tạo PR/commit bàn giao; cần TV1 review trước khi chuyển task sang Done.
