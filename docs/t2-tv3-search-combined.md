# T2-TV3-01 — Tìm kiếm và lọc kết hợp

## 1. Chức năng

Trang Hội nghị hiện hỗ trợ:

1. Tìm theo acronym hoặc tên đầy đủ, không phân biệt chữ hoa, chữ thường và dấu tiếng Việt.
2. Chọn nhiều lĩnh vực cùng lúc.
3. Chọn nhiều hạng CCF và CORE cùng lúc.
4. Chọn nhiều hình thức Online, Offline hoặc Hybrid.
5. Kết hợp các nhóm trên với loại deadline, window, past và sort.

Các checkbox nâng cao nằm trong một panel thu gọn để trang không bị rườm rà. Khi đang có lựa chọn, panel tự mở và hiện số lượng lựa chọn.

## 2. Quy tắc kết hợp

- Các giá trị trong cùng nhóm dùng OR. Ví dụ `field=AI&field=SE` nhận hội nghị thuộc AI hoặc SE.
- Các nhóm khác nhau dùng AND. Ví dụ `field=AI&ccf=A&mode=online` chỉ nhận hội nghị thỏa cả ba nhóm.
- Thứ tự pipeline là tìm/lọc → sort → phân trang 12 kết quả.
- Thay đổi bất kỳ điều kiện nào đều quay về trang 1.

## 3. URL và chip

Multi-select dùng query params lặp:

```text
?q=machine%20learning&field=AI&field=SE&ccf=A&core=A*&mode=online
```

Mỗi lựa chọn đang áp dụng có một chip riêng. Bỏ chip chỉ xóa đúng giá trị đó; nút “Đặt lại” đưa toàn bộ state về mặc định nhưng không đụng tới danh sách saved.

## 4. Bàn giao

- UI và sự kiện: `site/js/pages/conference-list.js`.
- Hàm parse, normalize, filter và serialize: `site/js/pages/explore-state.js`.
- Responsive: `site/css/pages/conference-list.css`.
- Model và helper deadline: dùng module của TV1, không sao chép nghiệp vụ.

## 5. Kết quả kiểm tra trên trình duyệt

Đã kiểm tra ngày 01/11/2026 bằng Edge headless và catalog live/fallback của dự án:

- Giao diện tạo 10 lựa chọn lĩnh vực, 3 CCF, 4 CORE và 3 hình thức từ đúng state contract.
- `field=AI&field=SE&ccf=C&mode=offline` tạo bốn chip, giữ params lặp và trả 17 kết quả.
- Bỏ chip AI chỉ xóa `field=AI`; SE, CCF C và Offline vẫn được giữ.
- Thêm `q=ICST` vào tổ hợp còn đúng 1 hội nghị.
- Reset xóa toàn bộ checkbox/chip/query, trở về trang 1 và giữ nguyên dữ liệu saved.
- Viewport 390 × 844 không có thanh cuộn ngang; không ghi nhận lỗi JavaScript.

## 6. Tham khảo bố cục

- CCFDDL: ưu tiên card deadline, countdown, rank và bộ lọc theo lĩnh vực.
- WikiCFP: danh sách cần quét nhanh tên, nơi tổ chức và deadline.
- Conference Alerts: ô tìm kiếm chính nổi bật, bộ lọc chi tiết và nút reset đặt chung một khu vực.

Trang chỉ học cách tổ chức thông tin từ các nguồn trên; HTML, CSS và JavaScript vẫn do nhóm tự viết theo component chung của UIT ConFinder.

## 7. Mẫu giao diện được áp dụng

Phiên bản hiện tại dùng bố cục của một conference deadline tracker:

1. Ô tìm kiếm là thao tác chính ở đầu trang.
2. Lĩnh vực và CCF là chip chọn nhanh vì được dùng thường xuyên.
3. CORE và hình thức nằm trong “Lọc thêm” để giao diện không quá dài.
4. Kết quả bắt đầu bằng tiêu đề “Hạn nộp sắp tới”, sau đó là các card có deadline, countdown và nút lưu.

Cách tổ chức này được tham khảo từ Conference Deadline Tracker và các mẫu website hội nghị HTML/CSS đơn giản. Nhóm không sao chép logo, hình ảnh hoặc mã nguồn của website khác.
