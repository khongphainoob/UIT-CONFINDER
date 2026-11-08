# T3-TV3-02 — Kiểm bộ lọc theo deadline thật và state

## 1. Phạm vi

Task kiểm tra trang Khám phá với helper deadline thật của TV1, state URL của TV3 và catalog snapshot hiện tại. Mọi ca deadline dùng cùng mốc cố định để kết quả không thay đổi theo thời gian chạy:

```text
now = 2026-11-08T00:00:00.000Z
```

Trang chỉ đặt một timer đến deadline tương lai gần nhất. Khi timer chạy, trang lọc, sort và phân trang lại với `now` mới; không chạy interval mỗi giây và không dùng chuỗi countdown để lọc.

| Thuộc tính | Giá trị |
|---|---|
| Ngày kiểm tra | 08/11/2026 |
| Trình duyệt | Chrome 156 |
| Test hàm thuần | Node.js 22 |
| Reviewer TV1 | Chưa xác nhận |

## 2. Expected/Actual theo mã case

| Mã | Nội dung | Expected | Actual | Kết quả |
|:--:|---|---|---|:--:|
| Q01 | Tìm tên/acronym, bỏ dấu, nhiều token | `tri tue learning` khớp đúng fixture | Khớp `q1` | PASS |
| F01 | OR trong cùng nhóm Field | AI hoặc SE | Nhận `ai`, `se`; loại `db` | PASS |
| F02 | AND giữa Field/CCF/mode | Thỏa cả ba nhóm | Chỉ nhận `se` | PASS |
| F03 | Unknown giữ rõ | Không suy rank/mode từ giá trị null | Unknown không khớp CCF A/online | PASS |
| F04 | Không sửa catalog gốc | Lọc mảng frozen thành công | Nhận `ai`, input giữ nguyên | PASS |
| D01 | Kind any/abstract/paper | Chọn đúng loại deadline | `abstract`, `abstract`, `paper` | PASS |
| D02 | Biên cửa sổ ngày | `now` bị loại, biên cuối được nhận | Chỉ nhận deadline đúng `now + 7 ngày` | PASS |
| D03 | TBA/date-only/estimated | Giữ unknown ở window all, loại khỏi window ngày | 3 unknown ở all; 0 ở window 7 | PASS |
| D04 | Nhiều round và mốc hết hạn | Chuyển round, cập nhật count, clamp page | r1 → r2; 13/page2 → 0/page1 | PASS |
| S01 | Sort ổn định | Tie theo ID, không sửa input | `a`, `b`; input vẫn `b`, `a` | PASS |
| U01 | State URL | Canonical, bỏ trùng/sai, params lặp | State và URL đúng thứ tự | PASS |
| P01 | 0/1/12/13 và page quá lớn | Đúng item/page/clamp | `[0,1,1,2,1,2]` | PASS |

## 3. Kết quả với catalog thật

| Thuộc tính | Actual |
|---|---:|
| Tổng số edition trong snapshot | 2.346 |
| Kết quả mặc định tại mốc test | 203 |
| Kết quả trong 7 ngày | 12 |
| AI hoặc SE + CCF A + paper + 30 ngày | 2 |
| Deadline tương lai gần nhất | `2026-11-10T11:59:59.000Z` |

Trang trình duyệt hiển thị đúng 12 card ở trang đầu, range `1–12` và pager `Trang 1/17`.

## 4. State giao diện và responsive

| Trường hợp | Actual | Kết quả |
|---|---|:--:|
| Loading với request snapshot đang chờ | Có tiêu đề “Đang tải dữ liệu” và skeleton | PASS |
| Empty | Có thông báo, nút “Đặt lại bộ lọc”, không có pager | PASS |
| Error khi live API và snapshot cùng lỗi | Có role error và nút “Thử lại” | PASS |
| Retry sau khi nguồn hoạt động lại | Tải lại và hiển thị 12 card | PASS |
| Responsive 360px | Không tràn ngang, layout một cột | PASS |
| Responsive 768px | Không tràn ngang, layout một cột | PASS |
| Responsive 1366px | Không tràn ngang, sidebar 290px và vùng kết quả | PASS |

## 5. File thay đổi

- `site/js/pages/explore-state.js`: tìm deadline tương lai gần nhất bằng helper TV1.
- `site/js/pages/conference-list.js`: đặt một timer đúng mốc deadline, render lại và clamp page; bổ sung retry khi loader lỗi.
- `docs/t3-tv3-deadline-state-test-report.md`: expected/actual và bằng chứng kiểm thử.

## 6. Kết luận

Các case Q01/F01–F04/D01–D04/S01/U01/P01 và các state trình duyệt đều đạt. Trước khi chuyển Done cần gắn link commit hoặc Pull Request và nhờ TV1 review cách dùng `getNextSubmission`/`futureDeadlines`.
