// TV2 quản lý style/contract; chủ từng trang gọi khi trạng thái thay đổi.
// Tham khảo khối .state-box và khung xương .sk-line của Hoagjaxz/uit-confinder, site/css/states.css.
import { createIcon } from '../common.js';

const ICONS = { error: 'alert', empty: 'no-results' };

// kind: 'loading' | 'error' | 'empty'
// action (tuỳ chọn): { label, onClick } cho nút (vd. "Thử lại"), hoặc { label, href } cho liên kết (vd. "Xem tất cả hội nghị").
export function showState(host, { kind = 'empty', title, message, action } = {}) {
  if (!host) throw new Error('Thiếu vùng hiển thị trạng thái.');
  const box = document.createElement('section');
  box.className = `state state--${kind}`;
  if (kind === 'error') box.setAttribute('role', 'alert');
  if (kind === 'loading') box.setAttribute('role', 'status');

  if (ICONS[kind]) box.append(createIcon(ICONS[kind], 'icon state__icon'));
  const heading = document.createElement('h2');
  heading.textContent = title;
  const text = document.createElement('p');
  text.textContent = message;
  box.append(heading, text);

  if (kind === 'loading') {
    // khung xương chỉ để trang trí, trình đọc màn hình đọc tiêu đề ở trên
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton';
    skeleton.setAttribute('aria-hidden', 'true');
    for (const modifier of ['title', '', 'short']) {
      const line = document.createElement('span');
      line.className = modifier ? `skeleton-line skeleton-line--${modifier}` : 'skeleton-line';
      skeleton.append(line);
    }
    box.append(skeleton);
  }

  if (action) box.append(createAction(action));
  host.replaceChildren(box);
}

function createAction({ label, onClick, href }) {
  const actions = document.createElement('div');
  actions.className = 'state__actions';
  let control;
  if (href) {
    // chỉ nhận liên kết http/https hoặc đường dẫn tương đối trong site
    const url = new URL(href, location.href);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Liên kết hành động không hợp lệ.');
    control = document.createElement('a');
    control.href = href;
  } else {
    control = document.createElement('button');
    control.type = 'button';
    control.addEventListener('click', onClick);
  }
  control.className = 'button button--outline';
  control.textContent = label;
  actions.append(control);
  return actions;
}
