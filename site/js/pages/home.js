// TV2: Trang chủ (landing). Chọn mốc và tính giờ dùng helper của TV1; trang này chỉ lọc/sắp/render và lo chuyển động.
// Có 2 chỗ dùng dữ liệu: 6 hàng "Hạn nộp sắp tới" và ô "Nguồn dữ liệu" ở hero.
import { initCommonUI, createIcon } from '../common.js';
import { getCatalog } from '../data-service.js';
import { getNextSubmission, getUrgencyInfo, getCountdownText, formatDateGMT7, formatTimeGMT7 } from '../deadline-utils.js';
import { ROUTES } from '../routes.js';
import { showState } from '../ui/state.js';

initCommonUI('home');

const MAX_ROWS = 6;
const MIN_LOADER_MS = 600;   // màn tải hiện tối thiểu chừng này để không nháy
const MAX_LOADER_MS = 4000;  // mạng chậm thì vẫn mở trang, phần danh sách tự hiện khung đang tải

const root = document.documentElement;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const host = document.querySelector('#page-content');
const header = document.querySelector('[data-site-header]');
const upcomingSection = document.querySelector('.upcoming');
const sourceCell = document.querySelector('#hero-source');
const nextCell = document.querySelector('#hero-next');

// Chỉ ẩn trước các khối sẽ chạy hiệu ứng khi JS chạy được và người dùng không chọn giảm chuyển động
if (!reduceMotion) root.classList.add('home-motion');

const DUE_LABELS = { abstract: 'Hạn nộp tóm tắt', paper: 'Hạn nộp toàn văn' };
const QUALITY = {
  verified: ['check', 'Verified'],
  estimated: ['approx', 'Estimated'],
  tba: ['pause', 'TBA'],
  unverified: ['help', 'Chưa đối chiếu'],
};
const CORE_RIBBONS = { 'A*': 'ribbon--core-a-star', A: 'ribbon--a', B: 'ribbon--b', C: 'ribbon--c' };
const CCF_RIBBONS = { A: 'ribbon--a', B: 'ribbon--b', C: 'ribbon--c' };

// Hàm thuần (không đụng DOM): mỗi edition lấy một mốc gần nhất, giữ mốc còn hạn, sắp tăng dần, cắt `limit`.
// Sắp theo targetTime (số ms) chứ không theo chuỗi instant, vì các mốc có múi giờ khác nhau (AoE, PT...).
export function pickUpcoming(editions, now, limit = MAX_ROWS) {
  return editions
    .map((edition) => ({ edition, deadline: getNextSubmission(edition, { kind: 'any', now }) }))
    .filter((item) => item.deadline.status === 'upcoming')
    .sort((a, b) => a.deadline.deadline.targetTime - b.deadline.deadline.targetTime)
    .slice(0, limit)
    .map((item) => ({ edition: item.edition, deadline: item.deadline.deadline }));
}

// Đếm ngược tới từng giây cho danh sách. getCountdownText của TV1 chỉ chi tiết tới giờ/phút,
// nên trang chủ tự định dạng giây; khi giảm chuyển động thì dùng lại chữ của TV1, cập nhật mỗi phút.
// Ghi đủ "giờ phút giây" chứ không "08:53:24" để khỏi bị đọc nhầm thành giờ trong ngày.
export function countdownParts(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const pad = (value) => String(value).padStart(2, '0');
  const days = Math.floor(total / 86400);
  const parts = [[String(Math.floor(total / 3600) % 24), 'giờ'], [pad(Math.floor(total / 60) % 60), 'phút'], [pad(total % 60), 'giây']];
  return days > 0 ? [[String(days), 'ngày'], ...parts] : parts;
}

export function formatTicker(ms) {
  if (ms <= 0) return 'Đã hết hạn';
  return `còn ${countdownParts(ms).map((part) => part.join(' ')).join(' ')}`;
}

// Giờ nguồn của CCFDDL dạng "2026-11-01 17:00:00"; đổi sang "17:00 01/11/2026" cho cùng kiểu dòng GMT+7.
// Chuỗi khác mẫu thì giữ nguyên, không đoán.
export function formatSourceTime(text) {
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(text);
  return match ? `${match[4]}:${match[5]} ${match[3]}/${match[2]}/${match[1]}` : text;
}

