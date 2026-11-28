import { createIcon, initCommonUI } from '../common.js';
import { getCatalog } from '../data-service.js';
import { getNextSubmission } from '../deadline-utils.js';
import { getSavedIds } from '../saved-store.js';
import { createDataNotice, createEditionCard, FIELD_LABELS } from '../ui/edition-card.js';
import { showState } from '../ui/state.js';
import { REGION_LABELS, REGION_TREE } from '../place-utils.js';
import {
  DEFAULT_STATE,
  applyFilters,
  countByPlace,
  countHiddenPast,
  findNextDeadlineTime,
  normalizeState,
  PAGE_SIZE,
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
const noticeRoot = document.querySelector('#data-source-notice');

let catalog = { editions: [] };
let state = copyDefaultState();
let validFields = [];
let savedIds = [];
let searchTimer = null;
let deadlineTimer = null;

const MAX_TIMEOUT = 2_147_000_000;

// Các nhãn này nằm gần phần giao diện để người đọc dễ sửa chữ hiển thị.
const KIND_LABELS = { any: 'Mọi hạn nộp', abstract: 'Abstract', paper: 'Full paper' };
const WINDOW_LABELS = { all: 'Mọi thời điểm', 7: '7 ngày tới', 14: '14 ngày tới', 30: '30 ngày tới', 90: '90 ngày tới', 180: '180 ngày tới' };
// Chip nhanh dưới ô tìm kiếm: những khu vực người học ở Việt Nam hay chọn nhất (theo góp ý của giảng viên).
const QUICK_REGIONS = ['vietnam', 'sea', 'asia', 'europe', 'north-america'];
const COUNTRY_NAMES = new Intl.DisplayNames(['vi'], { type: 'region' });
const countryName = (code) => { try { return COUNTRY_NAMES.of(code) ?? code; } catch { return code; } };
const SORT_LABELS = { deadline: 'Hạn gần nhất', name: 'Tên A–Z', ccf: 'Hạng CCF', core: 'Hạng CORE' };
const CCF_OPTIONS = { A: 'CCF A', B: 'CCF B', C: 'CCF C' };
const CORE_OPTIONS = { 'A*': 'CORE A*', A: 'CORE A', B: 'CORE B', C: 'CORE C' };
const MODE_OPTIONS = { online: 'Online', offline: 'Offline', hybrid: 'Hybrid' };
function copyDefaultState() {
  return { ...DEFAULT_STATE, fields: [], ccf: [], core: [], mode: [], region: [], country: '' };
}

function getStateUrl(nextState = state) {
  const params = serializeState(nextState, { validFields });
  const query = params.size ? `?${params}` : '';
  return `${window.location.pathname}${query}${window.location.hash}`;
}

function writeStateUrl({ addHistory = true } = {}) {
  const url = getStateUrl();
  if (addHistory) {
    window.history.pushState({}, '', url);
  } else {
    window.history.replaceState({}, '', url);
  }
}

function setState(nextState, { addHistory = true, refreshFilters = true } = {}) {
  clearTimeout(searchTimer);
  searchTimer = null;
  state = normalizeState(nextState, { validFields });
  writeStateUrl({ addHistory });
  renderPage({ refreshFilters });
}

function changeFilters(patch, options = {}) {
  const search = document.querySelector('#conference-query');
  const query = Object.hasOwn(patch, 'q') ? patch.q : (search?.value ?? state.q);
  setState({ ...state, ...patch, q: query, page: 1 }, options);
}

function scheduleDeadlineRefresh(now) {
  clearTimeout(deadlineTimer);
  deadlineTimer = null;

  const nextTime = findNextDeadlineTime(
    catalog.editions,
    state.kind,
    now,
    getNextSubmission,
  );
  if (nextTime == null) return;

  // Chỉ render lại đúng lúc deadline đổi trạng thái, không chạy timer mỗi giây.
  let delay = nextTime - now + 100;
  if (delay < 100) delay = 100;
  if (delay > MAX_TIMEOUT) delay = MAX_TIMEOUT;
  deadlineTimer = setTimeout(renderResults, delay);
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

function toggleArrayFilter(key, value, checked) {
  let next = state[key].filter((item) => item !== value);
  if (checked) next.push(value);
  changeFilters({ [key]: next });
}

function createCheckboxGroup(titleText, key, options) {
  const fieldset = document.createElement('fieldset');
  fieldset.className = 'explore-filter-group';
  const legend = document.createElement('legend');
  legend.className = 'visually-hidden';
  legend.textContent = titleText;
  const optionList = document.createElement('div');
  optionList.className = 'explore-filter-group__options';
  for (const [value, labelText] of Object.entries(options)) {
    const label = document.createElement('label');
    label.className = 'option';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = key;
    input.value = value;
    input.dataset.focusKey = `opt:${key}:${value}`;
    input.checked = state[key].includes(value);
    input.addEventListener('change', () => toggleArrayFilter(key, value, input.checked));
    label.append(input, labelText);
    optionList.append(label);
  }
  fieldset.append(legend, optionList);
  return fieldset;
}

// Nhóm lọc thu gọn dùng chung kiểu .filter-group; tiêu đề ghi số lựa chọn đang bật.
function createFilterGroup(key, title, selectedCount, body, open) {
  const group = document.createElement('details');
  group.className = 'filter-group';
  group.dataset.group = key;
  group.open = open;
  const summary = document.createElement('summary');
  summary.className = 'filter-group__summary';
  summary.dataset.focusKey = `group:${key}`;
  const chevron = createIcon('down');
  chevron.classList.add('filter-group__chevron');
  summary.append(selectedCount ? `${title} (${selectedCount})` : title, chevron);
  const content = document.createElement('div');
  content.className = 'filter-group__body';
  content.append(...body);
  group.append(summary, content);
  return group;
}

function filterOptions(now = Date.now()) {
  return { now, validFields, getNextSubmission };
}

// Một ô chọn khu vực kèm số kỳ; khu vực con thụt vào trong khu vực cha.
function createRegionOption(code, count, child) {
  const label = document.createElement('label');
  label.className = `option region-option${child ? ' region-option--child' : ''}`;
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.name = 'region';
  input.value = code;
  input.dataset.focusKey = `opt:region:${code}`;
  input.checked = state.region.includes(code);
  input.addEventListener('change', () => toggleArrayFilter('region', code, input.checked));
  const count_ = document.createElement('span');
  count_.className = 'region-option__count';
  count_.textContent = String(count);
  label.append(input, REGION_LABELS[code], count_);
  return label;
}

// Cây khu vực lấy từ place-utils.js: Châu Á (Việt Nam, Đông Nam Á, Đông Á…), Châu Âu, Châu Mỹ (Bắc Mỹ, Mỹ Latinh)…
function createRegionTree(counts) {
  const fieldset = document.createElement('fieldset');
  fieldset.className = 'explore-filter-group';
  const legend = document.createElement('legend');
  legend.className = 'visually-hidden';
  legend.textContent = 'Khu vực tổ chức';
  const list = document.createElement('div');
  list.className = 'explore-filter-group__options';
  for (const node of REGION_TREE) {
    list.append(createRegionOption(node.code, counts.regions[node.code] ?? 0, false));
    for (const child of node.children) list.append(createRegionOption(child.code, counts.regions[child.code] ?? 0, true));
  }
  fieldset.append(legend, list);
  return fieldset;
}

// Ô chọn một quốc gia cụ thể (tên tiếng Việt, kèm số kỳ), cộng dồn với khu vực đã chọn.
function createCountrySelect(counts) {
  const label = document.createElement('label');
  label.className = 'field';
  label.textContent = 'Hoặc một quốc gia';
  const select = document.createElement('select');
  select.name = 'country';
  select.dataset.focusKey = 'country';
  const all = document.createElement('option');
  all.value = '';
  all.textContent = 'Mọi quốc gia';
  select.append(all);
  const codes = Object.keys(counts.countries);
  if (state.country && !codes.includes(state.country)) codes.push(state.country);
  codes
    .map((code) => [code, countryName(code)])
    .sort((a, b) => a[1].localeCompare(b[1], 'vi'))
    .forEach(([code, name]) => {
      const option = document.createElement('option');
      option.value = code;
      option.textContent = `${name} (${counts.countries[code] ?? 0})`;
      select.append(option);
    });
  select.value = state.country;
  select.addEventListener('change', () => changeFilters({ country: select.value }));
  label.append(select);
  return label;
}

// Chip nhanh theo khu vực: bấm là bật/tắt đúng khu vực đó, không cần mở nhóm lọc.
function createQuickRegions() {
  const row = document.createElement('div');
  row.className = 'explore-quick';
  row.setAttribute('role', 'group');
  row.setAttribute('aria-label', 'Lọc nhanh theo khu vực');
  for (const code of QUICK_REGIONS) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.dataset.focusKey = `quick:${code}`;
    const pressed = state.region.includes(code);
    chip.setAttribute('aria-pressed', String(pressed));
    const face = document.createElement('span');
    face.className = 'chip__face';
    face.textContent = REGION_LABELS[code];
    chip.append(face);
    chip.addEventListener('click', () => toggleArrayFilter('region', code, !pressed));
    row.append(chip);
  }
  return row;
}

function renderFilters() {
  const placeCounts = countByPlace(catalog.editions, state, filterOptions());
  const form = document.createElement('form');
  form.className = 'explore-filters';
  form.setAttribute('role', 'search');

  const searchRow = document.createElement('div');
  searchRow.className = 'explore-filters__search';
  const searchLabel = document.createElement('label');
  searchLabel.className = 'field';
  searchLabel.htmlFor = 'conference-query';
  searchLabel.textContent = 'Tên hoặc tên viết tắt';
  const search = document.createElement('input');
  search.id = 'conference-query';
  search.dataset.focusKey = 'q';
  search.name = 'q';
  search.type = 'search';
  search.maxLength = 100;
  search.value = state.q;
  search.placeholder = 'Ví dụ: ICSE, AI…';
  searchLabel.append(search);
  const searchButton = document.createElement('button');
  searchButton.type = 'submit';
  searchButton.dataset.focusKey = 'search-submit';
  searchButton.className = 'button explore-filters__search-button';
  const searchText = document.createElement('span');
  searchText.className = 'visually-hidden';
  searchText.textContent = 'Tìm kiếm';
  searchButton.append(createIcon('search'), searchText);
  searchRow.append(searchLabel, searchButton);

  const fieldOptions = {};
  for (const field of validFields) fieldOptions[field] = FIELD_LABELS[field] || field;

  const kind = createSelectField('Loại hạn', 'kind', KIND_LABELS);
  kind.select.value = state.kind;
  const windowField = createSelectField('Khoảng thời gian', 'window', WINDOW_LABELS);
  windowField.select.value = state.window;
  const sort = createSelectField('Sắp xếp', 'sort', SORT_LABELS);
  sort.select.value = state.sort;
  kind.select.dataset.focusKey = 'kind';
  windowField.select.dataset.focusKey = 'window';
  sort.select.dataset.focusKey = 'sort';

  const pastLabel = document.createElement('label');
  pastLabel.className = 'option';
  const past = document.createElement('input');
  past.type = 'checkbox';
  past.name = 'past';
  past.checked = state.past;
  past.dataset.focusKey = 'past';
  pastLabel.append(past, 'Hiện hạn đã qua');

  const head = document.createElement('div');
  head.className = 'explore-filters__head';
  const headTitle = document.createElement('h2');
  headTitle.className = 'explore-filters__title';
  headTitle.textContent = 'Bộ lọc';
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.dataset.focusKey = 'reset';
  reset.className = 'button button--ghost';
  reset.append(createIcon('refresh'), 'Đặt lại');
  head.append(headTitle, reset);

  const deadlineCount = ['kind', 'window', 'past'].filter((key) => state[key] !== DEFAULT_STATE[key]).length;
  const groupSpecs = [
    ['fields', 'Lĩnh vực', state.fields.length, [createCheckboxGroup('Lĩnh vực', 'fields', fieldOptions)]],
    ['ccf', 'CCF', state.ccf.length, [createCheckboxGroup('Xếp hạng CCF', 'ccf', CCF_OPTIONS)]],
    ['core', 'CORE', state.core.length, [createCheckboxGroup('Hạng CORE', 'core', CORE_OPTIONS)]],
    ['place', 'Khu vực', state.region.length + (state.country ? 1 : 0), [createRegionTree(placeCounts), createCountrySelect(placeCounts)]],
    ['mode', 'Hình thức', state.mode.length, [createCheckboxGroup('Hình thức', 'mode', MODE_OPTIONS)]],
    ['deadline', 'Hạn nộp', deadlineCount, [kind.label, windowField.label, pastLabel]],
  ];
  const groups = document.createElement('div');
  groups.className = 'explore-groups';
  for (const [key, title, count, body] of groupSpecs) {
    // Giữ nhóm đang mở/đóng qua mỗi lần dựng lại; lần đầu thì mở nhóm đang có lựa chọn.
    const previous = filterRoot.querySelector(`[data-group="${key}"]`);
    groups.append(createFilterGroup(key, title, count, body, previous ? previous.open : count > 0));
  }
  form.append(head, searchRow, createQuickRegions(), sort.label, groups);

  function updateSearch() {
    changeFilters(
      { q: search.value.trim() },
      { addHistory: false, refreshFilters: false },
    );
  }

  search.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(updateSearch, 250);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearTimeout(searchTimer);
    updateSearch();
  });
  kind.select.addEventListener('change', () => changeFilters({ kind: kind.select.value }));
  windowField.select.addEventListener('change', () => changeFilters({ window: windowField.select.value }));
  sort.select.addEventListener('change', () => changeFilters({ sort: sort.select.value }));
  past.addEventListener('change', () => changeFilters({ past: past.checked }));
  reset.addEventListener('click', () => setState(copyDefaultState()));
  // Dựng lại form làm mất focus, nên nhớ control đang focus rồi trả lại đúng chỗ.
  const focusedKey = filterRoot.contains(document.activeElement) ? document.activeElement.dataset.focusKey : null;
  filterRoot.replaceChildren(form);
  if (focusedKey) {
    filterRoot.querySelector(`[data-focus-key="${CSS.escape(focusedKey)}"]`)?.focus({ preventScroll: true });
  }
}

