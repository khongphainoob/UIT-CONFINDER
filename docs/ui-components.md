# Bộ UI chung (TV2)

Tài liệu cho TV1/TV3/TV4 tự viết trang mình bằng bộ nền chung. Xem trực tiếp mọi component: chạy `py tools/serve.py`, mở `http://127.0.0.1:5500/components.html` (trang nội bộ, không có link trong nav).

Phong cách "Thẻ đeo hội nghị" (bảng màu Mận) tham khảo từ repo mẫu `Hoagjaxz/uit-confinder` (nhánh `ui-the-hoi-nghi-man`), viết lại theo tên và quy ước của nhóm. Icon trong sprite lấy từ repo mẫu (nét giống bộ Lucide, giấy phép ISC).

## 1. Khung `<head>` chuẩn

Chép nguyên khối này vào `<head>` trang mình; chỉ đổi `<title>`, CSS trang và script trang.

```html
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Tên trang · UIT ConFinder</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%235b2d9b'/%3E%3Ctext x='16' y='23' font-size='20' text-anchor='middle' fill='%23ffffff' font-family='system-ui,sans-serif' font-weight='700'%3EC%3C/text%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&display=swap">
<link rel="stylesheet" href="css/tokens.css"><link rel="stylesheet" href="css/base.css">
<link rel="stylesheet" href="css/components.css"><link rel="stylesheet" href="css/pages/ten-trang.css">
<script type="module" src="js/pages/ten-trang.js"></script>
```

Dòng `rel="icon"` là favicon nhúng sẵn (chữ C trên nền tím mận); thiếu nó trình duyệt sẽ tự gọi `/favicon.ico` và báo 404 trong Network. Font Google là tài nguyên ngoài (không phải thư viện); thiếu mạng thì trang tự dùng font hệ thống dự phòng. Luôn dùng đường dẫn tương đối (không bắt đầu bằng `/`) để chạy được dưới `/ten-repo/`.

## 2. Khung trang

```html
<body>
  <a class="skip-link" href="#main">Đến nội dung chính</a>
  <header class="site-header" data-site-header></header>
  <main id="main" class="container stack">
    <div class="page-head">
      <h1>Tiêu đề trang</h1>
      <p class="page-head__lead">Một câu nói trang này giúp làm gì.</p>
    </div>
    <!-- nội dung trang -->
  </main>
  <footer class="site-footer" data-site-footer></footer>
</body>
```

```js
import { initCommonUI } from '../common.js';
initCommonUI('explore'); // home | explore | detail | saved | about | components
```

`initCommonUI` chèn sprite icon, dựng header (dải dây hồng, brand, nav 3 mục, nút menu mobile) và footer; tự thêm `tabindex="-1"` cho `<main id="main">`. `detail` đánh dấu mục "Khám phá". Không xử lý nghiệp vụ.

## 3. Token (`css/tokens.css`)

Chỉ dùng token, không viết mã màu ở file khác. Đủ danh sách và chú thích trong `tokens.css`.

| Nhóm | Token |
|---|---|
| Màu vai trò | `--color-primary` (tím mận: link, focus, nút viền) · `--color-lanyard` (hồng: chỉ dải đỉnh trang, gạch nav) · `--color-ink` (mực) · `--color-ink-hover` |
| Nền / chữ phụ | `--color-paper` (nền trang) · `--color-card` · `--color-field` · `--color-mute` (chữ phụ) · `--color-dim` (chữ mờ, viền ô nhập) |
| Kẻ / tầng | `--color-rule` · `--color-rule-strong` · `--color-hover` · `--color-tint` · `--color-closed` |
| Ruy-băng | `--color-ribbon-core-a-star` · `--color-ribbon-a` · `--color-ribbon-b` · `--color-ribbon-c` · `--color-on-ribbon` |
| Mức khẩn | `--color-urgent-fg/-bg` · `--color-week-*` · `--color-month-*` · `--color-open-*` · `--color-expired-*` |
| Nguy hiểm | `--color-danger` (nút xoá, lỗi nhập) |
| Font | `--font-ui` · `--font-serif` (tên hội nghị, tiêu đề) · `--font-mono` (ngày, giờ, đếm ngược) |
| Cỡ chữ (rem) | `--text-label` 12 · `--text-xs` 13 · `--text-small` 14 · `--text-body` 16 · `--text-card-title` 19 · `--text-section` 22 · `--text-page` 28/34 · `--text-hero` 34–64 · `--text-deadline` 24 |
| Hình / khoảng cách | `--radius` 6px · `--radius-sm` 3px · `--space-1…6` = 4/8/12/16/24/32px |
| Bố cục | `--container` 1200px · `--gutter` 16/24px · `--control-height` 44px · `--z-header` · `--z-skip` |