function createText(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}

function createRibbons(ranks) {
  const ribbons = [];
  if (CORE_RIBBONS[ranks?.core]) ribbons.push(createText('span', `ribbon ${CORE_RIBBONS[ranks.core]}`, `CORE ${ranks.core}`));
  if (CCF_RIBBONS[ranks?.ccf]) ribbons.push(createText('span', `ribbon ${CCF_RIBBONS[ranks.ccf]}`, `CCF ${ranks.ccf}`));
  return ribbons;
}

// Danh sách nhóm theo mức khẩn thay cho nhãn hộp ở từng hàng: mỗi nhóm một tiêu đề (icon + chữ, không chỉ màu).
const GROUP_RANGES = { urgent: 'dưới 3 ngày', week: 'dưới 7 ngày', month: 'dưới 30 ngày', open: 'từ 30 ngày' };

export function groupByUrgency(items, now) {
  const groups = [];
  items.forEach((item, index) => {
    const urgency = getUrgencyInfo(item.deadline.targetTime, now);
    if (groups.at(-1)?.urgency.level !== urgency.level) groups.push({ urgency, start: index, items: [] });
    groups.at(-1).items.push(item);
  });
  return groups;
}

function createGroupTitle(urgency) {
  const title = createText('h3', `rows__group rows__group--${urgency.level}`, '');
  const range = GROUP_RANGES[urgency.level];
  title.append(createIcon(urgency.icon), range ? `${urgency.label} · ${range}` : urgency.label);
  return title;
}

function createQuality(deadline) {
  const known = Boolean(QUALITY[deadline.quality]);
  const [icon, label] = QUALITY[known ? deadline.quality : 'unverified'];
  const quality = createText('span', `quality quality--${known ? deadline.quality : 'unverified'}`, '');
  quality.append(createIcon(icon), label);
  return quality;
}

function tickerText(targetTime, now) {
  return reduceMotion ? getCountdownText(targetTime, now) : formatTicker(targetTime - now);
}

function createTicker(className, deadline, now) {
  const ticker = createText('span', className, tickerText(deadline.targetTime, now));
  ticker.dataset.target = deadline.targetTime;
  return ticker;
}

// formatDateGMT7 trả "dd/mm/yyyy"; tách năm vào <small> theo mẫu thẻ đeo trong docs/ui-components.md
function createDate(className, deadline) {
  const dateText = formatDateGMT7(deadline.instant);
  const yearStart = dateText.lastIndexOf('/');
  const date = createText('time', className, dateText.slice(0, yearStart));
  date.dateTime = deadline.instant;
  date.append(createText('small', '', dateText.slice(yearStart)));
  return date;
}

function detailUrl(edition) {
  return `${ROUTES.conference}?id=${encodeURIComponent(edition.id)}`;
}

function editionTitle(edition) {
  return [edition.acronym, edition.year].filter(Boolean).join(' ');
}

// ---------- danh sách 6 hàng mở rộng được ----------
function createFact(label, value) {
  const row = document.createElement('div');
  row.append(createText('dt', '', label), createText('dd', '', value));
  return row;
}