function focusResultStatus() {
  resultStatus.focus({ preventScroll: true });
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
  button.addEventListener('click', () => {
    const index = [...activeFilters.querySelectorAll('.filter-chip')].indexOf(button);
    const hadFocus = document.activeElement === button;
    onRemove();
    if (!hadFocus) return;
    const chips = activeFilters.querySelectorAll('.filter-chip');
    if (chips.length) chips[Math.min(index, chips.length - 1)].focus();
    else focusResultStatus();
  });
  activeFilters.append(button);
}

function renderActiveFilters() {
  activeFilters.replaceChildren();
  const entries = [];
  if (state.q) entries.push([`Từ khóa: ${state.q}`, () => changeFilters({ q: '' })]);
  for (const value of state.fields) entries.push([`Lĩnh vực: ${value}`, () => removeArrayValue('fields', value)]);
  for (const value of state.ccf) entries.push([`CCF ${value}`, () => removeArrayValue('ccf', value)]);
  for (const value of state.core) entries.push([`CORE ${value}`, () => removeArrayValue('core', value)]);
  for (const value of state.region) entries.push([`Khu vực: ${REGION_LABELS[value]}`, () => removeArrayValue('region', value)]);
  if (state.country) entries.push([`Quốc gia: ${countryName(state.country)}`, () => changeFilters({ country: '' })]);
  for (const value of state.mode) entries.push([`Hình thức: ${value}`, () => removeArrayValue('mode', value)]);
  if (state.kind !== DEFAULT_STATE.kind) entries.push([`Loại: ${KIND_LABELS[state.kind]}`, () => changeFilters({ kind: DEFAULT_STATE.kind })]);
  if (state.window !== DEFAULT_STATE.window) entries.push([`Hạn: ${WINDOW_LABELS[state.window]}`, () => changeFilters({ window: DEFAULT_STATE.window })]);
  if (state.past) entries.push(['Có hạn đã qua', () => changeFilters({ past: false })]);
  if (state.sort !== DEFAULT_STATE.sort) entries.push([`Xếp: ${SORT_LABELS[state.sort]}`, () => changeFilters({ sort: DEFAULT_STATE.sort })]);
  if (entries.length) {
    const label = document.createElement('span');
    label.className = 'active-filters__label';
    label.textContent = 'Đang lọc:';
    activeFilters.append(label);
    for (const [text, action] of entries) addActiveChip(text, action);
  }
}

