# TV3 — Bằng chứng kiểm tra bộ lọc trang Khám phá

Tài liệu này ghi lại kết quả kiểm tra thủ công phần tìm kiếm, bộ lọc, sắp xếp và chia trang. Nhóm dùng một mốc thời gian giả định để kết quả không thay đổi theo ngày mở website. Dữ liệu trong bảng chỉ là dữ liệu mẫu, không phải danh sách hội nghị thật.

## 1. Thông tin kiểm tra

| Thuộc tính | Giá trị |
|---|---|
| Ngày đối chiếu | 27/10/2026 |
| Mốc thời gian giả định | `2026-10-20T00:00:00Z` |
| Hình thức | Đối chiếu expected/actual thủ công |
| Kết quả ghi nhận | **31/31 trường hợp đạt** |
| Người review phía TV1 | Chưa xác nhận |

## 2. So sánh kết quả mong đợi và kết quả thực tế

| Trường hợp | Mong đợi | Thực tế | Kết quả |
|---|---|---|:--:|
| T01 | `e02, e01, e06, e05, e03` | `e02, e01, e06, e05, e03` | PASS |
| T02 | `e03` | `e03` | PASS |
| T03 | `e01` | `e01` | PASS |
| T04 | `e05` | `e05` | PASS |
| T05 | `e02, e01, e05, e03` | `e02, e01, e05, e03` | PASS |
| T06 | `e03` | `e03` | PASS |
| T07 | `e01, e02` | `e01, e02` | PASS |
| T08 | `e02` | `e02` | PASS |
| T09 | `e02, e01` | `e02, e01` | PASS |
| T10 | `e03` | `e03` | PASS |
| T11 | `e03, e04` | `e03, e04` | PASS |
| T12 | `e02, e06, e03` | `e02, e06, e03` | PASS |
| T13 | `e02, e01` | `e02, e01` | PASS |
| T14 | `e02, e01, e06` | `e02, e01, e06` | PASS |
| T15 | DEFAULT_STATE và kết quả như T01 | DEFAULT_STATE và kết quả như T01 | PASS |
| T16 | `e05`; field không trùng; mode canonical | `e05`; `['AI']`; `['online']` | PASS |
| T17 | Page trở về 1 | Page bằng 1 | PASS |
| T18 | DEFAULT_STATE, không truy cập storage | DEFAULT_STATE, không truy cập storage | PASS |
| T19 | Parse lại đúng state A | State A được khôi phục | PASS |
| T20 | 0 kết quả | 0 kết quả | PASS |
| T21 | 1 kết quả, 1 trang | 1 kết quả, 1 trang | PASS |
| T22 | 12 kết quả, 1 trang | 12 kết quả, 1 trang | PASS |
| T23 | Trang 2 có 1 trong 13 kết quả | Trang 2 có `x12` | PASS |
| T24 | Rank null không khớp A* | Chỉ `e02, e01` | PASS |
| T25 | Chọn `e07-r2-paper` | Chọn `e07-r2-paper` | PASS |
| T26 | Deadline bằng now bị loại | 0 kết quả | PASS |
| T27 | Deadline đúng biên phải được nhận | `boundary-end` | PASS |
| T28 | Sau biên 1ms bị loại | 0 kết quả | PASS |
| T29 | Không throw, page 1, field rỗng | Không throw, page 1, field rỗng | PASS |
| URL | Params lặp, bỏ default, thứ tự canonical | Chuỗi URL đúng expected | PASS |
| Search | Bỏ dấu, chuẩn hóa khoảng trắng | `tri tue nhan tao` | PASS |

## 3. Kết luận

Cả 31 trường hợp đều khớp với kết quả mong đợi. Bảng này là bằng chứng bàn giao của task, không phải file test tự động và không cần chạy bằng Node.js.

## 4. Việc còn lại trước khi hoàn tất task

1. Nhờ TV1 kiểm tra cách TV3 sử dụng `getNextSubmission`, `futureDeadlines` và hai trạng thái `unknown`, `closed`.
2. Khi helper thật của TV1 được ghép vào, đối chiếu lại các trường hợp chính để bảo đảm kết quả không thay đổi.
3. Nối phần state này với `conference-list.js`, sau đó kiểm tra thao tác thật trên trình duyệt.