function createRow({ edition, deadline }, index, now) {
  const details = createText('details', 'row', '');
  const summary = document.createElement('summary');
  const title = editionTitle(edition);
  const ribbons = createRibbons(edition.ranks);
  const dueLabel = DUE_LABELS[deadline.type] || 'Hạn nộp';
  const time = formatTimeGMT7(deadline.instant);
  const urgency = getUrgencyInfo(deadline.targetTime, now); // mức khẩn hiện ở tiêu đề nhóm, hàng chỉ đưa vào tên đọc

  const name = createText('span', 'row__name', '');
  name.append(createText('span', 'row__acronym', title));
  // gói ruy-băng thành một cụm để khi hẹp cả cụm xuống dòng, không tách CORE một dòng CCF một dòng
  if (ribbons.length) {
    const ranks = createText('span', 'row__ranks', '');
    ranks.append(...ribbons);
    name.append(ranks);
  }
  const when = createText('span', 'row__when', '');
  when.append(createDate('row__date', deadline), ` ${time}`); // formatTimeGMT7 đã kèm "GMT+7"
  const due = createText('span', 'row__due', '');
  due.append(when, createTicker('row__tick', deadline, now));
  const plus = createText('span', 'row__plus', '');
  plus.setAttribute('aria-hidden', 'true');
  summary.append(createText('span', 'row__num', String(index + 1).padStart(2, '0')), name, due, plus);
  // Tên đọc cho trình đọc màn hình: có dấu ngắt và chữ "Hạn nộp"; bỏ đếm ngược vì nó đổi mỗi giây
  summary.setAttribute('aria-label', [
    title, ...ribbons.map((ribbon) => ribbon.textContent),
    `${dueLabel} ${time} ${formatDateGMT7(deadline.instant)}`, urgency.label,
  ].join(', '));

  const body = createText('div', 'row__body', '');
  if (edition.name) body.append(createText('p', 'row__full-name', edition.name));
  const facts = createText('dl', 'row__facts', '');
  facts.append(createFact(dueLabel, `${time} ${formatDateGMT7(deadline.instant)}`));
  if (deadline.sourceText && deadline.timezone) facts.append(createFact('Giờ nguồn', `${formatSourceTime(deadline.sourceText)} ${deadline.timezone}`));
  const place = [edition.place, edition.format].filter(Boolean).join(' · ');
  if (place) facts.append(createFact('Địa điểm', place));
  const badges = createText('div', 'row__badges', '');
  badges.append(createQuality(deadline));
  const link = createText('a', 'row__link', 'Xem chi tiết hội nghị');
  link.href = detailUrl(edition);
  link.append(createIcon('right'));
  body.append(facts, badges, link);

  details.append(summary, body);
  const item = document.createElement('li');
  item.dataset.reveal = '';
  item.append(details);
  return item;
}

// ---------- ô "Hạn gần nhất" ở hero: mốc đầu của danh sách, đếm ngược bằng số mono lớn ----------
// Số và đơn vị tách thẻ để số to, chữ "giờ/phút/giây" nhỏ; giảm chuyển động thì bỏ giây (cập nhật mỗi phút).
function fillCount(element, now) {
  const ms = Number(element.dataset.count) - now;
  if (ms <= 0) {
    element.textContent = 'Đã hết hạn';
    return;
  }
  const parts = countdownParts(ms);
  if (reduceMotion) parts.pop();
  element.replaceChildren(createText('span', '', 'còn'), ...parts.map(([value, unit]) => {
    const part = createText('span', '', '');
    part.append(' ', createText('b', '', value), ` ${unit}`); // dấu cách thật để trình đọc màn hình không đọc dính "còn8"
    return part;
  }));
}

function renderNext(item, now) {
  nextCell.hidden = !item;
  if (!item) return;
  const { edition, deadline } = item;
  const name = createText('a', 'hero__next-name', editionTitle(edition));
  name.href = detailUrl(edition);
  const count = createText('p', 'hero__next-count', '');
  count.dataset.count = deadline.targetTime;
  fillCount(count, now);
  // Mức khẩn nằm ngay trong nhãn ô ("Hạn gần nhất · Gấp"), màu theo mức qua data-level
  const urgency = getUrgencyInfo(deadline.targetTime, now);
  const label = createText('p', 'hero__cell-title', 'Hạn gần nhất · ');
  label.append(createText('span', 'hero__next-level', urgency.label));
  nextCell.dataset.level = urgency.level;
  nextCell.replaceChildren(
    label,
    name,
    createText('p', 'hero__next-when', `${DUE_LABELS[deadline.type] || 'Hạn nộp'} ${formatTimeGMT7(deadline.instant)} ${formatDateGMT7(deadline.instant)}`),
    count,
  );
  watchReveal(nextCell.parentElement); // ô hiện sau khi dữ liệu về, có thể muộn hơn lúc bắt đầu theo dõi cuộn
}