function stateUrl(page) {
  return getStateUrl({ ...state, page });
}

// Markup theo .pager trong components.html. Nút vô hiệu là <button disabled> để không còn href bấm được.
function createPageButton(label, page, { current = false, disabled = false, ariaLabel } = {}) {
  const control = document.createElement(disabled ? 'button' : 'a');
  control.className = 'pager__item';
  control.append(label);
  if (ariaLabel) control.setAttribute('aria-label', ariaLabel);
  if (disabled) {
    control.type = 'button';
    control.disabled = true;
  } else {
    control.href = stateUrl(page);
    if (current) control.setAttribute('aria-current', 'page');
    control.addEventListener('click', (event) => {
      // Ctrl/Cmd/Shift + click vẫn mở tab hoặc cửa sổ mới như link thường.
      if (event.ctrlKey || event.metaKey || event.shiftKey) return;
      event.preventDefault();
      if (current) return;
      const search = document.querySelector('#conference-query');
      setState({ ...state, q: search?.value ?? state.q, page });
      focusResultStatus();
      const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
      resultStatus.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    });
  }
  const item = document.createElement('li');
  item.append(control);
  return item;
}

function createPageGap() {
  const item = document.createElement('li');
  item.setAttribute('aria-hidden', 'true');
  item.textContent = '…';
  return item;
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
  const list = document.createElement('ul');
  list.className = 'pager__list';
  list.append(createPageButton(createIcon('left'), pageInfo.page - 1, { disabled: pageInfo.page === 1, ariaLabel: 'Trang trước' }));
  let lastShown = 0;
  for (let page = 1; page <= pageInfo.totalPages; page += 1) {
    if (page === 1 || page === pageInfo.totalPages || Math.abs(page - pageInfo.page) <= 1) {
      if (page - lastShown > 1) list.append(createPageGap());
      list.append(createPageButton(String(page), page, { current: page === pageInfo.page }));
      lastShown = page;
    }
  }
  list.append(createPageButton(createIcon('right'), pageInfo.page + 1, { disabled: pageInfo.page === pageInfo.totalPages, ariaLabel: 'Trang sau' }));
  pager.append(summary, list);
  paginationRoot.replaceChildren(pager);
}