Breakpoint (không đặt token được vì media query không đọc `var()`): `48rem` (768px) và `64rem` (1024px). Dưới 48rem: một cột, nav thu vào nút menu.

## 4. Quy ước class

- kebab-case, tiếng Anh ASCII: khối `.badge-card`, phần tử `.badge-card__name`, biến thể `.badge-card--closed`.
- Trạng thái dùng thuộc tính ARIA, không thêm class: `[aria-pressed=true]`, `[aria-current=page]`, `[aria-busy=true]`, `[aria-invalid=true]`, `[aria-disabled=true]`.
- Class tiện ích: `.container` `.stack` (lưới dọc cách 24px) `.inline` `.mono` `.visually-hidden` `.icon`.
- CSS riêng trang đặt trong `css/pages/ten-trang.css`, không sửa `components.css` (cần thêm thì mở PR nhỏ, báo TV2).

**Đổi tên so với starter (24/10):** `--color-accent` → `--color-primary`, `--color-surface` → `--color-card`, `--color-muted` → `--color-mute`, `--color-border` → `--color-rule`, `--font-body` → `--font-ui`; `.button--secondary` → `.button--outline`; `.notice` → `.data-notice`; `.badge` bỏ (dùng `.ribbon` / `.quality`); `.state[data-state]` → `.state--loading|error|empty`.

## 5. Component

### Icon

```html
<svg class="icon" aria-hidden="true"><use href="#i-search"/></svg>
```

Khi render bằng JS: `import { createIcon } from '../common.js'; el.append(createIcon('alert'));`.
Có sẵn: `menu search x down left right star ext refresh no-results alert clock calendar check-circle x-circle check pause approx help`. Cần icon mới thì báo TV2 thêm vào sprite. Không dùng emoji hay ký tự làm icon.

### Nút

```html
<button class="button" type="button">Primary</button>
<button class="button button--outline" type="button">Outline</button>
<button class="button button--ghost" type="button">Ghost</button>
<button class="button button--danger" type="button">Xoá khỏi Đã lưu</button>
<a class="button button--outline" href="https://...">Trang chính thức <svg class="icon" aria-hidden="true"><use href="#i-ext"/></svg></a>
```

Đang xử lý: trang tự đổi chữ, đặt `disabled` và `aria-busy="true"` (hiện vòng quay, tắt quay khi giảm chuyển động). Nút chỉ có icon dùng `.icon-button` và phải có `aria-label`:

```html
<button class="icon-button" type="button" aria-pressed="false" aria-label="Lưu ICSE 2027">
  <svg class="icon" aria-hidden="true"><use href="#i-star"/></svg>
</button>
```

### Ô nhập, chọn

```html
<label class="field">Tên hội nghị hoặc acronym
  <input type="search" name="q">
  <span class="field__hint">Tìm không phân biệt dấu.</span>
</label>
<label class="field">Email
  <input type="email" aria-invalid="true" aria-describedby="email-error">
  <span class="field__error" id="email-error"><svg class="icon" aria-hidden="true"><use href="#i-alert"/></svg>Nêu lỗi và cách sửa.</span>
</label>
<label class="option"><input type="checkbox" name="format" value="online"> Online</label>
<label class="option"><input type="radio" name="kind" value="paper"> Paper</label>
```

Luôn có label thật. Nhóm checkbox/radio đặt trong `<fieldset><legend>`.

### Nhóm lọc thu gọn (`<details>`)

```html
<details class="filter-group" open>
  <summary class="filter-group__summary">Lĩnh vực <svg class="icon filter-group__chevron" aria-hidden="true"><use href="#i-down"/></svg></summary>
  <div class="filter-group__body">
    <label class="option"><input type="checkbox" name="field" value="ai"> Trí tuệ nhân tạo</label>
  </div>
</details>
```