// ---------- ô "Nguồn dữ liệu" ở hero: chỉ trình bày meta do TV1 cung cấp ----------
// Chưa có ngưỡng "dữ liệu cũ" (F38) nên chỉ cảnh báo khi đang dùng snapshot.
function renderSource(meta) {
  const isLive = meta.mode === 'live';
  const title = createText('p', 'hero__cell-title', 'Nguồn dữ liệu');
  if (!isLive) title.prepend(createIcon('alert'));
  const details = [];
  if (meta.loadedAt) details.push(`Tải lúc ${formatTimeGMT7(meta.loadedAt)} ${formatDateGMT7(meta.loadedAt)}`);
  if (!isLive && meta.fetchedAt) details.push(`Bản lưu tạo lúc ${formatDateGMT7(meta.fetchedAt)}`);
  details.push(meta.checkedAt ? `Kiểm chứng gần nhất ${formatDateGMT7(meta.checkedAt)}` : 'Chưa có lần kiểm chứng');
  sourceCell.classList.toggle('hero__cell--stale', !isLive);
  sourceCell.replaceChildren(
    title,
    createText('p', 'hero__source-mode', isLive ? 'Tải trực tiếp từ CCFDDL.' : 'Không kết nối được CCFDDL, đang dùng bản lưu sẵn (snapshot).'),
    createText('p', '', details.join(' · ')),
  );
}

async function initPage() {
  showState(host, { kind: 'loading', title: 'Đang tải dữ liệu', message: 'Vui lòng chờ.' });
  let catalog;
  try {
    catalog = await getCatalog();
  } catch (error) {
    console.error(error); // lỗi gốc (thường là tiếng Anh của trình duyệt) để debug; người dùng đọc câu tiếng Việt
    setLoaderStatus('Không tải được dữ liệu.');
    renderNext(null);
    showState(host, {
      kind: 'error', title: 'Không tải được dữ liệu', message: 'Kiểm tra kết nối mạng rồi thử lại.',
      action: { label: 'Thử lại', onClick: initPage },
    });
    return;
  }

  const now = Date.now(); // một mốc "bây giờ" cho cả lần render để lọc, mức khẩn và đếm ngược khớp nhau
  renderSource(catalog.meta);
  const total = catalog.editions.length.toLocaleString('vi-VN');
  setLoaderStatus(catalog.meta.mode === 'live' ? `Đã tải ${total} kỳ hội nghị` : `Đang dùng bản lưu sẵn · ${total} kỳ hội nghị`);
  const upcoming = pickUpcoming(catalog.editions, now);
  renderNext(upcoming[0], now);
  if (upcoming.length === 0) {
    showState(host, {
      kind: 'empty', title: 'Chưa có hạn nộp sắp tới', message: 'Xem toàn bộ danh sách để tìm hội nghị phù hợp.',
      action: { label: 'Xem tất cả hội nghị', href: ROUTES.conferences },
    });
    return;
  }

  // Mỗi nhóm: tiêu đề h3 + một <ol> riêng (start giữ số thứ tự chạy liên tục 01-06)
  host.replaceChildren(...groupByUrgency(upcoming, now).flatMap(({ urgency, start, items }) => {
    const list = createText('ol', 'rows', '');
    list.start = start + 1;
    list.append(...items.map((item, offset) => createRow(item, start + offset, now)));
    return [createGroupTitle(urgency), list];
  }));
  watchReveal(host);
}

// ---------- chuyển động ----------
let revealObserver = null;

// Mỗi khối [data-reveal] hiện lên khi cuộn tới; các khối cùng cha lệch nhịp theo --i.
function watchReveal(scope) {
  if (reduceMotion || !revealObserver) return;
  for (const element of scope.querySelectorAll('[data-reveal]:not(.is-visible)')) {
    const siblings = [...element.parentElement.children].filter((child) => child.hasAttribute('data-reveal'));
    element.style.setProperty('--i', siblings.indexOf(element));
    revealObserver.observe(element);
  }
}

function reveal() {
  root.classList.add('home-ready');
  if (reduceMotion) return;
  revealObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  }, { threshold: 0.15 });
  watchReveal(document);
}

