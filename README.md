# UIT ConFinder — Website tra cứu hội nghị khoa học

Đồ án môn **IE104 — Internet và Công nghệ Web**  
Trường Đại học Công nghệ Thông tin — ĐHQG TP.HCM

UIT ConFinder là website hỗ trợ tìm kiếm và theo dõi thông tin hội nghị khoa học. Người dùng có thể tra cứu theo lĩnh vực, xếp hạng, hình thức tổ chức và hạn nộp bài; xem thông tin từng kỳ hội nghị, lưu các hội nghị quan tâm và xuất deadline sang lịch cá nhân.

> Repository đang trong quá trình phát triển. Các chức năng bên dưới mô tả phạm vi dự kiến; trạng thái hoàn thành được cập nhật trong Task Tracker và qua kết quả kiểm thử.

## 1. Thông tin đồ án

| Nội dung | Thông tin |
|---|---|
| Tên đồ án | UIT ConFinder — Website tra cứu hội nghị khoa học |
| Môn học | IE104 — Internet và Công nghệ Web |
| Lớp | [Điền mã lớp] |
| Giảng viên hướng dẫn | TS Võ Tấn Khoa |
| Nhóm thực hiện | [Nhóm 2] |
| Học kỳ / Năm học | [2026-2027 (Học Kỳ 5)] |
| Website demo | [Bổ sung sau khi triển khai] |

## 2. Thành viên tham gia

| Vai trò | Họ và tên | MSSV | Phụ trách chính |
|---|---|---|---|
| Thành viên 1 | Lê Phạm Gia Huy| [24520668] | Dữ liệu, API/adapter, deadline và trang chi tiết hội nghị |
| Thành viên 2 | Nguyễn Huy Hoàng | 24520555 | Bộ giao diện chung, trang chủ và trang giới thiệu dữ liệu |
| Thành viên 3 | Phạm Nguyễn Nhật Huy | 24520691 | Trang khám phá, tìm kiếm, bộ lọc, sắp xếp và phân trang |
| Thành viên 4 | Trương Huy Hoàng | 24520574 | Trang đã lưu, LocalStorage, Calendar/ICS và tích hợp sản phẩm |(Nhóm trưởng)

**Nguyên tắc thực hiện:**

- Mỗi thành viên tự xây dựng HTML, CSS responsive và JavaScript cho phần việc của mình.
- Thành viên 2 thiết lập một bộ chuẩn giao diện chung để cả nhóm sử dụng.
- Các module dữ liệu, deadline, lưu hội nghị và xuất lịch có cách gọi thống nhất.
- Mỗi thành viên tự kiểm thử, viết phần báo cáo và giải thích được mã nguồn mình thực hiện.
- Các thay đổi được tích hợp thông qua Pull Request và review chéo.

## 3. Bối cảnh và mục tiêu

### 3.1. Bối cảnh

Thông tin hội nghị khoa học thường nằm ở nhiều nguồn và có cấu trúc khác nhau. Một hội nghị có thể có nhiều kỳ tổ chức, nhiều vòng nộp bài và các mốc riêng cho abstract, full paper hoặc thông báo kết quả.

Người dùng cần phân biệt được các mốc này, kiểm tra múi giờ và đối chiếu nguồn chính thức trước khi quyết định nộp bài.

### 3.2. Mục tiêu sản phẩm

- Tập trung thông tin hội nghị vào một giao diện dễ tra cứu.
- Hỗ trợ tìm hội nghị theo nhu cầu nghiên cứu và thời hạn nộp bài.
- Hiển thị rõ kỳ hội nghị, vòng nộp, loại deadline và múi giờ.
- Cung cấp đường dẫn đến nguồn chính thức để người dùng đối chiếu.
- Cho phép lưu hội nghị quan tâm và xuất deadline sang lịch cá nhân.
- Hoạt động thuận tiện trên máy tính, máy tính bảng và điện thoại.

### 3.3. Mục tiêu học tập

- Vận dụng HTML để xây dựng cấu trúc trang có ngữ nghĩa.
- Sử dụng CSS để thiết kế giao diện và xử lý responsive.
- Sử dụng JavaScript để quản lý trạng thái, thao tác DOM và xử lý sự kiện.
- Thực hành Fetch API, JSON, URL parameters và LocalStorage.
- Tổ chức mã nguồn theo module và phối hợp nhóm bằng Git/GitHub.
- Thực hiện kiểm thử, triển khai website và viết tài liệu kỹ thuật.

