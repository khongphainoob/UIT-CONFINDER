// Thẻ đeo hội nghị dùng chung cho trang Hội nghị và Đã lưu (style: .badge-card trong components.css).
import { createIcon } from '../common.js';
import { formatDateGMT7, formatTimeGMT7, getCountdownText, getUrgencyInfo } from '../deadline-utils.js';
import { ROUTES } from '../routes.js';
import { toggleSaved } from '../saved-store.js';

// Chỉ các hạng này có ruy-băng. Dữ liệu còn có 'N' (None) nên không được tự suy tên class từ giá trị.
const CORE_RIBBONS = { 'A*': 'ribbon--core-a-star', A: 'ribbon--a', B: 'ribbon--b', C: 'ribbon--c' };
const CCF_RIBBONS = { A: 'ribbon--a', B: 'ribbon--b', C: 'ribbon--c' };
const QUALITY = {
  verified: ['check', 'Verified'],
  estimated: ['approx', 'Estimated'],
  tba: ['pause', 'TBA'],
  unverified: ['help', 'Chưa đối chiếu'],
};
export const FIELD_LABELS = {
  AI: 'AI — Trí tuệ nhân tạo',
  CG: 'CG — Đồ họa và đa phương tiện',
  CT: 'CT — Lý thuyết máy tính',
  DB: 'DB — Cơ sở dữ liệu',
  DS: 'DS — Kiến trúc và hệ phân tán',
  HI: 'HI — Tương tác người–máy',
  MX: 'MX — Liên ngành và lĩnh vực mới',
  NW: 'NW — Mạng máy tính',
  SC: 'SC — An toàn hệ thống và mạng',
  SE: 'SE — Kỹ thuật phần mềm',
};

function createRibbon(system, rank) {
  const classes = system === 'CORE' ? CORE_RIBBONS : CCF_RIBBONS;
  if (!Object.hasOwn(classes, rank)) return null;
  const ribbon = document.createElement('span');
  ribbon.className = `ribbon ${classes[rank]}`;
  ribbon.textContent = `${system} ${rank}`;
  return ribbon;
}

// Bản sao của home.js (không import vì import là chạy code trang chủ).
function createQuality(deadline) {
  const known = Object.hasOwn(QUALITY, deadline?.quality);
  const key = known ? deadline.quality : 'unverified';
  const [icon, label] = QUALITY[key];
  const quality = document.createElement('span');
  quality.className = `quality quality--${key}`;
  quality.append(createIcon(icon), label);
  return quality;
}

// Giờ nguồn dạng "2026-11-01 17:00:00" đổi sang "17:00 01/11/2026"; chuỗi khác mẫu giữ nguyên, không đoán.
function formatSourceTime(text) {
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(text);
  return match ? `${match[4]}:${match[5]} ${match[3]}/${match[2]}/${match[1]}` : text;
}

function createSaveButton(edition, card, savedIds, onSavedChange) {
  let isSaved = savedIds.includes(edition.id);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'icon-button badge-card__save';
  const update = () => {
    button.setAttribute('aria-pressed', String(isSaved));
    button.setAttribute('aria-label', isSaved ? `Bỏ lưu ${edition.acronym}` : `Lưu ${edition.acronym}`);
  };
  button.append(createIcon('star'));
  update();
  button.addEventListener('click', () => {
    const result = toggleSaved(edition.id);
    if (!result.ok) {
      let message = card.querySelector('.badge-card__message');
      if (!message) {
        message = document.createElement('p');
        message.className = 'badge-card__message';
        message.setAttribute('role', 'alert');
        card.append(message);
      }
      message.textContent = result.error;
      return;
    }
    isSaved = result.saved;
    update();
    onSavedChange?.(result.ids);
  });
  return button;
}

