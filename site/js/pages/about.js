// TV2: trang Giới thiệu dữ liệu. Nội dung giải thích là HTML tĩnh; JS chỉ lo 2 chỗ dùng dữ liệu thật:
// dòng số liệu dưới tiêu đề và thẻ ví dụ trong mục "Đọc một thẻ đeo". Chọn mốc và tính giờ dùng helper của TV1.
import { initCommonUI, createIcon } from '../common.js';
import { getCatalog } from '../data-service.js';
import { getNextSubmission, getUrgencyInfo, getCountdownText, formatDateGMT7, formatTimeGMT7 } from '../deadline-utils.js';
import { ROUTES } from '../routes.js';
import { showState } from '../ui/state.js';

initCommonUI('about');

const statsLine = document.querySelector('#about-stats');
const cardHost = document.querySelector('#anatomy-card');

// Bảng nhỏ trùng với home.js (không import chéo trang vì home.js chạy hiệu ứng ngay khi nạp)
const DUE_LABELS = { abstract: 'Hạn nộp tóm tắt', paper: 'Hạn nộp toàn văn' };
const QUALITY = {
  verified: ['check', 'Verified'],
  estimated: ['approx', 'Estimated'],
  tba: ['pause', 'TBA'],
  unverified: ['help', 'Chưa đối chiếu'],
};
const CORE_RIBBONS = { 'A*': 'ribbon--core-a-star', A: 'ribbon--a', B: 'ribbon--b', C: 'ribbon--c' };
const CCF_RIBBONS = { A: 'ribbon--a', B: 'ribbon--b', C: 'ribbon--c' };

// Hàm thuần: mọi mốc còn hạn, sắp tăng dần theo targetTime (số ms, không sắp chuỗi instant vì khác múi giờ).
export function listUpcoming(editions, now) {
  return editions
    .map((edition) => ({ edition, result: getNextSubmission(edition, { kind: 'any', now }) }))
    .filter((item) => item.result.status === 'upcoming')
    .map((item) => ({ edition: item.edition, deadline: item.result.deadline }))
    .sort((a, b) => a.deadline.targetTime - b.deadline.targetTime);
}

// Thẻ ví dụ cần có ruy-băng để chú thích "Ruy-băng hạng" trỏ vào được; không có mốc nào có hạng thì lấy mốc gần nhất.
export function pickExample(upcoming) {
  return upcoming.find(({ edition }) => CORE_RIBBONS[edition.ranks?.core] || CCF_RIBBONS[edition.ranks?.ccf]) || upcoming[0] || null;
}

// Giờ nguồn của CCFDDL dạng "2026-11-01 17:00:00" -> "17:00 01/11/2026"; khác mẫu thì giữ nguyên, không đoán.
function formatSourceTime(text) {
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(text);
  return match ? `${match[4]}:${match[5]} ${match[3]}/${match[2]}/${match[1]}` : text;
}

function createText(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}

// data-part nối phần thẻ với chú thích cùng tên (CSS :has làm nổi khi trỏ/Tab vào chú thích)
function withPart(element, part) {
  element.dataset.part = part;
  return element;
}

