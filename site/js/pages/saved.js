import { createIcon, initCommonUI } from '../common.js';
import { getCatalog } from '../data-service.js';
import { getNextSubmission } from '../deadline-utils.js';
import { ROUTES } from '../routes.js';
import { getSavedIds, removeSavedIds } from '../saved-store.js';
import { createDataNotice, createEditionCard } from '../ui/edition-card.js';
import { showState } from '../ui/state.js';
import { findNextDeadlineTime } from './explore-state.js';

initCommonUI('saved');

const host = document.querySelector('#page-content');
const MAX_TIMEOUT = 2_147_000_000;
let currentCatalog = { editions: [] };
let currentIds = [];
let deadlineTimer = null;

function createStaleWarning(staleIds) {
  const warning = document.createElement('div');
  warning.className = 'data-notice data-notice--stale';
  warning.setAttribute('role', 'alert');
  const body = document.createElement('div');
  body.className = 'data-notice__body saved-stale';
  const message = document.createElement('p');
  message.textContent = `${staleIds.length} mục đã lưu không còn trong catalog.`;
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'button button--danger';
  remove.textContent = 'Xóa mục cũ';
  remove.addEventListener('click', () => {
    // Ghi thành công thì store phát saved:changed và trang tự dựng lại.
    const result = removeSavedIds(staleIds);
    if (!result.ok) message.textContent = result.error;
  });
  body.append(message, remove);
  warning.append(createIcon('alert'), body);
  return warning;
}

function createList(editions, ids, now) {
  const list = document.createElement('ul');
  list.className = 'badge-list';
  for (const edition of editions) {
    const row = document.createElement('li');
    const submission = getNextSubmission(edition, { now });
    row.append(createEditionCard({ edition, submission }, { now, savedIds: ids }));
    list.append(row);
  }
  return list;
}

// Đếm ngược và mức khẩn phải đổi đúng lúc qua hạn, không cần timer mỗi giây.
function scheduleDeadlineRefresh(editions, now) {
  clearTimeout(deadlineTimer);
  const nextTime = findNextDeadlineTime(editions, 'any', now, getNextSubmission);
  if (nextTime == null) return;
  const delay = Math.min(Math.max(nextTime - now + 100, 100), MAX_TIMEOUT);
  deadlineTimer = setTimeout(() => renderSaved(currentIds), delay);
}

// Dựng lại danh sách làm mất phần tử đang focus: nhớ vị trí thẻ rồi trả focus về đúng loại điều khiển.
function rememberFocus() {
  const active = document.activeElement;
  if (!host.contains(active)) return null;
  const index = [...host.querySelectorAll('.badge-card')].findIndex((card) => card.contains(active));
  const selector = active.matches('.badge-card__name a') ? '.badge-card__name a' : '.badge-card__save';
  return { index, selector };
}

function restoreFocus(memory) {
  if (!memory) return;
  const controls = host.querySelectorAll(memory.selector);
  const target = memory.index >= 0 && controls.length
    ? controls[Math.min(memory.index, controls.length - 1)]
    : host.querySelector('.saved-summary');
  target?.focus({ preventScroll: memory.index < 0 });
}

function renderSaved(ids) {
  currentIds = Array.isArray(ids) ? ids : [];
  const editions = Array.isArray(currentCatalog.editions) ? currentCatalog.editions : [];
  const savedEditions = editions.filter((edition) => currentIds.includes(edition.id));
  const staleIds = currentIds.filter((id) => !editions.some((edition) => edition.id === id));
  const now = Date.now();
  const memory = rememberFocus();

  const content = document.createDocumentFragment();
  const summary = document.createElement('p');
  summary.className = 'saved-summary';
  summary.tabIndex = -1;
  summary.setAttribute('role', 'status');
  summary.textContent = `${savedEditions.length} hội nghị đã lưu`;
  content.append(summary);
  const notice = createDataNotice(currentCatalog.meta);
  if (notice) content.append(notice);
  if (staleIds.length > 0) content.append(createStaleWarning(staleIds));
  if (savedEditions.length === 0) {
    const empty = document.createElement('div');
    showState(empty, {
      title: 'Chưa có hội nghị đã lưu',
      message: 'Bấm ngôi sao trên một thẻ hội nghị để xem lại ở đây.',
      action: { label: 'Xem danh sách hội nghị', href: ROUTES.conferences },
    });
    content.append(empty);
  } else {
    content.append(createList(savedEditions, currentIds, now));
  }
  host.replaceChildren(content);
  restoreFocus(memory);
  scheduleDeadlineRefresh(savedEditions, now);
}

async function initPage() {
  clearTimeout(deadlineTimer);
  showState(host, { kind: 'loading', title: 'Đang tải danh sách', message: 'Vui lòng chờ.' });
  const saved = getSavedIds();
  // Không đọc được thì không được báo "chưa lưu gì": người dùng sẽ tưởng mất danh sách.
  if (!saved.ok) {
    showState(host, {
      kind: 'error',
      title: 'Không đọc được danh sách đã lưu',
      message: saved.error,
      action: { label: 'Thử lại', onClick: initPage },
    });
    return;
  }
  try {
    currentCatalog = await getCatalog();
    renderSaved(saved.ids);
  } catch (error) {
    console.error(error);
    showState(host, {
      kind: 'error',
      title: 'Không tải được dữ liệu',
      message: 'Kiểm tra kết nối mạng rồi thử lại.',
      action: { label: 'Thử lại', onClick: initPage },
    });
  }
}

window.addEventListener('saved:changed', (event) => {
  const ids = event.detail?.ids;
  if (Array.isArray(ids)) renderSaved(ids);
});

initPage();