// item = { edition, submission }: trang tự chọn mốc (vd. theo loại hạn đang lọc) rồi mới dựng thẻ.
export function createEditionCard(item, { now = Date.now(), savedIds = [], onSavedChange } = {}) {
  const { edition, submission } = item;
  const card = document.createElement('article');
  card.className = `badge-card${submission.status === 'closed' ? ' badge-card--closed' : ''}`;
  const mainField = edition.fields?.[0] || 'MX';

  const main = document.createElement('div');
  main.className = 'badge-card__main';
  const title = document.createElement('h3');
  title.className = 'badge-card__name';
  const link = document.createElement('a');
  link.href = `${ROUTES.conference}?id=${encodeURIComponent(edition.id)}`;
  link.textContent = `${edition.acronym}${edition.year ? ` ${edition.year}` : ''}`;
  title.append(link);
  const fullName = document.createElement('p');
  fullName.className = 'badge-card__full-name';
  fullName.textContent = edition.name || 'Chưa có tên đầy đủ';
  const meta = document.createElement('div');
  meta.className = 'badge-card__meta';
  const fieldTag = document.createElement('span');
  fieldTag.className = 'badge-card__place';
  fieldTag.textContent = mainField;
  fieldTag.title = FIELD_LABELS[mainField] || mainField;
  const ranks = document.createElement('div');
  ranks.className = 'badge-card__ranks';
  const ribbons = [createRibbon('CORE', edition.ranks?.core), createRibbon('CCF', edition.ranks?.ccf)];
  ranks.append(...ribbons.filter(Boolean));
  const place = document.createElement('span');
  place.className = 'badge-card__place';
  place.textContent = [edition.format, edition.place].filter(Boolean).join(' · ') || 'Chưa rõ hình thức';
  // Không gắn khung ruy-băng rỗng, nếu không flex gap bị nhân đôi.
  meta.append(fieldTag, ...(ranks.childElementCount ? [ranks] : []), place);
  main.append(title, fullName, meta);

  const due = document.createElement('div');
  due.className = 'badge-card__due';
  const dueLabel = document.createElement('span');
  dueLabel.className = 'badge-card__due-label';
  dueLabel.textContent = 'Hạn nộp';
  if (submission.deadline?.type === 'abstract') dueLabel.textContent = 'Hạn abstract';
  if (submission.deadline?.type === 'paper') dueLabel.textContent = 'Hạn full paper';
  due.append(dueLabel);
  const deadline = submission.deadline;
  const instant = deadline?.instant ? Date.parse(deadline.instant) : Number.NaN;
  // Một điều kiện dùng cho cả ngày, mức khẩn và đếm ngược: không đếm ngược tới ngày mà mình không dám hiện.
  const showInstant = Number.isFinite(instant) && deadline.precision === 'instant' && !['estimated', 'tba'].includes(deadline.quality);
  if (showInstant) {
    const date = document.createElement('span');
    date.className = 'badge-card__date';
    date.textContent = formatDateGMT7(deadline.instant);
    const time = document.createElement('span');
    time.className = 'badge-card__time';
    time.textContent = formatTimeGMT7(deadline.instant);
    due.append(date, time);
  } else {
    const unknown = document.createElement('span');
    unknown.className = 'badge-card__unknown';
    unknown.textContent = deadline?.quality === 'tba' ? 'Chưa công bố' : 'Chưa xác định';
    due.append(unknown);
  }
  if (showInstant && deadline.sourceText && deadline.timezone) {
    const source = document.createElement('span');
    source.className = 'badge-card__time badge-card__time--source';
    source.textContent = `Giờ nguồn ${formatSourceTime(deadline.sourceText)} ${deadline.timezone}`;
    due.append(source);
  }
  due.append(createQuality(deadline));

  const status = document.createElement('div');
  status.className = 'badge-card__state';
  const targetTime = showInstant ? instant : Number.NaN;
  const urgency = getUrgencyInfo(targetTime, now);
  const tag = document.createElement('span');
  tag.className = `urgency ${urgency.className}`;
  tag.append(createIcon(urgency.icon), urgency.label);
  status.append(tag);
  if (urgency.level !== 'unknown' && urgency.level !== 'expired') {
    const countdown = document.createElement('span');
    countdown.className = 'badge-card__countdown';
    const countdownText = getCountdownText(targetTime, now);
    countdown.textContent = countdownText.charAt(0).toLocaleUpperCase('vi') + countdownText.slice(1);
    status.append(countdown);
  }

  card.append(main, due, status, createSaveButton(edition, card, savedIds, onSavedChange));
  return card;
}

// Trả về null khi dữ liệu tải trực tiếp; ngược lại là dòng báo đang dùng bản lưu sẵn.
export function createDataNotice(meta) {
  if (meta?.mode === 'live') return null;
  const notice = document.createElement('div');
  notice.className = 'data-notice data-notice--stale';
  const body = document.createElement('div');
  body.className = 'data-notice__body';
  const text = document.createElement('p');
  text.textContent = meta?.fetchedAt
    ? `Đang dùng bản lưu sẵn tạo ngày ${formatDateGMT7(meta.fetchedAt)}.`
    : 'Đang dùng bản lưu sẵn.';
  body.append(text);
  notice.append(createIcon('alert'), body);
  return notice;
}
