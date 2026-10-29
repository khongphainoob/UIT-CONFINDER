// TV2: chỉ shell UI (sprite icon, header, nav, menu mobile, footer). Không fetch dữ liệu, không lưu hội nghị ở đây.
import { ROUTES } from './routes.js';

// Tham khảo Hoagjaxz/uit-confinder: tools/chrome.mjs (khung header/footer, brand), site/js/nav.js (menu + Escape).

// Một mảng cấu hình nav duy nhất: [pageKey, nhãn, đường dẫn tương đối]. Trang chưa có thì xoá dòng tương ứng.
const navigation = [
  ['home', 'Trang chủ', ROUTES.home],
  ['explore', 'Hội nghị', ROUTES.conferences],
  ['saved', 'Đã lưu', ROUTES.saved],
  ['about', 'Dữ liệu & hướng dẫn', ROUTES.about],
];
const footerNote = 'Hãy kiểm tra lại trên trang chính thức của hội nghị trước khi nộp bài.';

// Sprite icon: chuỗi hằng do TV2 viết (không chứa dữ liệu nên được dùng insertAdjacentHTML).
// Path lấy từ sprite trong site/index.html của repo mẫu (nét giống bộ Lucide, giấy phép ISC);
// i-menu lấy từ tools/chrome.mjs; i-approx và i-help vẽ thêm cùng nét cho nhãn chất lượng dữ liệu.
const SPRITE = `<svg id="icon-sprite" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" style="position:absolute;width:0;height:0;overflow:hidden">
<symbol id="i-menu" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></symbol>
<symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></symbol>
<symbol id="i-x" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></symbol>
<symbol id="i-down" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></symbol>
<symbol id="i-left" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></symbol>
<symbol id="i-right" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></symbol>
<symbol id="i-star" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></symbol>
<symbol id="i-ext" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/></symbol>
<symbol id="i-refresh" viewBox="0 0 24 24"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8M21 3v5h-5M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16M8 16H3v5"/></symbol>
<symbol id="i-no-results" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3M8.5 8.5l5 5M13.5 8.5l-5 5"/></symbol>
<symbol id="i-alert" viewBox="0 0 24 24"><path d="m21.7 18-8-14a2 2 0 0 0-3.5 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z"/><path d="M12 9v4M12 17h.01"/></symbol>
<symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></symbol>
<symbol id="i-calendar" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></symbol>
<symbol id="i-check-circle" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></symbol>
<symbol id="i-x-circle" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></symbol>
<symbol id="i-check" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></symbol>
<symbol id="i-pause" viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></symbol>
<symbol id="i-approx" viewBox="0 0 24 24"><path d="M4 9c2.7-2.4 5.3-2.4 8 0s5.3 2.4 8 0M4 15c2.7-2.4 5.3-2.4 8 0s5.3 2.4 8 0"/></symbol>
<symbol id="i-help" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/></symbol>
</svg>`;

// Tạo một icon <svg class="icon"><use href="#i-..."></svg> bằng DOM API, dùng được khi render dữ liệu.
export function createIcon(name, className = 'icon') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', className);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `#i-${name}`);
  svg.append(use);
  return svg;
}

function createBrand() {
  const brand = document.createElement('a');
  brand.className = 'brand';
  brand.href = ROUTES.home;
  const accent = document.createElement('span');
  accent.className = 'brand__accent';
  accent.textContent = 'ConFinder';
  brand.append('UIT ', accent);
  return brand;
}

// Dựng <nav> từ danh sách [pageKey, nhãn, đường dẫn]; mục trùng `current` được đánh dấu aria-current.
function createNav(className, label, items, current) {
  const nav = document.createElement('nav');
  nav.className = className;
  nav.setAttribute('aria-label', label);
  for (const [key, text, href] of items) {
    const link = document.createElement('a');
    link.href = href;
    link.textContent = text;
    if (key === current) link.setAttribute('aria-current', 'page');
    nav.append(link);
  }
  return nav;
}

// pageKey: 'home' | 'explore' | 'detail' | 'saved' | 'about' | 'components'
export function initCommonUI(pageKey) {
  if (!document.getElementById('icon-sprite')) document.body.insertAdjacentHTML('afterbegin', SPRITE);
  // main nhận focus khi bấm skip link
  const main = document.getElementById('main');
  if (main && !main.hasAttribute('tabindex')) main.tabIndex = -1;
  // trang chi tiết thuộc nhánh Khám phá
  const current = pageKey === 'detail' ? 'explore' : pageKey;

  const host = document.querySelector('[data-site-header]');
  if (host) {
    const row = document.createElement('div');
    row.className = 'container header-row';

    const toggle = document.createElement('button');
    toggle.className = 'menu-toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-controls', 'site-nav');
    toggle.setAttribute('aria-expanded', 'false');
    const toggleText = document.createElement('span');
    toggleText.className = 'visually-hidden';
    toggleText.textContent = 'Mở menu';
    toggle.append(createIcon('menu'), toggleText);

    const nav = createNav('site-nav', 'Điều hướng chính', navigation, current);
    nav.id = 'site-nav';

    const setMenu = (open) => {
      nav.dataset.open = String(open);
      toggle.setAttribute('aria-expanded', String(open));
      toggleText.textContent = open ? 'Đóng menu' : 'Mở menu';
    };
    toggle.addEventListener('click', () => setMenu(nav.dataset.open !== 'true'));
    // Escape đóng menu và trả focus về nút, dù focus đang ở nút hay trong nav
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && nav.dataset.open === 'true') {
        setMenu(false);
        toggle.focus();
      }
    });

    row.append(createBrand(), toggle, nav);
    host.replaceChildren(row);
  }

  const footer = document.querySelector('[data-site-footer]');
  if (footer) {
    const row = document.createElement('div');
    row.className = 'container footer-row';
    // footer có thêm Trang chủ (nav trên đầu đã bỏ mục này vì brand dẫn về); không đánh dấu trang hiện tại
    const links = createNav('footer-nav', 'Liên kết chân trang', navigation, null);
    const note = document.createElement('p');
    note.className = 'footer-note';
    note.textContent = `${footerNote} Đồ án IE104 · UIT · Nhóm 2.`;
    row.append(createBrand(), links, note);
    footer.replaceChildren(row);
  }
}