function renderResults() {
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
  scheduleDeadlineRefresh(now);
  if (pageInfo.page !== state.page) {
    state = { ...state, page: pageInfo.page };
    writeStateUrl({ addHistory: false });
  }
  if (pageInfo.total > 0) {
    resultStatus.textContent = `Tìm thấy ${pageInfo.total} hội nghị · đang hiển thị ${pageInfo.start + 1}–${pageInfo.end}`;
  } else {
    resultStatus.textContent = 'Tìm thấy 0 hội nghị · đang hiển thị 0–0';
  }
  // Số kỳ khớp mọi điều kiện nhưng đang ẩn vì đã hết hạn: báo ra thay vì để người dùng tưởng không có.
  const hiddenPast = countHiddenPast(catalog.editions, state, { now, validFields, getNextSubmission });
  const showPast = () => {
    changeFilters({ past: true });
    focusResultStatus();
  };
  if (!pageInfo.total) {
    showState(host, hiddenPast > 0
      ? {
        title: `Có ${hiddenPast} kỳ khớp nhưng đã hết hạn nộp`,
        message: 'Các kỳ này đang ẩn vì đã qua hạn. Bạn có thể xem để biết thời điểm nộp của kỳ sau.',
        action: { label: 'Xem cả hạn đã qua', onClick: showPast },
      }
      : {
        title: 'Không có kết quả phù hợp',
        message: 'Thử đổi từ khóa, nới bộ lọc hoặc đặt lại.',
        action: {
          label: 'Đặt lại bộ lọc',
          onClick: () => {
            setState(copyDefaultState());
            focusResultStatus();
          },
        },
      });
    paginationRoot.replaceChildren();
    return;
  }
  const list = document.createElement('ol');
  list.className = 'badge-list';
  pageInfo.items.forEach((item) => {
    const row = document.createElement('li');
    row.append(createEditionCard(item, { now, savedIds, onSavedChange: (ids) => { savedIds = ids; } }));
    list.append(row);
  });
  const nodes = [list];
  // Chỉ nhắc khi đang tìm theo tên hoặc còn ít kết quả; lúc duyệt mặc định có hàng nghìn kỳ cũ, nhắc chỉ gây nhiễu.
  if (hiddenPast > 0 && (state.q || pageInfo.total < PAGE_SIZE)) {
    const notice = document.createElement('p');
    notice.className = 'explore-hidden';
    notice.append(createIcon('help'), `Còn ${hiddenPast.toLocaleString('vi')} kỳ khớp bộ lọc đang ẩn vì đã hết hạn. `);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'button button--ghost explore-hidden__action';
    button.textContent = 'Xem cả hạn đã qua';
    button.addEventListener('click', showPast);
    notice.append(button);
    nodes.unshift(notice);
  }
  host.replaceChildren(...nodes);
  renderPagination(pageInfo);
}

