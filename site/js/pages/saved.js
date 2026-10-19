import { initCommonUI } from '../common.js';
initCommonUI('saved');
import { showState } from '../ui/state.js';
// TODO TV4: getSavedIds -> getCatalog -> join edition ID -> tự render list/empty/warning.
// Chưa gọi saved-store trước khi TV4 hiện thực để tránh giả báo đã lưu.
showState(document.querySelector('#page-content'), {
  title: 'Chưa có nội dung hiển thị', message: 'Vui lòng quay lại sau.',
});
