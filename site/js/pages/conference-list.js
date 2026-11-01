import { createIcon, initCommonUI } from '../common.js';
import { getCatalog } from '../data-service.js';
import {
  formatDateGMT7,
  formatTimeGMT7,
  getCountdownText,
  getNextSubmission,
  getUrgencyInfo,
} from '../deadline-utils.js';
import { ROUTES } from '../routes.js';
import { getSavedIds, toggleSaved } from '../saved-store.js';
import { showState } from '../ui/state.js';
import {
  DEFAULT_STATE,
  applyFilters,
  paginate,
  parseState,
  serializeState,
  sortEditions,
} from './explore-state.js';

initCommonUI('explore');

const host = document.querySelector('#page-content');
const filterRoot = document.querySelector('#filter-root');
const resultStatus = document.querySelector('#result-status');
const activeFilters = document.querySelector('#active-filters');
const paginationRoot = document.querySelector('#pagination');

let catalog = { editions: [] };
let state = { ...DEFAULT_STATE, fields: [], ccf: [], core: [], mode: [] };
let validFields = [];
let savedIds = [];

const KIND_LABELS = { any: 'Mọi hạn nộp', abstract: 'Abstract', paper: 'Full paper' };
const WINDOW_LABELS = { all: 'Mọi thời điểm', 7: '7 ngày tới', 14: '14 ngày tới', 30: '30 ngày tới', 90: '90 ngày tới' };
const SORT_LABELS = { deadline: 'Hạn gần nhất', name: 'Tên A–Z', ccf: 'Hạng CCF', core: 'Hạng CORE' };

function copyDefaultState() {
  return { ...DEFAULT_STATE, fields: [], ccf: [], core: [], mode: [] };
}

function setState(nextState, { addHistory = true } = {}) {
  state = { ...nextState, page: Number(nextState.page) || 1 };
  const params = serializeState(state, { validFields });
  const url = `${window.location.pathname}${params.size ? `?${params}` : ''}`;
  window.history[addHistory ? 'pushState' : 'replaceState']({}, '', url);
  renderPage();
}

function changeFilters(patch) {
  setState({ ...state, ...patch, page: 1 });
}

function createSelectField(labelText, name, options) {
  const label = document.createElement('label');
  label.className = 'field';
  label.textContent = labelText;
  const select = document.createElement('select');
  select.name = name;
  for (const [value, text] of Object.entries(options)) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    select.append(option);
  }
  label.append(select);
  return { label, select };
}

function renderFilters() {
  const form = document.createElement('form');
  form.className = 'explore-filters';
  form.setAttribute('role', 'search');

  const searchRow = document.createElement('div');
  searchRow.className = 'explore-filters__search';
  const searchLabel = document.createElement('label');
  searchLabel.className = 'field';
  searchLabel.htmlFor = 'conference-query';
  searchLabel.textContent = 'Tìm theo tên hoặc tên viết tắt';
  const search = document.createElement('input');
  search.id = 'conference-query';
  search.name = 'q';
  search.type = 'search';
  search.maxLength = 100;
  search.value = state.q;
  search.placeholder = 'Ví dụ: ICSE, trí tuệ nhân tạo…';
  searchLabel.append(search);
  const searchButton = document.createElement('button');
  searchButton.type = 'submit';
  searchButton.className = 'button explore-filters__search-button';
  searchButton.append(createIcon('search'), 'Tìm kiếm');
  searchRow.append(searchLabel, searchButton);

  const controls = document.createElement('div');
  controls.className = 'explore-filters__controls';
  const kind = createSelectField('Loại hạn', 'kind', KIND_LABELS);
  kind.select.value = state.kind;
  const windowField = createSelectField('Khoảng thời gian', 'window', WINDOW_LABELS);
  windowField.select.value = state.window;
  const sort = createSelectField('Sắp xếp', 'sort', SORT_LABELS);
  sort.select.value = state.sort;

  const pastLabel = document.createElement('label');
  pastLabel.className = 'option explore-filters__past';
  const past = document.createElement('input');
  past.type = 'checkbox';
  past.name = 'past';
  past.checked = state.past;
  pastLabel.append(past, 'Hiện hạn đã qua');

  const actions = document.createElement('div');
  actions.className = 'explore-filters__actions';
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'button button--ghost';
  reset.append(createIcon('refresh'), 'Đặt lại');
  actions.append(reset);
  controls.append(kind.label, windowField.label, sort.label, pastLabel, actions);
  form.append(searchRow, controls);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    changeFilters({ q: search.value.trim() });
  });
  kind.select.addEventListener('change', () => changeFilters({ kind: kind.select.value }));
  windowField.select.addEventListener('change', () => changeFilters({ window: windowField.select.value }));
  sort.select.addEventListener('change', () => changeFilters({ sort: sort.select.value }));
  past.addEventListener('change', () => changeFilters({ past: past.checked }));
  reset.addEventListener('click', () => setState(copyDefaultState()));
  filterRoot.replaceChildren(form);
}

