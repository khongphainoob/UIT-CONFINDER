import { initCommonUI } from '../common.js';
initCommonUI('components');
import { showState } from '../ui/state.js';
showState(document.querySelector('#page-content'), {
  title: 'Trạng thái rỗng mẫu', message: 'Dùng chung style, mỗi trang tự quyết định khi nào hiển thị.',
});
// TODO TV2 bổ sung select/checkbox/radio/card/pager và đủ loading/error/empty.