function createCard({ edition, deadline }, now) {
  const card = createText('article', 'badge-card', '');

  const main = createText('div', 'badge-card__main', '');
  const name = createText('h3', 'badge-card__name', '');
  const link = createText('a', '', [edition.acronym, edition.year].filter(Boolean).join(' '));
  link.href = `${ROUTES.conference}?id=${encodeURIComponent(edition.id)}`;
  name.append(link);
  main.append(name);
  if (edition.name) main.append(createText('p', 'badge-card__full-name', edition.name));
  const meta = withPart(createText('div', 'badge-card__meta', ''), 'rank');
  if (CORE_RIBBONS[edition.ranks?.core]) meta.append(createText('span', `ribbon ${CORE_RIBBONS[edition.ranks.core]}`, `CORE ${edition.ranks.core}`));
  if (CCF_RIBBONS[edition.ranks?.ccf]) meta.append(createText('span', `ribbon ${CCF_RIBBONS[edition.ranks.ccf]}`, `CCF ${edition.ranks.ccf}`));
  const place = [edition.place, edition.format].filter(Boolean).join(' · ');
  if (place) meta.append(createText('span', 'badge-card__place', place));
  main.append(meta);

  // formatDateGMT7 trả "dd/mm/yyyy"; năm tách vào <small> theo mẫu thẻ đeo trong docs/ui-components.md
  const due = createText('div', 'badge-card__due', '');
  const dateText = formatDateGMT7(deadline.instant);
  const yearStart = dateText.lastIndexOf('/');
  const date = withPart(createText('time', 'badge-card__date', dateText.slice(0, yearStart)), 'gmt7');
  date.dateTime = deadline.instant;
  date.append(createText('small', '', dateText.slice(yearStart)));
  due.append(
    createText('span', 'badge-card__due-label', DUE_LABELS[deadline.type] || 'Hạn nộp'),
    date,
    withPart(createText('span', 'badge-card__time', formatTimeGMT7(deadline.instant)), 'gmt7'),
  );
  if (deadline.sourceText && deadline.timezone) {
    due.append(withPart(createText('span', 'badge-card__time badge-card__time--source', `Giờ nguồn ${formatSourceTime(deadline.sourceText)} ${deadline.timezone}`), 'source'));
  }
  const [qualityIcon, qualityLabel] = QUALITY[deadline.quality] || QUALITY.unverified;
  const quality = withPart(createText('span', `quality quality--${deadline.quality in QUALITY ? deadline.quality : 'unverified'}`, ''), 'quality');
  quality.append(createIcon(qualityIcon), qualityLabel);
  due.append(quality);

  // Đếm ngược tính một lần khi dựng thẻ, không setInterval, không đặt trong live region
  const urgency = getUrgencyInfo(deadline.targetTime, now);
  const state = withPart(createText('div', 'badge-card__state', ''), 'urgency');
  const badge = createText('span', `urgency ${urgency.className}`, '');
  badge.append(createIcon(urgency.icon), urgency.label);
  state.append(badge, createText('span', 'badge-card__countdown', getCountdownText(deadline.targetTime, now)));

  card.append(main, due, state);
  const list = createText('ul', 'badge-list', '');
  const item = document.createElement('li');
  item.append(card);
  list.append(item);
  return list;
}

function renderStats(meta, editionCount, upcomingCount) {
  const isLive = meta.mode === 'live';
  const loadedAt = meta.loadedAt ? `${formatTimeGMT7(meta.loadedAt).replace(' GMT+7', '')} ${formatDateGMT7(meta.loadedAt)}` : '';
  const source = isLive
    ? `Tải trực tiếp từ CCFDDL lúc ${loadedAt}`
    : `Đang dùng bản lưu sẵn${meta.fetchedAt ? ` tạo ngày ${formatDateGMT7(meta.fetchedAt)}` : ''}`;
  statsLine.classList.toggle('about-stats--stale', !isLive);
  statsLine.replaceChildren(
    createText('span', '', `${editionCount.toLocaleString('vi-VN')} kỳ hội nghị`),
    createText('span', '', `${upcomingCount.toLocaleString('vi-VN')} mốc nộp còn hạn`),
    createText('span', '', source),
  );
  if (!isLive) statsLine.prepend(createIcon('alert'));
}

async function loadPage() {
  showState(cardHost, { kind: 'loading', title: 'Đang tải thẻ ví dụ', message: 'Lấy mốc nộp gần nhất từ dữ liệu.' });
  try {
    const catalog = await getCatalog();
    const now = Date.now(); // lấy một lần cho cả trang để số liệu và thẻ khớp nhau
    const upcoming = listUpcoming(catalog.editions, now);
    renderStats(catalog.meta, catalog.editions.length, upcoming.length);

    const example = pickExample(upcoming);
    if (!example) {
      showState(cardHost, {
        kind: 'empty', title: 'Hiện không có mốc nào còn hạn',
        message: 'Các chú thích bên dưới vẫn đúng cho mọi thẻ.',
        action: { label: 'Xem tất cả hội nghị', href: ROUTES.conferences },
      });
      return;
    }
    cardHost.replaceChildren(createCard(example, now));
  } catch (error) {
    console.error(error);
    statsLine.replaceChildren(createText('span', '', 'Chưa tải được dữ liệu; phần giải thích bên dưới vẫn đúng.'));
    showState(cardHost, {
      kind: 'error', title: 'Không tải được dữ liệu',
      message: 'Kiểm tra kết nối mạng rồi thử lại.',
      action: { label: 'Thử lại', onClick: loadPage },
    });
  }
}

loadPage();
