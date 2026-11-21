# T3-TV1-02 — Báo cáo hoàn thiện Nhãn nguồn, Dữ liệu cũ và Detail States (TV1)

Tài liệu này ghi lại kết quả hoàn thiện và đối chiếu kỳ vọng (`expected`) / thực tế (`actual`) cho Task `T3-TV1-02` của Thành viên 1 (TV1): "Chốt quality, dữ liệu cũ và detail states" — hoàn thiện phân loại nhãn nguồn (`verified` chỉ khi có `verifiedAt`, phân biệt `estimated`, `tba`, `unverified`), logic stale nội bộ 30 ngày từ lần kiểm nguồn thật (`checkedAt`), hoàn thiện các trạng thái `loading`, `error`, `retry`, `missing ID`, chuẩn hóa CSS chi tiết hội nghị và phối hợp cùng module TV4 đổi mốc xuất lịch đúng `deadlineId`.

---

## 1. Thông tin task

| Thuộc tính | Giá trị |
|---|---|
| **Mã task** | `T3-TV1-02` (Chốt quality, dữ liệu cũ và detail states) |
| **Người thực hiện** | Huy Lê Phạm Gia (TV1) |
| **Nhánh** | `feat/t3-tv1-02-detail-states` |
| **Phạm vi hoàn thiện** | `site/js/data-adapter.js`, `site/js/deadline-utils.js`, `site/js/pages/conference-detail.js`, `site/css/pages/conference-detail.css`, `site/conference.html` |
| **Hình thức đánh giá** | Đối chiếu tiêu chí nghiệp vụ, kiểm tra giao diện và tích hợp module TV4 |
| **Đánh giá kết quả** | **Đạt chuẩn toàn bộ tiêu chí (PASS)** |

---

## 2. Bảng đối chiếu chi tiết Expected vs Actual