function removeArrayValue(key, value) {
  changeFilters({ [key]: state[key].filter((item) => item !== value) });
}

function addActiveChip(label, onRemove) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'filter-chip';
  button.append(label, createIcon('x'));
  button.setAttribute('aria-label', `Bỏ bộ lọc ${label}`);
  button.addEventListener('click', onRemove);
  activeFilters.append(button);
}

function renderActiveFilters() {
  activeFilters.replaceChildren();
  const entries = [];
  if (state.q) entries.push([`Từ khóa: ${state.q}`, () => changeFilters({ q: '' })]);
  state.fields.forEach((value) => entries.push([`Lĩnh vực: ${value}`, () => removeArrayValue('fields', value)]));
  state.ccf.forEach((value) => entries.push([`CCF ${value}`, () => removeArrayValue('ccf', value)]));
  state.core.forEach((value) => entries.push([`CORE ${value}`, () => removeArrayValue('core', value)]));
  state.mode.forEach((value) => entries.push([`Hình thức: ${value}`, () => removeArrayValue('mode', value)]));
  if (state.kind !== DEFAULT_STATE.kind) entries.push([`Loại: ${KIND_LABELS[state.kind]}`, () => changeFilters({ kind: DEFAULT_STATE.kind })]);
  if (state.window !== DEFAULT_STATE.window) entries.push([`Hạn: ${WINDOW_LABELS[state.window]}`, () => changeFilters({ window: DEFAULT_STATE.window })]);
  if (state.past) entries.push(['Có hạn đã qua', () => changeFilters({ past: false })]);
  if (state.sort !== DEFAULT_STATE.sort) entries.push([`Xếp: ${SORT_LABELS[state.sort]}`, () => changeFilters({ sort: DEFAULT_STATE.sort })]);
  if (entries.length) {
    const label = document.createElement('span');
    label.className = 'active-filters__label';
    label.textContent = 'Đang lọc:';
    activeFilters.append(label);
    entries.forEach(([text, action]) => addActiveChip(text, action));
  }
}

function createRibbon(system, rank) {
  const ribbon = document.createElement('span');
  const rankClass = rank === 'A*' ? 'core-a-star' : String(rank).toLocaleLowerCase('vi');
  ribbon.className = `ribbon ribbon--${rankClass}`;
  ribbon.textContent = `${system} ${rank}`;
  return ribbon;
}

function createSaveButton(edition, card) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'icon-button badge-card__save conference-card__save';
  const update = () => {
    const saved = savedIds.includes(edition.id);
    button.setAttribute('aria-pressed', String(saved));
    button.setAttribute('aria-label', saved ? `Bỏ lưu ${edition.acronym}` : `Lưu ${edition.acronym}`);
  };
  button.append(createIcon('star'));
  update();
  button.addEventListener('click', () => {
    const result = toggleSaved(edition.id);
    if (!result.ok) {
      let message = card.querySelector('.conference-card__save-message');
      if (!message) {
        message = document.createElement('p');
        message.className = 'conference-card__save-message';
        card.append(message);
      }
      message.textContent = result.error;
      return;
    }
    savedIds = result.ids;
    update();
  });
  return button;
}

function createConferenceCard(item, now) {
  const { edition, submission } = item;
  const card = document.createElement('article');
  card.className = `badge-card${submission.status === 'closed' ? ' badge-card--closed' : ''}`;

  const main = document.createElement('div');
  main.className = 'badge-card__main';
  const title = document.createElement('h2');
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
  const ranks = document.createElement('div');
  ranks.className = 'conference-card__rank-list';
  if (edition.ranks?.core) ranks.append(createRibbon('CORE', edition.ranks.core));
  if (edition.ranks?.ccf) ranks.append(createRibbon('CCF', edition.ranks.ccf));
  const place = document.createElement('span');
  place.className = 'badge-card__place';
  place.textContent = [edition.format, edition.place].filter(Boolean).join(' · ') || 'Chưa rõ hình thức';
  meta.append(ranks, place);
  main.append(title, fullName, meta);

  const due = document.createElement('div');
  due.className = 'badge-card__due';
  const dueLabel = document.createElement('span');
  dueLabel.className = 'badge-card__due-label';
  dueLabel.textContent = submission.deadline?.type === 'abstract'
    ? 'Hạn abstract'
    : submission.deadline?.type === 'paper' ? 'Hạn full paper' : 'Hạn nộp';
  due.append(dueLabel);
  const deadline = submission.deadline;
  const instant = deadline?.instant ? Date.parse(deadline.instant) : Number.NaN;
  if (Number.isFinite(instant) && deadline.precision === 'instant' && !['estimated', 'tba'].includes(deadline.quality)) {
    const date = document.createElement('span');
    date.className = 'badge-card__date';
    date.textContent = formatDateGMT7(deadline.instant);
    const time = document.createElement('span');
    time.className = 'badge-card__time';
    time.textContent = formatTimeGMT7(deadline.instant);
    due.append(date, time);
  } else {
    const unknown = document.createElement('span');
    unknown.className = 'conference-card__deadline-empty';
    unknown.textContent = deadline?.sourceText || 'Chưa xác định';
    due.append(unknown);
  }

  const status = document.createElement('div');
  status.className = 'badge-card__state';
  const targetTime = Number.isFinite(instant) ? instant : Number.NaN;
  const urgency = getUrgencyInfo(targetTime, now);
  const urgencyBadge = document.createElement('span');
  urgencyBadge.className = `urgency ${urgency.className}`;
  urgencyBadge.append(createIcon(urgency.icon), urgency.label);
  const countdown = document.createElement('span');
  countdown.className = 'badge-card__countdown';
  countdown.textContent = Number.isFinite(targetTime)
    ? getCountdownText(targetTime, now)
    : 'Chưa rõ thời gian';
  status.append(urgencyBadge, countdown);

  card.append(main, due, status, createSaveButton(edition, card));
  return card;
}