Dưới 48rem nên để các nhóm đóng (trừ nhóm đầu) cho danh sách không bị đẩy xuống xa; từ 48rem có thể mở hết. Việc đặt `open` theo bề rộng màn hình do trang Khám phá (TV3) tự viết. Bàn phím: Tab tới tiêu đề, Enter/Space để mở/đóng (trình duyệt tự làm).

### Chip lọc

```html
<button class="chip" type="button" aria-pressed="false"><span class="chip__face">Trí tuệ nhân tạo</span></button>
<button class="filter-chip" type="button">CORE A* <svg class="icon" aria-hidden="true"><use href="#i-x"/></svg><span class="visually-hidden">Bỏ lọc</span></button>
```

Nút 44px là vùng bấm, `.chip__face` 30px là phần nhìn thấy.

### Thẻ đeo hội nghị (chỉ style; mỗi trang tự render bằng DOM API)

```html
<ul class="badge-list">
  <li>
    <article class="badge-card">
      <div class="badge-card__main">
        <h3 class="badge-card__name"><a href="conference.html?id=...">ICSE 2027</a></h3>
        <p class="badge-card__full-name">Tên đầy đủ</p>
        <div class="badge-card__meta">
          <span class="ribbon ribbon--core-a-star">CORE A*</span>
          <span class="badge-card__place">Nơi tổ chức · Hybrid</span>
        </div>
      </div>
      <div class="badge-card__due">
        <span class="badge-card__due-label">Hạn nộp toàn văn</span>
        <time class="badge-card__date" datetime="...">11/10<small>/2026</small></time>
        <span class="badge-card__time">18:59 GMT+7</span>
        <span class="badge-card__time badge-card__time--source">Giờ nguồn 23:59 AoE</span>
        <span class="quality quality--verified"><svg class="icon" aria-hidden="true"><use href="#i-check"/></svg>Verified</span>
      </div>
      <div class="badge-card__state">
        <span class="urgency urgency--urgent"><svg class="icon" aria-hidden="true"><use href="#i-alert"/></svg>Gấp</span>
        <span class="badge-card__countdown">còn 2 ngày 4 giờ</span>
      </div>
      <!-- tuỳ chọn: <button class="icon-button badge-card__save" ...> -->
    </article>
  </li>
</ul>
```

- Thẻ **phải** nằm trong `<ul class="badge-list"><li>`: mỗi `<li>` là container, thẻ tự xếp theo bề rộng ô (≥ 40rem thành hàng ngang tên · hạn · trạng thái · lưu; hẹp hơn thì xếp dọc). Trang muốn lưới nhiều cột chỉ cần đặt `grid-template-columns` cho `.badge-list` trong CSS trang.
- Link tên phủ cả thẻ. Nút Lưu đặt **ngoài** link, là con trực tiếp của `article`.
- Hết hạn: thêm `badge-card--closed`, nhãn "Đã hết hạn", bỏ đếm ngược.
- Ghi rõ loại hạn ở `__due-label` ("Hạn nộp abstract", "Hạn nộp toàn văn"); không lẫn với ngày tổ chức.
- Dòng giờ nguồn chỉ hiện khi dữ liệu có giờ nguồn; date-only/TBA không tự thêm giờ.
- Đếm ngược tính một lần khi render, không `setInterval` từng giây, không đặt trong live region.
- Dữ liệu catalog gán bằng `textContent`, không `innerHTML`; URL chỉ nhận `http/https`.

### Ruy-băng rank

`<span class="ribbon ribbon--core-a-star">CORE A*</span>` · `ribbon--a` (CORE A, CCF A) · `ribbon--b` · `ribbon--c`. Luôn ghi tên hệ trong chữ; không bấm được như bộ lọc.

### Mức khẩn (icon + chữ)

| Mức | Class | Icon |
|---|---|---|
| Gấp (< 3 ngày) | `urgency--urgent` | `alert` |
| Trong tuần (< 7 ngày) | `urgency--week` | `clock` |
| Trong tháng (< 30 ngày) | `urgency--month` | `calendar` |
| Còn rộng (≥ 30 ngày) | `urgency--open` | `check-circle` |
| Đã hết hạn | `urgency--expired` | `x-circle` |