| Mã ca | Tiêu chí | Kỳ vọng (Expected) | Thực tế (Actual) | Đánh giá |
|:---:|---|---|---|:---:|
| **QC01** | Verified chỉ khi có `verifiedAt` | Có `verifiedAt` hợp lệ mới hiển thị `Verified` (tím mận + icon check) | `resolveDeadlineQuality` trả `'verified'`, icon check | **PASS** |
| **QC02** | Thiếu `verifiedAt` hạ về Chưa đối chiếu | Nếu không có `verifiedAt`, tự động hạ cấp về `Chưa đối chiếu` (`unverified`) | `resolveDeadlineQuality` trả `'unverified'`, icon help | **PASS** |
| **QC03** | Kế thừa `verifiedAt` từ edition | Deadline không có `verifiedAt` riêng nhưng edition có thì vẫn được công nhận | Kế thừa chính xác từ `edition.verifiedAt` | **PASS** |
| **QC04** | Phân biệt rõ ràng mốc Estimated | Mốc ước tính hiển thị nhãn `Estimated` kèm icon approx | Trả `'estimated'`, icon approx | **PASS** |
| **QC05** | Phân biệt rõ ràng mốc TBA | Mốc chưa rõ ngày giờ hiển thị nhãn `TBA` kèm icon pause | Trả `'tba'`, icon pause | **PASS** |
| **QC06** | Mốc chưa đối chiếu (mặc định) | Dữ liệu CCFDDL chưa xác minh trực tiếp hiển thị `Chưa đối chiếu` | Trả `'unverified'`, icon help | **PASS** |
| **ST01** | Stale nội bộ khi `checkedAt` quá 30 ngày | Quá 30 ngày kể từ lần kiểm nguồn thật: gắn class `.data-notice--stale` và chip cảnh báo nguồn cũ | `isStale = true`, chip `Nguồn đã cũ (>30 ngày)` | **PASS** |
| **ST02** | Dữ liệu còn mới trong 30 ngày | Lần kiểm nguồn thật trong vòng 30 ngày: hiển thị chip xanh đã kiểm gần đây | `isStale = false`, chip `Đã kiểm nguồn trong vòng 30 ngày` | **PASS** |
| **ST03** | Thiếu ngày kiểm có nhãn riêng biệt | Không có `checkedAt`: hiển thị nhãn riêng `Chưa kiểm chứng nguồn thật`, không đánh đồng với stale 30 ngày | `status: 'unverified-source'`, nhãn và chip riêng biệt | **PASS** |
| **ST04** | Không dùng `fetchedAt`/`loadedAt` tính stale | Tuyệt đối không tính stale theo ngày chụp snapshot hay ngày nạp trình duyệt | Chỉ căn cứ vào `checkedAt` | **PASS** |
| **UI01** | Trạng thái Loading | Hiển thị khung xương skeleton với `role="status"` khi đang tải dữ liệu | Hiển thị `.state--loading` | **PASS** |
| **UI02** | Xử lý Missing ID | Vào `conference.html` không có `?id=` hiển thị thông báo kèm link về Khám phá | Hiển thị "Chưa chọn kỳ hội nghị" + link Khám phá | **PASS** |
| **UI03** | Xử lý Invalid ID | Mã hội nghị không tồn tại hiển thị thông báo không tìm thấy | Hiển thị "Không tìm thấy kỳ hội nghị" + link Khám phá | **PASS** |
| **UI04** | Xử lý Error & Nút Thử lại | Khi lỗi mạng hiển thị alert kèm nút Thử lại gọi `initPage({ forceReload: true })` | Hiển thị `.state--error` + nút Thử lại nạp lại dữ liệu tươi | **PASS** |
| **UI05** | Chuẩn hóa CSS detail theo DESIGN | Bỏ viền dày 4–6px ở highlight/warning/selected; thay `#fff1f1` bằng `var(--color-danger-bg)` | Viền mảnh 1px chuẩn, không viền dày, responsive mượt mà | **PASS** |
| **CAL01** | Xuất lịch đúng deadlineId đã chọn | Mở Google Calendar / tải file ICS mang đúng mốc đã chọn và múi giờ chuẩn GMT+7/UTC | UID và summary chứa chính xác `edition.id` và `deadline.id` | **PASS** |
| **CAL02** | Đổi mốc cập nhật xuất lịch tức thì | Click chọn mốc khác hoặc đổi `deadlineId` trên URL, Highlight box và nút xuất lịch cập nhật theo | Đồng bộ tức thì sang mốc mới, URL cập nhật sạch | **PASS** |
| **CAL03** | Từ chối xuất lịch mốc Estimated / TBA | Mốc Estimated/TBA bị disable trên UI; helper TV4 từ chối kèm lý do rõ ràng | Nút bị vô hiệu hóa kèm tooltip giải thích lý do | **PASS** |

---

## 3. Kết luận nghiệm thu

1. **Nhãn nguồn dữ liệu nhất quán:**
   - Chuẩn hóa toàn diện 4 cấp độ chất lượng dữ liệu: `Verified` (chỉ khi có `verifiedAt`), `Estimated`, `TBA` và `Chưa đối chiếu` (`unverified`).
   - Mốc thiếu `verifiedAt` tuyệt đối không được hiển thị là `Verified`.
2. **Cơ chế Stale nội bộ chính xác:**
   - Chỉ tính chu kỳ 30 ngày từ `checkedAt` (lần kiểm nguồn thật), tách biệt hoàn toàn với `fetchedAt` (thời điểm chụp snapshot) và `loadedAt` (thời điểm nạp trang).
   - Trường hợp thiếu ngày kiểm có nhãn riêng: `Chưa kiểm chứng nguồn thật`.
3. **Hoàn thiện UI/UX & Phối hợp module TV4:**
   - Trang chi tiết hỗ trợ đầy đủ các trạng thái `loading`, `error` (kèm nút Thử lại nạp lại dữ liệu tươi), `missing ID` và `invalid ID`.
   - CSS chi tiết được chuẩn hóa theo hệ thiết kế "Thẻ đeo hội nghị": dẹp bỏ viền dày 4–6px, thay thế bằng border 1px và token màu chuẩn `var(--color-danger-bg)`.
   - Tích hợp mượt mà với TV4: khi người dùng đổi mốc deadline trên giao diện hoặc qua query parameter `deadlineId`, hệ thống lập tức cập nhật Highlight box và xuất lịch chính xác theo đúng mốc đã chọn.
