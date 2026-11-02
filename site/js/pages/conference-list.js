import { initCommonUI } from '../common.js';
initCommonUI('explore');
import { getCatalog } from '../data-service.js';
import { showState } from '../ui/state.js';
import { createEditionCard } from '../ui/edition-card.js';

const host = document.querySelector('#page-content');
async function initPage() {
  showState(host, { kind: 'loading', title: 'Đang tải dữ liệu', message: 'Vui lòng chờ.' });
  try {
    const catalog = await getCatalog();
    const query = new URLSearchParams(location.search).get('q')?.trim().toLocaleLowerCase('vi') || '';
    const editions = catalog.editions.filter((edition) => {
      if (!query) return true;
      return `${edition.acronym} ${edition.name}`.toLocaleLowerCase('vi').includes(query);
    });
    const list = document.createElement('div');
    list.className = 'edition-grid';
    editions.slice(0, 12).forEach((edition) => list.append(createEditionCard(edition)));
    if (!list.childElementCount) {
      showState(host, {
        kind: 'empty',
        title: 'Không tìm thấy hội nghị',
        message: 'Thử từ khóa khác hoặc xóa tìm kiếm.',
      });
      return;
    }
    const status = document.querySelector('#result-status');
    if (status) status.textContent = `${editions.length} kỳ hội nghị · đang hiển thị ${Math.min(editions.length, 12)}`;
    host.replaceChildren(list);
  } catch (error) {
    showState(host, { kind: 'error', title: 'Không tải được dữ liệu', message: error.message });
  }
}
initPage();