function stateUrl(page) {
  const params = serializeState({ ...state, page }, { validFields });
  return `${window.location.pathname}${params.size ? `?${params}` : ''}`;
}

function createPageButton(label, page, { current = false, disabled = false } = {}) {
  const link = document.createElement('a');
  link.className = 'pager__item';
  link.textContent = label;
  link.href = stateUrl(page);
  if (current) link.setAttribute('aria-current', 'page');
  if (disabled) link.setAttribute('aria-disabled', 'true');
  if (!disabled && !current) {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      setState({ ...state, page });
      document.querySelector('#result-status')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  return link;
}

function renderPagination(pageInfo) {
  if (pageInfo.totalPages <= 1) {
    paginationRoot.replaceChildren();
    return;
  }
  const pager = document.createElement('div');
  pager.className = 'pager';
  const summary = document.createElement('p');
  summary.className = 'pager__summary';
  summary.textContent = `Trang ${pageInfo.page}/${pageInfo.totalPages}`;
  const list = document.createElement('div');
  list.className = 'pager__list';
  list.append(createPageButton('Trước', pageInfo.page - 1, { disabled: pageInfo.page === 1 }));
  for (let page = 1; page <= pageInfo.totalPages; page += 1) {
    if (page === 1 || page === pageInfo.totalPages || Math.abs(page - pageInfo.page) <= 1) {
      list.append(createPageButton(String(page), page, { current: page === pageInfo.page }));
    }
  }
  list.append(createPageButton('Sau', pageInfo.page + 1, { disabled: pageInfo.page === pageInfo.totalPages }));
  pager.append(summary, list);
  paginationRoot.replaceChildren(pager);
}

function renderPage() {
  renderFilters();
  renderActiveFilters();
  // Chốt một mốc now cho toàn bộ lượt lọc, sort, render để các card không lệch nhau.
  const now = Date.now();
  const filtered = applyFilters(catalog.editions, state, {
    now,
    validFields,
    getNextSubmission,
  });
  const sorted = sortEditions(filtered, state);
  const pageInfo = paginate(sorted, state.page);
  if (pageInfo.page !== state.page) {
    state = { ...state, page: pageInfo.page };
    const params = serializeState(state, { validFields });
    window.history.replaceState({}, '', `${window.location.pathname}${params.size ? `?${params}` : ''}`);
  }
  resultStatus.textContent = pageInfo.total
    ? `Tìm thấy ${pageInfo.total} hội nghị · đang hiển thị ${pageInfo.start + 1}–${pageInfo.end}`
    : 'Không tìm thấy hội nghị phù hợp';
  if (!pageInfo.total) {
    showState(host, {
      title: 'Không có kết quả phù hợp',
      message: 'Hãy thử khoảng thời gian rộng hơn hoặc đặt lại bộ lọc.',
      action: { label: 'Đặt lại bộ lọc', onClick: () => setState(copyDefaultState()) },
    });
    paginationRoot.replaceChildren();
    return;
  }
  const list = document.createElement('ol');
  list.className = 'conference-list badge-list';
  pageInfo.items.forEach((item) => {
    const row = document.createElement('li');
    row.append(createConferenceCard(item, now));
    list.append(row);
  });
  host.replaceChildren(list);
  renderPagination(pageInfo);
}

async function initPage() {
  showState(host, { kind: 'loading', title: 'Đang tải dữ liệu', message: 'Vui lòng chờ.' });
  try {
    catalog = await getCatalog();
    validFields = [...new Set(catalog.editions.flatMap((edition) => edition.fields || []))].sort();
    const saved = getSavedIds();
    savedIds = saved.ids;
    state = parseState(window.location.search, { validFields });
    renderPage();
  } catch (error) {
    showState(host, { kind: 'error', title: 'Không tải được dữ liệu', message: error.message });
  }
}

window.addEventListener('popstate', () => {
  state = parseState(window.location.search, { validFields });
  renderPage();
});

window.addEventListener('saved:changed', (event) => {
  savedIds = Array.isArray(event.detail?.ids) ? event.detail.ids : savedIds;
});

initPage();
