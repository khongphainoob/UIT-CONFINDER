# T3-TV2 — Rà giao diện 5 trang và trạng thái Home/About (TV2)

Gộp T3-TV2-01 (rà responsive + component 5 trang) và T3-TV2-02 (chốt Home/About, trạng thái loading/empty/error/TBA).

## 1. Thông tin kiểm thử

| Thuộc tính | Giá trị |
|---|---|
| Người thực hiện | Nguyễn Huy Hoàng (TV2) |
| Nhánh / gốc | `fix/task-3-tv2-ui-review` từ `main` `bdb2ec0` |
| Ngày chạy | 08/11/2026 |
| Trình duyệt | Chromium (Playwright), server `py tools/serve.py` cổng 5500 |
| Cỡ khung nhìn | 360×800, 768×1024 (đo ở chiều cao 800), 1366×800 |
| Dữ liệu | Live CCFDDL (`https://ccfddl.com/conference/allconf.json`), 2354 kỳ hội nghị |
| Cách giả lập | Chặn/làm chậm request `fetch` bằng `page.route`; cố định đồng hồ bằng `page.clock`; không sửa code để test |
| Reviewer | TV4 (chưa review) |

## 2. Responsive: 6 trang × 3 cỡ

Đạt khi `scrollWidth <= clientWidth`, header đúng `aria-current`, nút menu chỉ hiện dưới 48rem.

| Trang | 360 | 768 | 1366 | Ghi chú |
|---|---|---|---|---|
| `index.html` | Đạt | Đạt | Đạt | |
| `conferences.html` | Đạt | Đạt | Đạt | 1366 vẫn 2 cột (quy ước ≥1024 là 3 cột) → P7 |
| `conference.html?id=pacificvis27` | **Lỗi → đã sửa** | Đạt | Đạt | Trước sửa: rộng 377px trong khung 360. Gốc: `.button` chung có `white-space: nowrap`, nhãn "Truy cập trang chính thức để xem CFP" (327px) nong cột lưới `main.stack`. Sau sửa: không tràn, không nút nào ở 6 trang bị xuống 2 dòng |
| `saved.html` (0 mục) | Đạt | Đạt | Đạt | |
| `saved.html` (2 mục) | Đạt | Đạt | Đạt | |
| `about.html` | Đạt | Đạt | Đạt | |
| `components.html` | Đạt | Đạt | Đạt | Checkbox/radio cao 20px nằm trong nhãn 44px |

Vùng chạm: link footer cao 32px ở ≥48rem khi dùng chuột (`pointer: fine`), cố ý từ PR #6; màn cảm ứng vẫn 44px.

## 3. Bàn phím và Console (360px, 6 trang)

| Case | Expected | Actual |
|---|---|---|
| Tab đầu tiên | Vào skip link "Đến nội dung chính" | Đạt cả 6 trang |
| Enter trên skip link | Focus `#main` | Đạt cả 6 trang |
| Enter trên nút menu | `aria-expanded="true"`, Tab tiếp vào `nav` | Đạt cả 6 trang |
| Escape | `aria-expanded="false"`, focus về nút menu | Đạt cả 6 trang |
| Focus trên footer nền mực | Vòng focus thấy được | `2px solid` màu giấy `#f1eff5` |
| Console | Không lỗi import/MIME | 0 lỗi ở 4 trang có favicon; `saved.html`, `conferences.html` còn 404 `/favicon.ico` → P6 |
| `prefers-reduced-motion: reduce` | Home không có màn tải | Không có `.home-loader` |

## 4. Trạng thái Home và About

