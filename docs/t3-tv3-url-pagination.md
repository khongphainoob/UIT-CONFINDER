# T3-TV3-01 — Đồng bộ URL và phân trang 12 mục

## 1. Phạm vi thực hiện

Trang Khám phá lưu trạng thái vào URL theo thứ tự cố định:

```text
q, field, ccf, core, mode, kind, window, past, sort, page
```

`field`, `ccf`, `core` và `mode` dùng tham số lặp. Giá trị trùng hoặc không hợp lệ bị loại khi đọc URL. Các giá trị mặc định không được ghi để đường dẫn ngắn hơn.

## 2. Quy tắc lịch sử trình duyệt

- Gõ tìm kiếm: chờ 250ms rồi dùng `replaceState`, tránh tạo một lịch sử cho từng ký tự.
- Chọn hoặc bỏ bộ lọc, đổi sort, chuyển trang và reset: dùng `pushState`.
- URL sai hoặc page vượt giới hạn: dùng `replaceState` để sửa entry hiện tại.
- Back/Forward: đọc lại URL rồi đồng bộ control, chip, kết quả và pager.

## 3. Quy tắc phân trang

- Hiển thị tối đa 12 hội nghị mỗi trang.
- 0 đến 12 kết quả không hiển thị pager.
- Page nhỏ hơn 1 hoặc không phải số nguyên trở về page 1.
- Page lớn hơn tổng số trang được đưa về trang cuối.
- Thay đổi tìm kiếm, bộ lọc hoặc sort luôn trở về page 1.
- Link pager giữ nguyên tất cả tham số lọc hiện tại.

## 4. Checklist expected/actual

Đã kiểm tra ngày 06/11/2026 bằng Node.js và Chrome DevTools với catalog hiện tại của dự án.

| Trường hợp | Expected | Actual | Kết quả |
|---|---|---|:--:|
| Không có query | State mặc định, URL gọn | URL không có query; 217 kết quả, hiển thị 1–12 | PASS |
| Multi params | Giữ đủ field/ccf/core/mode | Parse/serialize giữ tham số lặp theo thứ tự cố định | PASS |
| Params trùng | Chỉ giữ một giá trị | `field=AI` lặp được chuẩn hóa còn một AI | PASS |
| Params sai | Bỏ giá trị sai và làm sạch URL | `ccf=Z&field=BAD` bị loại, URL trở về mặc định | PASS |
| `page=abc/0/-1` | Trở về page 1 | Hàm parse trả page 1 | PASS |
| Page quá lớn | Clamp về trang cuối | `page=999` được đổi thành `page=19`, hiển thị 217–217 | PASS |
| 0 kết quả | Range 0–0, ẩn pager | 0 card, status 0–0, không có pager | PASS |
| 1 kết quả | Một card, ẩn pager | Hàm paginate trả một item và một trang | PASS |
| 12 kết quả | 12 card, ẩn pager | Hàm paginate trả 12 item và một trang | PASS |
| 13 kết quả | 12 card trang 1, một card trang 2 | Hàm paginate trả 12/1 item trên hai trang | PASS |
| Reload | Giữ controls/chips/results/page | AI + SE trang 2 vẫn có 2 chip, 12 card, range 13–24 | PASS |
| Back/Forward | Khôi phục đúng state trước/sau | Back bỏ Field AI; Forward khôi phục Field AI | PASS |
| Nhập tìm kiếm | Debounce 250ms, dùng replaceState | `machine learning` giữ focus, URL có `q`, trả 6 kết quả | PASS |
| Đổi filter/sort | Dùng pushState và về page 1 | Thêm Field AI đưa kết quả về trang 1 | PASS |
| Reset | State mặc định, page 1, không xóa saved/theme | `setState` chỉ đổi state trang, không ghi saved/theme | PASS |

## 5. File liên quan

- `site/js/pages/explore-state.js`: parse, chuẩn hóa, serialize, lọc, sort và paginate.
- `site/js/pages/conference-list.js`: kết nối state với URL, history, controls, kết quả và pager.
- `site/conferences.html`: vùng bộ lọc, kết quả và phân trang.

## 6. Điều kiện hoàn tất

Phần code và kiểm thử đã hoàn thành. Trước khi chuyển task sang Done, cần gắn link commit hoặc Pull Request và nhờ TV1 review cách dùng helper deadline.