Ngưỡng ngày tính bằng helper của TV1, không tự viết lại.

### Nhãn chất lượng dữ liệu (theo `deadline.quality`)

| `quality` | Class | Icon | Chữ |
|---|---|---|---|
| `verified` | `quality--verified` (viền + chữ tím mận) | `check` | Verified |
| `estimated` | `quality--estimated` | `approx` | Estimated |
| `tba` | `quality--tba` | `pause` | TBA |
| `unverified` | `quality--unverified` | `help` | Chưa đối chiếu |

Không mượn màu mức khẩn. Không nâng thành Verified chỉ vì tải dữ liệu thành công.

### Thông báo nguồn dữ liệu (F38)

```html
<div class="data-notice">
  <svg class="icon" aria-hidden="true"><use href="#i-check"/></svg>
  <div class="data-notice__body">
    <p>Dữ liệu trực tiếp từ CCFDDL.</p>
    <p class="data-notice__meta">Tải lúc … · Kiểm chứng gần nhất …</p>
  </div>
</div>
```

Dữ liệu cũ / snapshot: thêm `data-notice--stale` và icon `alert`. Edition chưa từng kiểm chứng ghi "Chưa có lần kiểm chứng" ở đây. `fetchedAt` không được ghi như "đã kiểm chứng". Nội dung và chính sách "cũ" do TV1 quyết định.

### Trạng thái: `showState`

```js
import { showState } from '../ui/state.js';
showState(host, { kind: 'loading', title: 'Đang tải dữ liệu', message: 'Vui lòng chờ.' });
showState(host, { kind: 'error', title: 'Không tải được dữ liệu', message: 'Kiểm tra mạng rồi thử lại.',
  action: { label: 'Thử lại', onClick: loadPage } });
showState(host, { kind: 'empty', title: 'Chưa có hội nghị phù hợp', message: 'Thử bỏ bớt bộ lọc.',
  action: { label: 'Xem tất cả hội nghị', href: 'conferences.html' } });
```

`loading` có `role="status"` và khung xương (chỉ đổi opacity); `error` có `role="alert"`; `action` tuỳ chọn. Hàm thay toàn bộ nội dung của `host`.

### Phân trang (chỉ hiển thị; luật 12 edition/trang của TV3)

```html
<nav class="pager" aria-label="Phân trang">
  <p class="pager__summary">Trang 1 / 3</p>
  <ul class="pager__list">
    <li><button class="pager__item" type="button" disabled aria-label="Trang trước"><svg class="icon" aria-hidden="true"><use href="#i-left"/></svg></button></li>
    <li><a class="pager__item" href="?page=1" aria-current="page">1</a></li>
    <li><a class="pager__item" href="?page=2">2</a></li>
  </ul>
</nav>
```

### Khối nền

`.card`: khung trắng viền mảnh cho form, bảng, panel. Không đặt thẻ đeo bên trong `.card` (không lồng thẻ).

## 6. Điều cấm (từ hệ thiết kế)

Không bóng đổ, không hover nhấc lên, không chữ nghiêng, không gradient chữ hay kính mờ, không viền trái/phải màu dày, không nhãn nhỏ viết hoa trên tiêu đề, không số thứ tự mục (01/02), không ruy-băng đỏ/cam, không dùng hồng dây cho nút hay nền khối lớn, không slider/carousel/popup/animation nặng.

## 7. Checklist trước khi mở PR

- [ ] Chạy `py tools/serve.py`; Console và Network không lỗi/404.
- [ ] 360 / 768 / 1366px không tràn ngang; dưới 768px card một cột.
- [ ] Tab đi đúng thứ tự, focus nhìn thấy; `Escape` đóng menu; skip link tới `main`.
- [ ] Mọi ô nhập có label; nút icon có `aria-label`; nút bật/tắt có `aria-pressed`.
- [ ] Loading / error / empty / TBA đều có giao diện; không số liệu, ngày hay đếm ngược mẫu trong luồng chính.
- [ ] Chỉ dùng token; tương phản chữ ≥ 4.5:1 (đã kiểm cho các cặp token chuẩn).
