// TV4: Khối "Đồng bộ Google Calendar" trên trang Đã lưu.
// Khối được tạo một lần và gắn lại mỗi lần danh sách dựng lại, nên trạng thái/kết quả không bị mất.
import { createIcon } from '../common.js';
import { GOOGLE_CLIENT_ID } from '../config.js';
import {
  APP_CALENDAR_NAME,
  GOOGLE_CALENDAR_WEB_URL,
  collectSyncTargets,
  hasSyncedBefore,
  prepareGoogleSignIn,
  syncSavedDeadlines,
} from '../google-calendar-sync.js';

function formatResult(result) {
  const parts = [];
  if (result.created) parts.push(`thêm ${result.created}`);
  if (result.updated) parts.push(`cập nhật ${result.updated}`);
  if (result.unchanged) parts.push(`giữ nguyên ${result.unchanged}`);
  if (result.removed) parts.push(`gỡ ${result.removed} mốc không còn lưu`);
  const summary = parts.length ? `Đã đồng bộ: ${parts.join(', ')}.` : 'Đã đồng bộ, lịch không có thay đổi.';
  if (result.failed.length === 0) return summary;
  const first = result.failed[0];
  return `${summary} ${result.failed.length} mốc lỗi, ví dụ "${first.label}": ${first.message}`;
}

// Trả null khi bản triển khai chưa có GOOGLE_CLIENT_ID: không hiện khối nào thay vì một nút bị khoá.
export function createCalendarSyncPanel() {
  if (!GOOGLE_CLIENT_ID) return null;
  let editions = [];
  let busy = false;

  const panel = document.createElement('section');
  panel.className = 'card saved-sync';
  panel.setAttribute('aria-labelledby', 'saved-sync-title');

  const text = document.createElement('div');
  text.className = 'saved-sync__text';
  const title = document.createElement('h2');
  title.id = 'saved-sync-title';
  title.className = 'saved-sync__title';
  title.textContent = 'Đồng bộ Google Calendar';
  const lead = document.createElement('p');
  lead.className = 'saved-sync__lead';
  text.append(title, lead);

  const actions = document.createElement('div');
  actions.className = 'saved-sync__actions';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'button';
  const openLink = document.createElement('a');
  openLink.className = 'button button--ghost';
  openLink.href = GOOGLE_CALENDAR_WEB_URL;
  openLink.target = '_blank';
  openLink.rel = 'noopener noreferrer';
  openLink.textContent = 'Mở Google Calendar';
  openLink.hidden = !hasSyncedBefore();
  actions.append(button, openLink);

  const status = document.createElement('p');
  status.className = 'saved-sync__status';
  status.setAttribute('role', 'status');

  panel.append(text, actions, status);

  function setStatus(message, isError = false) {
    status.textContent = message;
    status.classList.toggle('saved-sync__status--error', isError);
  }

  function setButtonLabel(label) {
    button.replaceChildren(createIcon('calendar'), ` ${label}`);
  }

  function refresh() {
    if (busy) return;
    const { targets } = collectSyncTargets(editions, Date.now());
    const count = targets.length;
    lead.textContent = count > 0
      ? `Thêm ${count} mốc nộp bài còn hạn vào lịch riêng "${APP_CALENDAR_NAME}", nhắc trước 1 ngày và 1 giờ. Lịch cá nhân của bạn không bị đụng tới; muốn gỡ thì xoá lịch này trong Google Calendar.`
      : 'Chưa có mốc nộp bài nào còn hạn và đủ giờ chính xác để đồng bộ. Mốc TBA, chỉ có ngày hoặc Estimated không được thêm.';
    setButtonLabel(count > 0 ? `Đồng bộ ${count} mốc` : 'Đồng bộ');
    // Không còn mốc nhưng đã từng đồng bộ: vẫn cho bấm để gỡ các mốc đã bỏ lưu.
    button.disabled = !(count > 0 || hasSyncedBefore());
  }

  async function handleSync() {
    if (busy) return;
    busy = true;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    setButtonLabel('Đang kết nối Google…');
    setStatus('');
    try {
      const result = await syncSavedDeadlines({
        clientId: GOOGLE_CLIENT_ID,
        editions,
        onProgress: ({ done, total }) => setButtonLabel(total ? `Đang đồng bộ ${done}/${total}…` : 'Đang đồng bộ…'),
      });
      openLink.hidden = false;
      setStatus(formatResult(result), result.failed.length > 0);
    } catch (error) {
      console.warn('Đồng bộ Google Calendar thất bại:', error);
      setStatus(error.message || 'Không đồng bộ được Google Calendar.', true);
    } finally {
      busy = false;
      button.removeAttribute('aria-busy');
      refresh();
    }
  }

  button.addEventListener('click', handleSync);
  // Tải thư viện Google trước để popup mở ngay khi bấm, không bị trình duyệt chặn.
  prepareGoogleSignIn(GOOGLE_CLIENT_ID).catch((error) => setStatus(error.message, true));

  return {
    element: panel,
    update(savedEditions) {
      editions = Array.isArray(savedEditions) ? savedEditions : [];
      refresh();
    },
  };
}