| Case | Cách tạo | Expected | Actual Home | Actual About (thẻ ví dụ) |
|---|---|---|---|---|
| Loading | Giữ request dữ liệu 3s | `role="status"` | "Đang tải dữ liệu" | "Đang tải thẻ ví dụ" |
| Error | Chặn mọi request dữ liệu (live + snapshot) | `role="alert"` + nút Thử lại; bỏ chặn bấm Thử lại thì hồi phục | Đạt; sau Thử lại hiện 7 link chi tiết, hết alert | Đạt; sau Thử lại hết alert |
| Empty | Đồng hồ `2035-01-01` | Thông báo + link "Xem tất cả hội nghị" | "Chưa có hạn nộp sắp tới" + link → `conferences.html` | "Hiện không có mốc nào còn hạn" + link; số liệu ghi "0 mốc nộp còn hạn" |
| Nhãn chất lượng | Dữ liệu live | Icon + chữ theo `quality` | 6/6 hàng "Chưa đối chiếu" (dữ liệu live không có mốc `verified`/`estimated`) | Đủ 4 nhãn ở mục chú thích |
| TBA | — | Home chỉ lấy mốc có giờ chính xác nên không có hàng TBA (đúng thiết kế) | Không có chữ "NaN", "Invalid Date", "undefined" | `components.html` hiện đủ Verified/Estimated/TBA/Chưa đối chiếu |
| Ô tìm | Gõ `Hội nghị AI & ML` + Enter | `q` mã hoá đúng | `conferences.html?q=H%E1%BB%99i+ngh%E1%BB%8B+AI+%26+ML` | — |
| mailto | Đọc `href` (không gửi thư) | Tới `24520574@gm.uit.edu.vn` | — | Đúng địa chỉ, có sẵn tiêu đề + mẫu nội dung |

Chưa chạy: mở site dưới thư mục con `/ten-repo/`; zoom 200% (reflow); thử bằng trình đọc màn hình thật.

## 5. Phát hiện ở file thành viên khác (chủ trang tự sửa)

| # | Chủ | Chỗ | Vấn đề | Gợi ý |
|---|---|---|---|---|
| P1 | TV3, TV4 | `css/pages/conference-list.css:6`, `css/pages/saved.css:2-3` | `var(--color-muted)` không tồn tại (token đúng là `--color-mute`) → chữ phụ thành màu mực | Đổi thành `var(--color-mute)` |
| P2 | TV1, TV4 | `css/pages/conference-detail.css:101`, `css/pages/saved.css:14` | Mã màu `#fff1f1` viết thẳng | Dùng token mới `var(--color-danger-bg)` |
| P3 | TV1 | `css/pages/conference-detail.css:99,110,356` | Viền trái màu 4–6px, trái luật DESIGN "không viền trái/phải màu dày" | Viền 1px `--color-rule-strong` + icon |
| P4 | TV3, TV4 | `js/pages/conference-list.js:32`, `js/pages/saved.js:113` | State lỗi hiện thẳng `error.message`, không có nút Thử lại | `action: { label: 'Thử lại', onClick: <hàm tải lại> }` như Home |
| P5 | TV3, TV4 | `js/ui/edition-card.js`, `js/pages/saved.js:35` | Khám phá và Đã lưu dùng card thô, không theo thẻ đeo `.badge-card` → 3 kiểu card trên 5 trang | Nhóm quyết |
| P6 | TV3, TV4 | `conferences.html`, `saved.html` | Thiếu `<link rel="icon">` → 404 `/favicon.ico` | Chép 3 dòng `<link>` ở mục 6 |
| P7 | TV3 | `css/pages/conference-list.css:7` | Lưới card 2 cột ở 1366 | Thêm 3 cột từ 64rem nếu theo quy ước chung |
| P8 | TV3 | `conferences.html` | Đọc được `?q=` (CVPR → 7 kỳ) nhưng chưa có ô tìm/lọc/sắp xếp/phân trang trên trang | Theo F01–F05 |

## 6. Thay đổi của TV2 trong PR này

| File | Thay đổi |
|---|---|
| `site/css/components.css` | `.button` bỏ `white-space: nowrap`, thêm `text-align: center` (sửa tràn ngang trang Chi tiết 360px); thêm `.brand__logo` |
| `site/css/tokens.css` | Thêm `--color-danger-bg: #fff1f1` |
| `site/assets/` | Logo "chữ C đếm ngược": `logo-mark.svg`, `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png` |
| `site/js/common.js` | `createBrand({ withLogo })`: header có logo (alt rỗng), footer nền mực không có |
| `site/index.html`, `about.html`, `components.html` | Thay favicon data-URI tạm bằng 3 dòng: |

```html
<link rel="icon" href="assets/favicon-32.png" sizes="32x32" type="image/png"><link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="assets/apple-touch-icon.png">
```

Logo: ảnh phác tạo bằng công cụ AI theo ý tưởng của TV2, SVG viết lại có AI hỗ trợ; ghi trong phần khai báo AI của báo cáo.
