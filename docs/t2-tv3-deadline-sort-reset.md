# T2-TV3-02 — Lọc hạn, sắp xếp và đặt lại

## 1. Phạm vi đã làm

Task này nối state TV3 vào trang `conferences.html` và bổ sung các thao tác:

1. Tìm theo tên đầy đủ hoặc tên viết tắt, không phân biệt hoa/thường và dấu tiếng Việt.
2. Lọc kết hợp theo lĩnh vực, CCF, CORE và hình thức; OR trong một nhóm, AND giữa các nhóm.
3. Chọn loại hạn `any`, `abstract` hoặc `paper`.
4. Lọc hạn trong tất cả, 7, 14, 30 hoặc 90 ngày tới.
5. Mặc định ẩn hội nghị đã đóng; có thể bật “Hiện hạn đã qua”.
6. Sắp xếp riêng theo deadline, tên, hạng CCF hoặc hạng CORE.
7. Đặt lại toàn bộ state và chip về mặc định, quay về trang 1.
8. Giữ nguyên danh sách hội nghị đã lưu vì reset không đọc, ghi hoặc xóa `localStorage`.

## 2. Cách xử lý deadline

Trang gọi `getNextSubmission(edition, { kind, now })` của TV1 cho từng edition. Trong một lượt render chỉ dùng một giá trị `now` để mọi kết quả nhất quán.

Window ngày chỉ kiểm tra `futureDeadlines` theo điều kiện:

```text
now < deadline <= now + N × 24 giờ
```

Vì vậy deadline TBA, date-only, Estimated, deadline đúng bằng `now` và ngày diễn ra hội nghị không được dùng để lọc window. Deadline đúng biên cuối vẫn được nhận.

## 3. Checklist expected/actual

| Trường hợp | Expected | Actual | Kết quả |
|---|---|---|:--:|
| Kind `any` | Helper xét abstract và paper | Truyền `kind=any` vào helper TV1 | PASS |
| Kind `abstract` | Chỉ xét abstract | Truyền `kind=abstract` vào helper TV1 | PASS |
| Kind `paper` | Chỉ xét paper | Truyền `kind=paper` vào helper TV1 | PASS |
| Window 7/14/30/90 | Chỉ nhận future deadline nằm trong biên | Lọc trên `futureDeadlines` với biên trái mở, biên phải đóng | PASS |
| TBA/date-only/Estimated | Không lọt window ngày | Không có trong `futureDeadlines` của helper | PASS |
| Deadline bằng now | Bị loại khỏi window | Điều kiện dùng `now < instant` | PASS |
| Past mặc định | Ẩn status `closed` | `past=false` loại `closed` | PASS |
| Bật past | Có thể hiện status `closed` | `past=true` giữ kết quả closed khi window là all | PASS |
| Sort deadline | Upcoming → unknown → closed, có tie xác định | Dùng deadline, tên và ID làm khóa phụ | PASS |
| Sort tên | Acronym/tên A–Z | So sánh locale `vi`, sau đó year và ID | PASS |
| Sort CCF/CORE | Hạng cao trước, thiếu hạng ở cuối | Dùng bảng trọng số, deadline và ID làm khóa phụ | PASS |
| Reset | State/chip mặc định, page 1 | Tạo state mặc định mới và đồng bộ URL | PASS |
| Reset và saved | Không xóa hội nghị đã lưu | Không gọi hàm ghi/xóa saved | PASS |
| Hai lĩnh vực | OR trong cùng nhóm | Nhận edition thuộc một trong hai lĩnh vực | PASS |
| Lĩnh vực + CCF + hình thức | AND giữa các nhóm | Chỉ nhận edition thỏa cả ba nhóm | PASS |
| URL multi-select | Mỗi giá trị dùng param lặp | Parse/serialize giữ đủ `field`, `ccf`, `core`, `mode` | PASS |
| Bỏ từng chip | Chỉ xóa đúng lựa chọn | State và URL giữ các lựa chọn còn lại | PASS |

## 4. Cách kiểm tra thủ công

1. Chạy `python tools/serve.py` tại thư mục gốc.
2. Mở URL được server in ra và vào trang Hội nghị.
3. Đổi lần lượt loại hạn, khoảng ngày, past và sort; kiểm tra URL và danh sách thay đổi.
4. Bấm “Đặt lại”; kiểm tra tất cả control, chip và URL về mặc định, trang hiện tại về 1.
5. Lưu một hội nghị, thay đổi bộ lọc rồi reset; kiểm tra nút lưu vẫn giữ trạng thái.

## 5. Kết quả kiểm tra trên trình duyệt

Đã kiểm tra ngày 01/11/2026 bằng Edge headless với snapshot hiện tại:

- Mặc định tìm thấy 216 hội nghị và hiển thị đúng 12 card ở trang đầu.
- `kind=paper&window=7` còn 10 hội nghị và URL giữ đúng hai tham số.
- Sort tên đưa các kết quả đầu về thứ tự CVC, HSCC, ICPC, ICST, RECOMB.
- Bật past ghi `past=1`; reset xóa query, đưa control về `any/all/false/deadline` và xóa toàn bộ chip.
- Giá trị saved trong `localStorage` không thay đổi sau reset.
- Không có lỗi JavaScript hoặc tài nguyên thuộc dự án bị 404 trong lần kiểm tra cuối.

## 6. Cần review trước khi Done

TV1 cần xác nhận cách trang dùng `getNextSubmission`, đặc biệt với `futureDeadlines`, `unknown`, `closed` và deadline không đủ độ chính xác.
