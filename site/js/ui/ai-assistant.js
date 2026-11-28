// TV4 (DOM) + TV2 (style): widget "Gợi ý hội nghị bằng AI" nổi ở góc phải, có trên mọi trang trừ trang Gợi ý AI.
// Phần chung (gửi yêu cầu, trạng thái, chip "AI hiểu là") ở ./ai-session.js; file này dựng khung nổi và thẻ kết quả gọn.
import { createIcon } from '../common.js';
import { formatDateGMT7, getNextSubmission, getUrgencyInfo } from '../deadline-utils.js';
import { ROUTES } from '../routes.js';
import { bindAiSession, createExampleChips, createReason, element, formatCount } from './ai-session.js';
import { createRibbon } from './edition-card.js';

function createDue(edition, now) {
  const submission = getNextSubmission(edition, { now });
  const due = element('p', 'ai-result__due');
  if (submission.status === 'upcoming') {
    const urgency = getUrgencyInfo(submission.deadline.targetTime, now);
    const tag = element('span', `urgency ${urgency.className}`);
    tag.append(createIcon(urgency.icon), urgency.label);
    due.append(tag, ` Hạn ${formatDateGMT7(submission.deadline.instant)}`);
  } else if (submission.status === 'closed') {
    due.textContent = 'Kỳ này đã đóng hạn, theo dõi kỳ sau.';
  } else {
    due.textContent = 'Hạn nộp chưa xác định.';
  }
  return due;
}

// Thẻ gọn cho panel hẹp: tên, hạng, nơi tổ chức, hạn, rồi lý do của AI.
function renderCompactResults(results, now) {
  const list = element('ol', 'ai-results');
  results.forEach((item, index) => {
    const { edition } = item;
    const li = element('li', 'ai-result');
    li.style.setProperty('--i', String(index));
    const title = element('h3', 'ai-result__name');
    const link = element('a', '', `${edition.acronym}${edition.year ? ` ${edition.year}` : ''}`);
    link.href = `${ROUTES.conference}?id=${encodeURIComponent(edition.id)}`;
    title.append(link);
    const meta = element('div', 'ai-result__meta');
    meta.append(...[createRibbon('CORE', edition.ranks?.core), createRibbon('CCF', edition.ranks?.ccf)].filter(Boolean));
    if (edition.place) meta.append(element('span', 'ai-result__place', edition.place));
    li.append(title, meta, createDue(edition, now), createReason(item, index));
    list.append(li);
  });
  return list;
}

export function initAiAssistant({ apiBase }) {
  if (!apiBase || document.querySelector('.ai-assistant')) return;

  const root = element('div', 'ai-assistant');

  // ---------- nút nổi ----------
  const fab = element('button', 'ai-fab');
  fab.type = 'button';
  fab.setAttribute('aria-expanded', 'false');
  fab.setAttribute('aria-controls', 'ai-panel');
  fab.append(createIcon('sparkles', 'icon ai-fab__icon'), element('span', 'ai-fab__label', 'Hỏi AI'));

  // ---------- panel ----------
  const panel = element('section', 'ai-panel');
  panel.id = 'ai-panel';
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-labelledby', 'ai-panel-title');

  const head = element('header', 'ai-panel__head');
  const title = element('h2', 'ai-panel__title');
  title.id = 'ai-panel-title';
  title.append(createIcon('sparkles'), 'Gợi ý hội nghị bằng AI');
  const close = element('button', 'icon-button');
  close.type = 'button';
  close.setAttribute('aria-label', 'Đóng khung gợi ý');
  close.append(createIcon('x'));
  head.append(title, close);

  const form = element('form', 'ai-form');
  const label = element('label', 'field', 'Mô tả đề tài và mong muốn của bạn');
  const textarea = element('textarea');
  textarea.name = 'description';
  textarea.rows = 4;
  textarea.placeholder = 'Ví dụ: đề tài, khu vực muốn đi, hạng tối thiểu, còn bao lâu để viết bài…';
  const hint = element('span', 'field__hint ai-form__count', formatCount(0));
  hint.id = 'ai-description-hint';
  textarea.setAttribute('aria-describedby', hint.id);
  label.append(textarea, hint);
  const submit = element('button', 'button ai-form__submit', 'Gợi ý cho tôi');
  submit.type = 'submit';
  const examples = createExampleChips((text) => {
    session.fill(text);
    updateFullLink();
    textarea.focus();
  });
  form.append(label, examples, submit);

  const status = element('div', 'ai-status');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const output = element('div', 'ai-output');
  const body = element('div', 'ai-panel__body');
  body.append(form, status, output);

  // Chân panel: nhắc kiểm tra nguồn + mở trang đầy đủ kèm câu đang gõ (server có cache nên không tốn thêm lượt AI).
  const foot = element('div', 'ai-panel__foot');
  const note = element('p', 'ai-panel__note', 'AI có thể sai. Luôn kiểm tra hạn trên trang chính thức.');
  const fullLink = element('a', 'ai-panel__full', 'Mở trang đầy đủ');
  fullLink.append(createIcon('right'));
  foot.append(note, fullLink);

  panel.append(head, body, foot);
  root.append(panel, fab);
  document.body.append(root);

  const session = bindAiSession({ apiBase, form, textarea, hint, submit, status, output, renderResults: renderCompactResults });

  function updateFullLink() {
    const text = textarea.value.trim();
    // Phòng routes.js cũ trong cache chưa có khóa match (xem common.js).
    const matchPage = ROUTES.match ?? 'match.html';
    fullLink.href = text ? `${matchPage}?q=${encodeURIComponent(text)}` : matchPage;
  }
  updateFullLink();

  function setOpen(open) {
    fab.setAttribute('aria-expanded', String(open));
    if (open) {
      panel.hidden = false;
      // đợi một khung hình để transition chạy từ trạng thái đóng sang mở
      requestAnimationFrame(() => { panel.dataset.state = 'open'; });
      textarea.focus();
      return;
    }
    panel.dataset.state = 'closed';
    // tắt hẳn sau hiệu ứng; hẹn giờ dự phòng khi người dùng chọn giảm chuyển động
    const hide = () => { if (panel.dataset.state === 'closed') panel.hidden = true; };
    panel.addEventListener('transitionend', hide, { once: true });
    setTimeout(hide, 300);
    fab.focus();
  }

  fab.addEventListener('click', () => setOpen(fab.getAttribute('aria-expanded') !== 'true'));
  close.addEventListener('click', () => setOpen(false));
  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setOpen(false);
  });
  textarea.addEventListener('input', updateFullLink);
}
