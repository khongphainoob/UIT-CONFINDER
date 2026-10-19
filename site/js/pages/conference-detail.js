import { initCommonUI } from '../common.js';
initCommonUI('detail');
import { getCatalog } from '../data-service.js';
import { showState } from '../ui/state.js';

const host = document.querySelector('#page-content');
async function initPage() {
  showState(host, { kind: 'loading', title: 'Đang tải dữ liệu', message: 'Vui lòng chờ.' });
  try {
    const catalog = await getCatalog();
    const editionId = new URLSearchParams(location.search).get('id');
    const edition = catalog.editions.find(item => item.id === editionId);
    if (!edition) {
      showState(host, { title: 'Không tìm thấy kỳ hội nghị', message: 'Chọn một hội nghị từ trang Khám phá.' });
      return;
    }
    // TODO TV1: tự render edition/round/timeline/nguồn; nối save/calendar của TV4.
    showState(host, { title: 'Chưa có nội dung hiển thị', message: 'Vui lòng quay lại sau.' });
  } catch (error) {
    showState(host, { kind: 'error', title: 'Không tải được dữ liệu', message: error.message });
  }
}
initPage();
