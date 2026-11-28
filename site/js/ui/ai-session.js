// TV4: phần dùng chung giữa widget "Hỏi AI" (ui/ai-assistant.js) và trang Gợi ý AI (pages/match.js).
// Gắn vào form có sẵn: đếm ký tự, gửi yêu cầu, trạng thái chờ, đếm ngược khi bị giới hạn,
// chip "AI hiểu là", thông báo. Danh sách kết quả do nơi gọi tự dựng (widget thẻ gọn, trang thẻ đầy đủ).
// Mọi chữ do người dùng hoặc AI tạo ra đều gắn bằng textContent, không dùng innerHTML.
import {
  DESCRIPTION_MAX, describeRelaxed, filtersToChips, removeFilterChip, requestMatch,
  safeExploreHref, validateDescription,
} from '../ai-match-client.js';
import { createIcon } from '../common.js';

export const EXAMPLES = Object.freeze([
  'Tôi làm bảo mật cho AI agent, phát hiện prompt injection, muốn nộp ở châu Á trong 3 tháng tới, CCF B trở lên.',
  'Mình nghiên cứu federated learning trên thiết bị di động, muốn tìm hội nghị tổ chức tại Việt Nam.',
  'Đề tài kiểm thử phần mềm tự động bằng LLM, cần hội nghị CORE A trở lên còn hạn full paper.',
]);
// Chữ chạy trong lúc chờ: server không báo từng bước, đây chỉ để người dùng biết hệ thống đang làm gì.
const PROGRESS = ['Đang đọc yêu cầu của bạn…', 'Đang lọc hội nghị phù hợp…', 'Đang xếp hạng và viết lý do…'];
const PROGRESS_MS = 1800;
const KEYWORDS_SHOWN = 4;
const SUBMIT_LABEL = 'Gợi ý cho tôi';

export function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function formatCount(length) {
  return `${length.toLocaleString('vi')}/${DESCRIPTION_MAX.toLocaleString('vi')} ký tự`;
}

// Chip ví dụ: bấm là điền câu mẫu vào ô mô tả.
export function createExampleChips(onPick) {
  const examples = element('div', 'ai-form__examples');
  examples.setAttribute('aria-label', 'Câu ví dụ');
  EXAMPLES.forEach((text, i) => {
    const chip = element('button', 'chip');
    chip.type = 'button';
    chip.title = text;
    chip.append(element('span', 'chip__face', `Ví dụ ${i + 1}`));
    chip.addEventListener('click', () => onPick(text));
    examples.append(chip);
  });
  return examples;
}

function createThinking() {
  const box = element('div', 'ai-thinking');
  box.setAttribute('aria-hidden', 'true');
  const dots = element('span', 'ai-thinking__dots');
  dots.append(element('span'), element('span'), element('span'));
  const skeleton = element('div', 'skeleton');
  for (const modifier of ['title', '', 'short']) {
    skeleton.append(element('span', modifier ? `skeleton-line skeleton-line--${modifier}` : 'skeleton-line'));
  }
  box.append(dots, skeleton);
  return box;
}

// Thanh điểm + lý do + chủ đề khớp: dùng chung cho thẻ gọn của widget và thẻ đầy đủ của trang.
export function createReason(item, index = 0) {
  const box = element('div', 'ai-reason');
  box.style.setProperty('--i', String(index)); // độ trễ xuất hiện lần lượt, tính trong CSS
  const head = element('div', 'ai-reason__head');
  head.append(element('span', 'ai-reason__label', 'Mức phù hợp'));
  const score = element('span', 'ai-result__score', `${item.score}`);
  score.setAttribute('aria-label', `Mức phù hợp ${item.score} trên 100`);
  head.append(score);
  const meter = element('div', 'ai-result__meter');
  meter.setAttribute('aria-hidden', 'true');
  meter.style.setProperty('--score', String(Math.max(0, Math.min(100, item.score))));
  box.append(head, meter);
  if (item.reason) box.append(element('p', 'ai-result__reason', item.reason));
  if (item.matchedTopics?.length) {
    const topics = element('ul', 'ai-result__topics');
    topics.setAttribute('aria-label', 'Chủ đề khớp');
    for (const topic of item.matchedTopics) topics.append(element('li', '', topic));
    box.append(topics);
  }
  return box;
}

/**
 * @param {{ apiBase: string, form: HTMLFormElement, textarea: HTMLTextAreaElement, hint: HTMLElement,
 *           submit: HTMLButtonElement, status: HTMLElement, output: HTMLElement,
 *           renderResults: (results: object[], now: number) => Node,
 *           onResult?: (description: string) => void }} options
 */