## 4. Đối tượng sử dụng

- Sinh viên tìm hiểu và chuẩn bị tham gia hội nghị khoa học.
- Học viên, nghiên cứu sinh và người nghiên cứu cần theo dõi hạn nộp bài.
- Người dùng muốn lưu và quản lý các hội nghị quan tâm.

## 5. Phạm vi chức năng

### 5.1. Tìm kiếm và khám phá hội nghị

- Tìm theo tên đầy đủ hoặc tên viết tắt.
- Tìm kiếm không phân biệt chữ hoa, chữ thường và dấu tiếng Việt.
- Lọc theo:
  - Lĩnh vực nghiên cứu.
  - Xếp hạng CCF.
  - Xếp hạng CORE.
  - Hình thức Online, Offline hoặc Hybrid.
  - Loại hạn nộp: abstract hoặc full paper.
  - Deadline trong 7, 14, 30 hoặc 90 ngày.
  - Hiển thị thêm các kỳ đã hết hạn.
- Sắp xếp theo deadline, tên hoặc từng hệ xếp hạng.
- Hiển thị số kết quả và phân trang.
- Đồng bộ điều kiện tìm/lọc với URL.

### 5.2. Xem chi tiết hội nghị

- Hiển thị tên, năm tổ chức, lĩnh vực, xếp hạng và địa điểm/hình thức.
- Hiển thị các vòng nộp và các loại mốc thời gian.
- Hiển thị giờ nguồn và giờ quy đổi GMT+7 khi dữ liệu đủ chính xác.
- Đếm ngược đến deadline và thể hiện trạng thái hết hạn.
- Hiển thị nguồn, lần kiểm tra dữ liệu và cảnh báo dữ liệu cũ.
- Cung cấp link CFP, hướng dẫn tác giả và template khi nguồn có thông tin.

### 5.3. Lưu hội nghị quan tâm

- Lưu hoặc bỏ lưu từng kỳ hội nghị.
- Xem danh sách hội nghị đã lưu.
- Giữ danh sách sau khi tải lại trang bằng LocalStorage.
- Thông báo khi dữ liệu lưu bị lỗi hoặc một ID không còn trong catalog.

### 5.4. Xuất deadline sang lịch

- Tạo liên kết mở biểu mẫu Google Calendar.
- Tải file `.ics` cho deadline được chọn.
- Xuất đúng kỳ hội nghị, vòng nộp và mốc thời gian đang xem.
- Không xuất các mốc thiếu giờ/múi giờ hoặc chỉ mang tính ước lượng.

### 5.5. Giao diện và trải nghiệm

- Responsive trên nhiều kích thước màn hình.
- Có trạng thái đang tải, lỗi và không có kết quả.
- Có label, trạng thái focus và hỗ trợ thao tác bàn phím.
- Sử dụng thống nhất màu sắc, typography, spacing và component.

### 5.6. Ngoài phạm vi phiên bản chính

- Đăng nhập và đồng bộ tài khoản.
- Backend và hệ quản trị cơ sở dữ liệu riêng.
- Gửi email hoặc thông báo tự động.
- Thu thập dữ liệu toàn web bằng crawler.
- Phân tích nội dung bài báo hoặc kiểm tra đạo văn.

Blog và chuyển đổi giao diện sáng/tối là chức năng bổ sung, được cân nhắc sau khi hoàn thiện luồng chính.

## 6. Các trang chính

| Trang | Đường dẫn | Nội dung |
|---|---|---|
| Trang chủ | `index.html` | Giới thiệu, tìm nhanh và các deadline sắp tới |
| Khám phá | `lich-hoi-nghi.html` | Tìm kiếm, lọc, sắp xếp và phân trang |
| Chi tiết | `hoi-nghi.html?id=...` | Thông tin một kỳ hội nghị và các deadline |
| Đã lưu | `da-luu.html` | Danh sách hội nghị người dùng đã lưu |
| Giới thiệu dữ liệu | `gioi-thieu.html` | Nguồn, cách cập nhật, hướng dẫn và liên hệ |

`components.html` là trang thử giao diện dùng trong quá trình phát triển.

## 7. Công nghệ sử dụng

