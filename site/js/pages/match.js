// TV2 (bố cục) + TV4 (gọi AI): trang Gợi ý hội nghị bằng AI.
// Khung trang nằm trong match.html; file này nối form với ui/ai-session.js và dựng kết quả bằng thẻ hội nghị chung.
import { DESCRIPTION_MAX } from '../ai-match-client.js';
import { initCommonUI } from '../common.js';
import { AI_API_BASE } from '../config.js';
import { getNextSubmission } from '../deadline-utils.js';
import { ROUTES } from '../routes.js';
import { getSavedIds } from '../saved-store.js';
import { bindAiSession, createExampleChips, createReason, element } from '../ui/ai-session.js';
import { createEditionCard } from '../ui/edition-card.js';
import { showState } from '../ui/state.js';

initCommonUI('match');

const form = document.querySelector('#match-form');
const textarea = document.querySelector('#match-description');
const hint = document.querySelector('#match-count');
const submit = form.querySelector('button[type=submit]');
const status = document.querySelector('#match-status');
const output = document.querySelector('#match-output');

let savedIds = getSavedIds().ids;
window.addEventListener('saved:changed', (event) => {
  if (Array.isArray(event.detail?.ids)) savedIds = event.detail.ids;
});

// Thẻ hội nghị đầy đủ (giống trang Hội nghị, có nút Lưu) + khối lý do của AI ngay bên dưới.
function renderFullResults(results, now) {
  const list = element('ol', 'match-list');
  results.forEach((item, index) => {
    const li = element('li', 'match-item');
    const submission = getNextSubmission(item.edition, { now });
    const card = createEditionCard({ edition: item.edition, submission }, {
      now,
      savedIds,
      onSavedChange: (ids) => { savedIds = ids; },
    });
    li.style.setProperty('--i', String(index));
    li.append(card, createReason(item, index));
    list.append(li);
  });
  return list;
}

// Ghi câu hỏi lên URL để chia sẻ link; không thêm lịch sử mới cho mỗi lần hỏi.
function rememberQuestion(description) {
  const url = new URL(window.location.href);
  url.searchParams.set('q', description);
  window.history.replaceState({}, '', url);
}

if (!AI_API_BASE) {
  form.querySelectorAll('textarea, button').forEach((control) => { control.disabled = true; });
  showState(output, {
    kind: 'empty',
    title: 'Tính năng AI chưa bật trên bản này',
    message: 'Bản đang xem chưa kết nối máy chủ AI. Bạn vẫn có thể lọc hội nghị theo lĩnh vực, hạng và thời gian.',
    action: { label: 'Mở trang Hội nghị', href: ROUTES.conferences },
  });
} else {
  const session = bindAiSession({
    apiBase: AI_API_BASE, form, textarea, hint, submit, status, output,
    renderResults: renderFullResults,
    onResult: rememberQuestion,
  });
  document.querySelector('[data-examples]').replaceWith(createExampleChips((text) => {
    session.fill(text);
    textarea.focus();
  }));

  // Mở từ widget hoặc link chia sẻ: điền sẵn và gợi ý ngay. Câu vừa hỏi ở widget nằm trong cache
  // của server nên không tốn thêm lượt AI.
  const question = (new URLSearchParams(window.location.search).get('q') ?? '').trim().slice(0, DESCRIPTION_MAX);
  if (question) {
    session.fill(question);
    form.requestSubmit();
  }
}
