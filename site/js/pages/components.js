// TV2: tương tác của trang demo component. Không có logic nghiệp vụ, không dùng dữ liệu catalog.
import { initCommonUI } from '../common.js';
import { showState } from '../ui/state.js';

initCommonUI('components');

// chip và nút icon: bật/tắt aria-pressed
for (const button of document.querySelectorAll('[data-demo-toggle]')) {
  button.addEventListener('click', () => {
    button.setAttribute('aria-pressed', String(button.getAttribute('aria-pressed') !== 'true'));
  });
}

// chip bộ lọc đang áp dụng: bấm để bỏ
for (const button of document.querySelectorAll('[data-demo-remove]')) {
  button.addEventListener('click', () => button.remove());
}

// nút đang xử lý: chỉ để xem giao diện, tự trở lại sau 1,5 giây
const busyButton = document.querySelector('[data-demo-busy]');
busyButton.addEventListener('click', () => {
  const label = busyButton.textContent;
  busyButton.setAttribute('aria-busy', 'true');
  busyButton.disabled = true;
  busyButton.textContent = 'Đang xử lý…';
  setTimeout(() => {
    busyButton.removeAttribute('aria-busy');
    busyButton.disabled = false;
    busyButton.textContent = label;
  }, 1500);
});

// ba trạng thái dùng đúng hàm showState mà các trang gọi
showState(document.querySelector('#demo-state-loading'), {
  kind: 'loading', title: 'Đang tải dữ liệu', message: 'Vui lòng chờ trong giây lát.',
});
const errorHost = document.querySelector('#demo-state-error');
function showDemoError() {
  showState(errorHost, {
    kind: 'error', title: 'Không tải được dữ liệu', message: 'Kiểm tra kết nối mạng rồi thử lại.',
    // demo: Thử lại chuyển sang đang tải rồi quay về lỗi để xem lại hai trạng thái
    action: { label: 'Thử lại', onClick: () => {
      showState(errorHost, { kind: 'loading', title: 'Đang tải lại', message: 'Vui lòng chờ.' });
      setTimeout(showDemoError, 1200);
    } },
  });
}
showDemoError();
showState(document.querySelector('#demo-state-empty'), {
  kind: 'empty', title: 'Chưa có hội nghị phù hợp', message: 'Thử bỏ bớt bộ lọc hoặc xem toàn bộ danh sách.',
  action: { label: 'Xem tất cả hội nghị', href: 'lich-hoi-nghi.html' },
});