| Công nghệ | Mục đích |
|---|---|
| HTML5 | Cấu trúc và nội dung trang |
| CSS3 | Giao diện, component và responsive |
| JavaScript ES Modules | Chia module, xử lý dữ liệu và tương tác |
| Fetch API | Tải dữ liệu JSON |
| LocalStorage | Lưu danh sách hội nghị trên trình duyệt |
| Git / GitHub | Quản lý phiên bản và review mã nguồn |
| GitHub Pages | Phương án triển khai website tĩnh |
| Python HTTP Server | Chạy website trong môi trường phát triển local |

Website sử dụng HTML, CSS và JavaScript thuần. Python chỉ phục vụ chạy HTTP local, không phải backend của sản phẩm.

## 8. Kiến trúc và tổ chức mã nguồn

### 8.1. Kiến trúc

Mã nguồn được chia thành ba phần:

1. **Giao diện:** HTML và CSS của từng trang.
2. **Xử lý trang:** quản lý trạng thái, sự kiện và render trong `js/pages/`.
3. **Module dùng chung:** dữ liệu, deadline, lưu hội nghị và xuất lịch.

Luồng dữ liệu:

**API hoặc snapshot → chuẩn hóa dữ liệu → xử lý trang → render giao diện.**

Các trang sử dụng cùng model dữ liệu và cùng quy tắc chọn deadline.

### 8.2. Thư mục chính

| Đường dẫn | Nội dung |
|---|---|
| `site/` | Mã nguồn website |
| `site/css/tokens.css` | Màu sắc, font, spacing và biến dùng chung |
| `site/css/base.css` | Style nền và quy tắc chung |
| `site/css/components.css` | Button, input, card, badge và trạng thái |
| `site/css/pages/` | CSS riêng của từng trang |
| `site/js/pages/` | JavaScript xử lý từng trang |
| `site/js/ui/` | Hàm giao diện dùng chung |
| `site/js/data-service.js` | Tải catalog và xử lý phương án dữ liệu |
| `site/js/data-adapter.js` | Chuẩn hóa dữ liệu nguồn |
| `site/js/deadline-utils.js` | Xử lý deadline dùng chung |
| `site/js/saved-store.js` | Đọc và ghi danh sách đã lưu |
| `site/js/calendar-export.js` | Tạo Google Calendar URL và nội dung ICS |
| `site/data/` | Snapshot JSON đã chuẩn hóa |
| `site/assets/` | Hình ảnh và tài nguyên |
| `docs/` | Tài liệu kiến trúc, phân công và kiểm thử |
| `tools/` | Công cụ hỗ trợ phát triển |

## 9. Dữ liệu và nguyên tắc xử lý

### 9.1. Phương án dữ liệu

Website sử dụng catalog JSON, với phương án:

- Lấy dữ liệu từ nguồn GET khi đã kiểm tra được khả năng truy cập và cấu trúc phản hồi.
- Chuẩn hóa dữ liệu qua adapter.
- Sử dụng snapshot JSON dự phòng khi nguồn live không khả dụng.
- Hiển thị rõ nguồn và chế độ dữ liệu đang sử dụng.

Nguồn được khảo sát trong đồ án:

- CCFDDL: https://ccfddl.com/
- CFP và website chính thức của từng hội nghị.

### 9.2. Quy tắc quan trọng

- Một mục hiển thị hoặc một lượt lưu tương ứng với một kỳ hội nghị.
- Không dùng tên viết tắt làm định danh duy nhất cho mọi năm.
- Phân biệt ngày diễn ra hội nghị với hạn nộp bài.
- Phân biệt abstract, paper và các mốc khác.
- Không tự điền giờ hoặc múi giờ cho dữ liệu chưa đầy đủ.
- Không tự đánh dấu “đã kiểm chứng” chỉ vì tải dữ liệu thành công.
- Deadline dùng để lọc, đếm ngược và xuất lịch phải nhất quán.
- Các mốc TBA, chỉ có ngày hoặc ước lượng phải được ghi nhãn rõ.

Danh sách đã lưu nằm trên trình duyệt và thiết bị hiện tại; không tự đồng bộ giữa các tài khoản hoặc thiết bị.

## 10. Hướng dẫn chạy local

### 10.1. Chuẩn bị

- Trình duyệt hiện đại.
- Python 3 nếu sử dụng công cụ chạy local đi kèm.
- Git nếu làm việc với repository.

### 10.2. Khởi chạy

Clone hoặc tải mã nguồn, sau đó mở Terminal tại thư mục gốc của repository.

Trên Windows:

```powershell
py tools/serve.py
```

Trên macOS/Linux:

```bash
python3 tools/serve.py
```

Truy cập:

```text
http://127.0.0.1:5500
```

