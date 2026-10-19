import { initCommonUI } from '../common.js';
initCommonUI('home');
import { getCatalog } from '../data-service.js';
import { showState } from '../ui/state.js';

const host = document.querySelector('#page-content');
async function initPage() {
  showState(host, { kind: 'loading', title: 'Đang tải dữ liệu', message: 'Vui lòng chờ.' });
  try {
    const catalog = await getCatalog();
    // TODO chủ trang: lưu catalog vào state trang, tự render theo chức năng.
    // Home: tối đa 6 hạn tương lai. Explore: filter -> sort -> paginate -> render.
    showState(host, { title: 'Chưa có nội dung hiển thị', message: 'Vui lòng quay lại sau.' });
  } catch (error) {
    showState(host, { kind: 'error', title: 'Không tải được dữ liệu', message: error.message });
  }
}
initPage();