// Màn tải chỉ để trang trí (aria-hidden) nhưng mọi chữ trên đó là thật: số kỳ hội nghị lấy từ catalog, đồng hồ là giờ Việt Nam.
const CLOCK_GMT7 = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

function setLoaderStatus(text) {
  const status = document.querySelector('[data-loader-status]');
  if (status) status.textContent = text;
}

// Nền màn tải co về đúng khung nửa tối của hero (desktop: nửa trái; di động: phần tối phía trên) rồi gỡ đi:
// chỗ nó dừng lại chính là nửa tối cùng màu, nên mắt thấy màn tải "biến thành" hero. Nội dung trồi lên sau đó.
function leaveLoader() {
  const loader = document.querySelector('.home-loader');
  const dark = document.querySelector('.hero__dark').getBoundingClientRect();
  const clamp = (value) => Math.min(1, Math.max(0, value));
  loader.style.setProperty('--loader-x', clamp(dark.right / loader.clientWidth));
  loader.style.setProperty('--loader-y', clamp(dark.bottom / loader.clientHeight));
  root.classList.add('home-leaving');
  setTimeout(() => { // 950ms = trễ 150ms + co 800ms trong home.css
    root.classList.remove('home-loading', 'home-leaving');
    reveal();
  }, 950);
}

// Bộ đếm màn tải (aria-hidden): chạy dần tới 90 khi chờ dữ liệu, lên 100 khi có dữ liệu.
function playLoader(ready) {
  if (!root.classList.contains('home-loading')) {
    reveal();
    return;
  }
  const count = document.querySelector('[data-loader-count]');
  const clock = document.querySelector('[data-loader-clock]');
  const bar = document.querySelector('[data-loader-bar]');
  const start = performance.now();
  let progress = 0;
  let last = start;
  let finished = false;
  const finish = () => { finished = true; };
  ready.finally(() => setTimeout(finish, Math.max(0, MIN_LOADER_MS - (performance.now() - start))));
  setTimeout(finish, MAX_LOADER_MS);

  const frame = (time) => {
    const target = finished ? 1 : Math.min(0.9, (time - start) / 1800);
    // bám theo thời gian thực chứ không theo số khung hình: máy chậm hay tab bị giảm khung hình vẫn xong đúng lúc
    progress += (target - progress) * (1 - Math.exp(-(time - last) / 120));
    last = time;
    count.textContent = String(Math.round(progress * 100)).padStart(3, '0');
    clock.textContent = `${CLOCK_GMT7.format(Date.now())} GMT+7`;
    bar.style.setProperty('--progress', progress.toFixed(3));
    if (finished && progress > 0.99) {
      count.textContent = '100';
      leaveLoader();
      return;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

// Đếm ngược chạy mỗi giây (giảm chuyển động: mỗi phút, chữ không có giây); dừng khi tab bị ẩn để không tốn pin.
function startTicking() {
  let timer = null;
  const tick = () => {
    const now = Date.now();
    for (const ticker of document.querySelectorAll('[data-target]')) {
      ticker.textContent = tickerText(Number(ticker.dataset.target), now);
    }
    for (const count of document.querySelectorAll('[data-count]')) fillCount(count, now);
  };
  const sync = () => {
    clearInterval(timer);
    if (document.hidden) return;
    tick();
    timer = setInterval(tick, reduceMotion ? 60000 : 1000);
  };
  document.addEventListener('visibilitychange', sync);
  sync();
}

// Header ẩn khi đang ở hero, hiện khi đầu mục "Hạn nộp sắp tới" lên tới 40% chiều cao màn hình (và mọi chỗ bên dưới).
function autoHideHeader() {
  if (!header || !upcomingSection) return;
  root.classList.add('home-header-auto');
  new IntersectionObserver(([entry]) => {
    header.classList.toggle('is-shown', entry.isIntersecting || entry.boundingClientRect.top < 0);
  }, { rootMargin: '0px 0px -60% 0px' }).observe(upcomingSection);
}

playLoader(initPage());
startTicking();
autoHideHeader();