export function bindAiSession({ apiBase, form, textarea, hint, submit, status, output, renderResults, onResult }) {
  let lastFilters = null;
  let lastDescription = '';
  let progressTimer = null;
  let cooldownTimer = null;
  let busy = false;

  const updateCount = () => { hint.textContent = formatCount(textarea.value.length); };

  function setBusy(value) {
    busy = value;
    submit.disabled = value;
    submit.setAttribute('aria-busy', String(value));
    submit.textContent = value ? 'Đang gợi ý…' : SUBMIT_LABEL;
    clearInterval(progressTimer);
    if (!value) return;
    let step = 0;
    status.textContent = PROGRESS[0];
    progressTimer = setInterval(() => {
      step = Math.min(step + 1, PROGRESS.length - 1);
      status.textContent = PROGRESS[step];
    }, PROGRESS_MS);
    output.replaceChildren(createThinking());
  }

  // Bị giới hạn tần suất: khóa nút và đếm ngược, không để người dùng bấm dồn.
  function startCooldown(seconds) {
    clearInterval(cooldownTimer);
    let left = seconds;
    const tick = () => {
      if (left <= 0) {
        clearInterval(cooldownTimer);
        submit.disabled = false;
        submit.textContent = SUBMIT_LABEL;
        return;
      }
      submit.disabled = true;
      submit.textContent = `Thử lại sau ${left} giây`;
      left -= 1;
    };
    tick();
    cooldownTimer = setInterval(tick, 1000);
  }

  function showError(error) {
    const alert = element('div', 'ai-alert');
    alert.setAttribute('role', 'alert');
    alert.append(createIcon('alert'), element('p', '', error.message));
    output.replaceChildren(alert);
    status.textContent = '';
    if (error.retryAfter > 0) startCooldown(error.retryAfter);
  }

  function createChipButton(chip, filters, className) {
    const button = element('button', className);
    button.type = 'button';
    button.append(chip.label, createIcon('x'));
    button.setAttribute('aria-label', `Bỏ ${chip.label} rồi gợi ý lại`);
    button.addEventListener('click', () => run(lastDescription, removeFilterChip(filters, chip.key)));
    return button;
  }

  // Hai nhóm để không thành "bức tường chip": tiêu chí cứng là chip rõ; từ khóa là thẻ nhạt,
  // chỉ hiện vài cái đầu, phần còn lại mở bằng nút "+N".
  function renderUnderstood(filters) {
    const wrap = element('div', 'ai-understood');
    wrap.append(element('p', 'ai-understood__label', 'AI hiểu là'));
    const chips = filtersToChips(filters);
    if (!chips.length) {
      wrap.append(element('p', 'ai-understood__empty', 'Chưa rút ra tiêu chí cụ thể, đang gợi ý theo nội dung mô tả.'));
      return wrap;
    }
    const criteria = chips.filter((chip) => !chip.key.startsWith('keyword:'));
    const keywords = chips.filter((chip) => chip.key.startsWith('keyword:'));
    if (criteria.length) {
      const list = element('div', 'ai-understood__chips');
      list.setAttribute('aria-label', 'Tiêu chí');
      for (const chip of criteria) list.append(createChipButton(chip, filters, 'ai-chip'));
      wrap.append(list);
    }
    if (keywords.length) {
      const list = element('div', 'ai-understood__chips');
      list.setAttribute('aria-label', 'Từ khóa');
      keywords.forEach((chip, i) => {
        const button = createChipButton(chip, filters, 'ai-chip ai-chip--keyword');
        if (i >= KEYWORDS_SHOWN) button.hidden = true;
        list.append(button);
      });
      if (keywords.length > KEYWORDS_SHOWN) {
        const more = element('button', 'ai-chip ai-chip--more', `+${keywords.length - KEYWORDS_SHOWN} từ khóa`);
        more.type = 'button';
        more.addEventListener('click', () => {
          const firstHidden = list.querySelector('[hidden]');
          for (const hidden of list.querySelectorAll('[hidden]')) hidden.hidden = false;
          more.remove();
          firstHidden?.focus();
        });
        list.append(more);
      }
      wrap.append(list);
    }
    return wrap;
  }

  function renderData(data) {
    if (data.offTopic) {
      output.replaceChildren(element('p', 'ai-info', 'Mình chỉ giúp tìm hội nghị để nộp bài. Hãy mô tả đề tài nghiên cứu và mong muốn của bạn.'));
      status.textContent = 'Yêu cầu không liên quan tới tìm hội nghị.';
      return;
    }
    const nodes = [renderUnderstood(data.parsedFilters)];
    const relaxed = describeRelaxed(data.relaxed);
    if (relaxed) nodes.push(element('p', 'ai-info', relaxed));
    if (data.rerankFailed) nodes.push(element('p', 'ai-info', 'AI tạm thời không viết được lý do, đang xếp theo độ khớp từ khóa.'));
    if (data.results.length) {
      nodes.push(renderResults(data.results, Date.now()));
    } else {
      nodes.push(element('p', 'ai-info', 'Không tìm thấy hội nghị phù hợp. Thử bỏ bớt tiêu chí ở trên.'));
    }
    const more = element('a', 'button button--outline ai-output__more', 'Xem và lọc tiếp trong trang Hội nghị');
    more.href = safeExploreHref(data.exploreUrl);
    nodes.push(more);
    output.replaceChildren(...nodes);
    status.textContent = data.results.length ? `Có ${data.results.length} gợi ý.` : 'Không có gợi ý.';
  }

  async function run(description, filters = null) {
    if (busy) return;
    lastDescription = description;
    setBusy(true);
    const result = await requestMatch({ apiBase, description, filters });
    setBusy(false);
    if (!result.ok) {
      showError(result.error);
      return;
    }
    lastFilters = result.data.parsedFilters;
    renderData(result.data);
    onResult?.(description);
  }

  textarea.maxLength = DESCRIPTION_MAX;
  updateCount();
  textarea.addEventListener('input', () => {
    updateCount();
    textarea.removeAttribute('aria-invalid');
  });
  form.noValidate = true;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const description = textarea.value.trim();
    const check = validateDescription(description);
    if (!check.ok) {
      textarea.setAttribute('aria-invalid', 'true');
      showError({ message: check.message, retryAfter: 0 });
      textarea.focus();
      return;
    }
    // Mô tả giữ nguyên thì dùng lại bộ lọc đã sửa; mô tả mới thì để AI phân tích lại từ đầu.
    run(description, description === lastDescription ? lastFilters : null);
  });

  return {
    run,
    fill(text) {
      textarea.value = text;
      updateCount();
    },
  };
}