function renderPage({ refreshFilters = true } = {}) {
  if (refreshFilters) renderFilters();
  renderResults();
}

async function initPage() {
  clearTimeout(deadlineTimer);
  deadlineTimer = null;
  showState(host, { kind: 'loading', title: 'Đang tải dữ liệu', message: 'Vui lòng chờ.' });
  try {
    catalog = await getCatalog();
    const notice = createDataNotice(catalog.meta);
    noticeRoot.replaceChildren(...(notice ? [notice] : []));
    const fieldSet = new Set();
    for (const edition of catalog.editions) {
      for (const field of edition.fields || []) fieldSet.add(field);
    }
    validFields = [...fieldSet].sort();
    const saved = getSavedIds();
    savedIds = saved.ids;
    state = parseState(window.location.search, { validFields });
    writeStateUrl({ addHistory: false });
    renderPage();
  } catch (error) {
    console.error(error);
    showState(host, {
      kind: 'error',
      title: 'Không tải được dữ liệu',
      message: 'Không tải được dữ liệu hội nghị. Kiểm tra kết nối rồi thử lại.',
      action: { label: 'Thử lại', onClick: initPage },
    });
  }
}

window.addEventListener('popstate', () => {
  clearTimeout(searchTimer);
  searchTimer = null;
  state = parseState(window.location.search, { validFields });
  writeStateUrl({ addHistory: false });
  renderPage();
});

window.addEventListener('saved:changed', (event) => {
  if (Array.isArray(event.detail?.ids)) savedIds = event.detail.ids;
});

initPage();
