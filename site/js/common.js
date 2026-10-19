// TV2: chỉ shell UI. Không fetch dữ liệu, không lưu hội nghị ở đây.
const navigation = [
  ['home', 'Trang chủ', 'index.html'],
  ['explore', 'Khám phá', 'lich-hoi-nghi.html'],
  ['saved', 'Đã lưu', 'da-luu.html'],
  ['about', 'Dữ liệu & hướng dẫn', 'gioi-thieu.html'],
];

export function initCommonUI(currentPage) {
  const host = document.querySelector('[data-site-header]');
  if (host) {
    host.replaceChildren();
    const row = document.createElement('div');
    row.className = 'container header-row';
    const brand = document.createElement('a');
    brand.className = 'brand';
    brand.href = 'index.html';
    brand.textContent = 'UIT ConFinder';
    const toggle = document.createElement('button');
    toggle.className = 'button button--secondary menu-toggle';
    toggle.type = 'button';
    toggle.textContent = 'Menu';
    toggle.setAttribute('aria-controls', 'site-nav');
    toggle.setAttribute('aria-expanded', 'false');
    const nav = document.createElement('nav');
    nav.id = 'site-nav';
    nav.className = 'site-nav';
    nav.setAttribute('aria-label', 'Điều hướng chính');
    for (const [key, label, href] of navigation) {
      const link = document.createElement('a');
      link.href = href;
      link.textContent = label;
      if (key === currentPage) link.setAttribute('aria-current', 'page');
      nav.append(link);
    }
    const closeMenu = () => {
      nav.dataset.open = 'false';
      toggle.setAttribute('aria-expanded', 'false');
    };
    toggle.addEventListener('click', () => {
      const open = nav.dataset.open !== 'true';
      nav.dataset.open = String(open);
      toggle.setAttribute('aria-expanded', String(open));
    });
    nav.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && nav.dataset.open === 'true') {
        closeMenu();
        toggle.focus();
      }
    });
    row.append(brand, toggle, nav);
    host.append(row);
  }
  const footer = document.querySelector('[data-site-footer]');
  if (footer) {
    const text = document.createElement('p');
    text.className = 'container';
    text.textContent = 'UIT ConFinder · Tra cứu hội nghị khoa học';
    footer.replaceChildren(text);
  }
}