Trang thử component:

```text
http://127.0.0.1:5500/components.html
```

Nhấn `Ctrl+C` để dừng server.

> Chạy website qua HTTP local để sử dụng ES Modules và Fetch. Không mở trực tiếp HTML bằng `file://`.

## 11. Quy trình làm việc nhóm

1. Nhận task trong Notion và kiểm tra đầu ra/phụ thuộc.
2. Cập nhật nhánh `main`.
3. Tạo branch theo mã task.
4. Thực hiện phần việc và tự kiểm thử.
5. Commit, push và mở Pull Request.
6. Gắn link task, mô tả thay đổi và bằng chứng kiểm thử.
7. Review chéo, sửa góp ý và tích hợp.

Ví dụ tạo branch:

```bash
git switch main
git pull --ff-only origin main
git switch -c feat/t1-tv3-explore-shell
```

Quy ước tên branch:

```text
feat/<ma-task>-<noi-dung>
fix/<ma-task>-<noi-dung>
docs/<noi-dung>
```

Review chéo:

- Thành viên 1 ↔ Thành viên 3.
- Thành viên 2 ↔ Thành viên 4.

Thay đổi cấu trúc dữ liệu hoặc module dùng chung phải cập nhật tài liệu và được người sử dụng module đó review.

## 12. Kiểm thử và điều kiện hoàn thành

Các nhóm kiểm thử chính:

- Tìm kiếm và tổ hợp bộ lọc.
- Sắp xếp, phân trang và số lượng kết quả.
- URL, tải lại trang, Back và Forward.
- ID không hợp lệ hoặc dữ liệu thiếu.
- Nhiều round và nhiều loại deadline.
- Timezone, chuyển ngày và trạng thái hết hạn.
- TBA, dữ liệu ước lượng và dữ liệu cũ.
- Lưu/bỏ lưu, tải lại trang và lỗi LocalStorage.
- Tạo lịch và nhập thử file ICS.
- Responsive tại 360px, 768px và 1366px.
- Bàn phím, label, focus và các trạng thái giao diện.

Một task được chuyển sang **Done** khi:

- Có đầu ra đúng phạm vi.
- Đáp ứng checklist nghiệm thu.
- Có kết quả kiểm thử thực tế và bằng chứng phù hợp.
- Được thành viên khác review.
- Tài liệu liên quan đã được cập nhật.

## 13. Kế hoạch thực hiện

| Thời gian | Mục tiêu nội bộ |
|---|---|
| 19–25/10/2026 | Setup nền chung, chốt contract và tự dựng các trang |
| 26/10–01/11/2026 | Nối dữ liệu và hoàn thiện luồng chính |
| 02–08/11/2026 | Hoàn thiện chức năng core và tích hợp |
| 09–11/11/2026 | Kiểm thử, sửa lỗi và chuẩn bị hồ sơ tiến độ |
| 12–17/11/2026 | Review, sửa góp ý và chốt bản trước 18/11 |
| Sau báo cáo tiến độ | Hoàn thiện theo feedback và lịch nộp chính thức |

Các mốc trên là kế hoạch nội bộ. Lịch báo cáo, bảo vệ và nộp cuối được đối chiếu với thông báo của môn học.

## 14. Tài liệu quản lý

- [Tổng quan đồ án](https://app.notion.com/p/5a6ae3a978f382428ca88142f8e10485)
- [Task Tracker](https://app.notion.com/p/bb3ae3a978f3832582f781206e1836c4)
- [Đặc tả trang, component và bộ lọc](https://app.notion.com/p/3fcae3a978f38142adede1448a000cdc)
- [Hợp đồng dữ liệu và module](docs/contracts.md)
- [Phân công mã nguồn](docs/ownership.md)
- [Hướng dẫn kiểm thử](docs/testing.md)

## 15. Tham khảo và ghi nhận đóng góp

- Nghiên cứu giao diện và tài liệu tham khảo: https://github.com/Hoagjaxz/uit-confinder
- JavaScript Modules: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules
- GitHub Pages: https://docs.github.com/en/pages

Nhóm ghi rõ nguồn tài nguyên, phần tham khảo, phần dùng chung và phần tự hiện thực trong báo cáo.

## 16. Liên hệ

- Đại diện nhóm: Trương Huy Hoàng
- Email: 24520574@gm.uit.edu.vn
- Repository: [URL CỦA NHÓM](https://github.com/khongphainoob/UIT-CONFINDER)
