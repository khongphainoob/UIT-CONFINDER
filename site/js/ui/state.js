// TV2 quản lý style/contract; chủ từng trang gọi khi trạng thái thay đổi.
export function showState(host, { kind = 'empty', title, message }) {
  if (!host) throw new Error('Thiếu vùng hiển thị trạng thái.');
  const box = document.createElement('section');
  box.className = 'state';
  box.dataset.state = kind;
  if (kind === 'error') box.setAttribute('role', 'alert');
  if (kind === 'loading') box.setAttribute('role', 'status');
  const heading = document.createElement('h2');
  heading.textContent = title;
  const text = document.createElement('p');
  text.textContent = message;
  box.append(heading, text);
  host.replaceChildren(box);
}
