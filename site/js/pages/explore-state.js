// Các hàm trong file này chỉ lo phần tìm, lọc, sắp xếp và chia trang.
// Phần giao diện sẽ gọi các hàm này, còn common.js vẫn dành cho UI dùng chung.
export const DEFAULT_STATE = Object.freeze({
  q: '', fields: Object.freeze([]), ccf: Object.freeze([]), core: Object.freeze([]),
  mode: Object.freeze([]), kind: 'any', window: 'all', past: false,
  sort: 'deadline', page: 1,
});

export const PAGE_SIZE = 12;

const CCF_VALUES = Object.freeze(['A', 'B', 'C']);
const CORE_VALUES = Object.freeze(['A*', 'A', 'B', 'C']);
const MODE_VALUES = Object.freeze(['online', 'offline', 'hybrid']);
const KIND_VALUES = Object.freeze(['any', 'abstract', 'paper']);
const WINDOW_VALUES = Object.freeze(['all', '7', '14', '30', '90']);
const SORT_VALUES = Object.freeze(['deadline', 'name', 'ccf', 'core']);
const DAY_MS = 24 * 60 * 60 * 1000;

function unique(values) {
  return [...new Set(values)];
}

function canonicalValues(values, allowed, { caseInsensitive = false } = {}) {
  const input = Array.isArray(values) ? values : [];
  const canonical = new Map(allowed.map((value) => [
    caseInsensitive ? value.toLocaleLowerCase('vi') : value,
    value,
  ]));
  const accepted = [];
  for (const value of input) {
    const text = String(value ?? '').trim();
    if (!text) continue;
    const key = caseInsensitive ? text.toLocaleLowerCase('vi') : text;
    const match = canonical.get(key);
    if (match !== undefined) accepted.push(match);
  }
  const selected = new Set(unique(accepted));
  return allowed.filter((value) => selected.has(value));
}

function positiveInteger(value, fallback = 1) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function oneOf(value, allowed, fallback, { caseInsensitive = false } = {}) {
  const text = String(value ?? '').trim();
  const key = caseInsensitive ? text.toLocaleLowerCase('vi') : text;
  return allowed.find((item) => (
    caseInsensitive ? item.toLocaleLowerCase('vi') === key : item === key
  )) ?? fallback;
}

function toSearchParams(value) {
  if (value instanceof URLSearchParams) return value;
  const text = String(value ?? '');
  return new URLSearchParams(text.startsWith('?') ? text.slice(1) : text);
}

function deadlineInstant(submission) {
  const value = submission?.deadline?.instant;
  const instant = value == null ? Number.NaN : Date.parse(value);
  return Number.isFinite(instant) ? instant : Number.NaN;
}

function unwrapEdition(item) {
  return item?.edition ?? item;
}

function submissionOf(item) {
  return item?.submission ?? null;
}

function compareText(left, right) {
  return String(left ?? '').localeCompare(String(right ?? ''), 'vi', {
    sensitivity: 'base',
    numeric: true,
  });
}

function compareId(left, right) {
  return compareText(unwrapEdition(left)?.id, unwrapEdition(right)?.id);
}

function compareDeadline(left, right) {
  const aSubmission = submissionOf(left);
  const bSubmission = submissionOf(right);
  const group = { upcoming: 0, unknown: 1, closed: 2 };
  const aGroup = group[aSubmission?.status] ?? 1;
  const bGroup = group[bSubmission?.status] ?? 1;
  if (aGroup !== bGroup) return aGroup - bGroup;

  const aInstant = deadlineInstant(aSubmission);
  const bInstant = deadlineInstant(bSubmission);
  if (Number.isFinite(aInstant) && Number.isFinite(bInstant) && aInstant !== bInstant) {
    return aGroup === group.closed ? bInstant - aInstant : aInstant - bInstant;
  }
  if (Number.isFinite(aInstant) !== Number.isFinite(bInstant)) {
    return Number.isFinite(aInstant) ? -1 : 1;
  }

  const nameResult = compareText(
    unwrapEdition(left)?.acronym || unwrapEdition(left)?.name,
    unwrapEdition(right)?.acronym || unwrapEdition(right)?.name,
  );
  return nameResult || compareId(left, right);
}

function compareName(left, right) {
  const a = unwrapEdition(left);
  const b = unwrapEdition(right);
  const nameResult = compareText(a?.acronym || a?.name, b?.acronym || b?.name);
  if (nameResult) return nameResult;
  const yearResult = Number(b?.year ?? 0) - Number(a?.year ?? 0);
  return yearResult || compareId(left, right);
}

function compareRank(left, right, rankName, order) {
  const a = unwrapEdition(left);
  const b = unwrapEdition(right);
  const weights = new Map(order.map((rank, index) => [rank, index]));
  const aWeight = weights.get(a?.ranks?.[rankName]) ?? order.length;
  const bWeight = weights.get(b?.ranks?.[rankName]) ?? order.length;
  return aWeight - bWeight || compareDeadline(left, right) || compareId(left, right);
}

export function normalizeSearchText(value) {
  // Bỏ dấu để người dùng gõ "tri tue nhan tao" vẫn tìm được "Trí tuệ nhân tạo".
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLocaleLowerCase('vi')
    .trim()
    .replace(/\s+/g, ' ');
}

export function normalizeState(input = {}, { validFields = [] } = {}) {
  // URL có thể bị sửa bằng tay nên mọi giá trị đều được kiểm tra trước khi dùng.
  const fieldValues = unique((Array.isArray(validFields) ? validFields : [])
    .map((value) => String(value ?? '').trim())
    .filter(Boolean));
  const rawFields = Array.isArray(input.fields) ? input.fields : [];
  const fields = fieldValues.length
    ? canonicalValues(rawFields, fieldValues, { caseInsensitive: true })
    : unique(rawFields.map((value) => String(value ?? '').trim()).filter(Boolean));

  return {
    q: String(input.q ?? '').trim().slice(0, 100),
    fields,
    ccf: canonicalValues(input.ccf, CCF_VALUES, { caseInsensitive: true }),
    core: canonicalValues(input.core, CORE_VALUES, { caseInsensitive: true }),
    mode: canonicalValues(input.mode, MODE_VALUES, { caseInsensitive: true }),
    kind: oneOf(input.kind, KIND_VALUES, DEFAULT_STATE.kind, { caseInsensitive: true }),
    window: oneOf(input.window, WINDOW_VALUES, DEFAULT_STATE.window),
    past: input.past === true || input.past === 1 || input.past === '1',
    sort: oneOf(input.sort, SORT_VALUES, DEFAULT_STATE.sort, { caseInsensitive: true }),
    page: positiveInteger(input.page, DEFAULT_STATE.page),
  };
}

export function parseState(searchParams, options = {}) {
  // Multi-select dùng params lặp, ví dụ: field=AI&field=Software%20Engineering.
  const params = toSearchParams(searchParams);
  return normalizeState({
    q: params.get('q') ?? DEFAULT_STATE.q,
    fields: params.getAll('field'),
    ccf: params.getAll('ccf'),
    core: params.getAll('core'),
    mode: params.getAll('mode'),
    kind: params.get('kind') ?? DEFAULT_STATE.kind,
    window: params.get('window') ?? DEFAULT_STATE.window,
    past: params.get('past') === '1',
    sort: params.get('sort') ?? DEFAULT_STATE.sort,
    page: params.get('page') ?? DEFAULT_STATE.page,
  }, options);
}

export function serializeState(input, options = {}) {
  // Chỉ ghi những giá trị khác mặc định để đường link chia sẻ không quá dài.
  const state = normalizeState(input, options);
  const params = new URLSearchParams();
  if (state.q) params.set('q', state.q);
  state.fields.forEach((value) => params.append('field', value));
  state.ccf.forEach((value) => params.append('ccf', value));
  state.core.forEach((value) => params.append('core', value));
  state.mode.forEach((value) => params.append('mode', value));
  if (state.kind !== DEFAULT_STATE.kind) params.set('kind', state.kind);
  if (state.window !== DEFAULT_STATE.window) params.set('window', state.window);
  if (state.past) params.set('past', '1');
  if (state.sort !== DEFAULT_STATE.sort) params.set('sort', state.sort);
  if (state.page !== DEFAULT_STATE.page) params.set('page', String(state.page));
  return params;
}

export function applyFilters(editions, inputState, {
  now = Date.now(),
  validFields = [],
  getNextSubmission,
} = {}) {
  if (!Array.isArray(editions)) return [];
  if (typeof getNextSubmission !== 'function') {
    throw new TypeError('applyFilters cần options.getNextSubmission là một hàm.');
  }

  const state = normalizeState(inputState, { validFields });
  const query = normalizeSearchText(state.q);
  const selectedFields = new Set(state.fields.map(normalizeSearchText));
  const selectedCcf = new Set(state.ccf);
  const selectedCore = new Set(state.core);
  const selectedModes = new Set(state.mode);
  const windowDays = state.window === 'all' ? null : Number(state.window);
  const windowEnd = windowDays == null ? null : now + windowDays * DAY_MS;

  const output = [];
  for (const edition of editions) {
    if (!edition || typeof edition !== 'object') continue;
    if (query) {
      const haystack = normalizeSearchText(`${edition.acronym ?? ''} ${edition.name ?? ''}`);
      if (!haystack.includes(query)) continue;
    }
    // Nhiều lựa chọn trong cùng nhóm là OR; các khối if khác nhau tạo thành AND.
    if (selectedFields.size) {
      const editionFields = Array.isArray(edition.fields)
        ? edition.fields.map(normalizeSearchText)
        : [];
      if (!editionFields.some((value) => selectedFields.has(value))) continue;
    }
    if (selectedCcf.size && !selectedCcf.has(edition.ranks?.ccf)) continue;
    if (selectedCore.size && !selectedCore.has(edition.ranks?.core)) continue;
    if (selectedModes.size) {
      const mode = String(edition.format ?? '').toLocaleLowerCase('vi');
      if (!selectedModes.has(mode)) continue;
    }

    // Việc chọn deadline thuộc TV1; TV3 chỉ dùng kết quả để lọc danh sách.
    const submission = getNextSubmission(edition, { kind: state.kind, now });
    if (!state.past && submission?.status === 'closed') continue;
    if (windowEnd != null) {
      const matchesWindow = Array.isArray(submission?.futureDeadlines)
        && submission.futureDeadlines.some((deadline) => {
          const instant = Date.parse(deadline?.instant);
          return Number.isFinite(instant) && now < instant && instant <= windowEnd;
        });
      if (!matchesWindow) continue;
    }
    output.push({ edition, submission });
  }
  return output;
}

export function sortEditions(items, inputState = DEFAULT_STATE) {
  // Tạo mảng mới để thao tác sắp xếp không làm đổi catalog ban đầu.
  const state = normalizeState(inputState);
  const sorted = Array.isArray(items) ? [...items] : [];
  const comparator = {
    deadline: compareDeadline,
    name: compareName,
    ccf: (left, right) => compareRank(left, right, 'ccf', CCF_VALUES),
    core: (left, right) => compareRank(left, right, 'core', CORE_VALUES),
  }[state.sort] ?? compareDeadline;
  return sorted.sort((left, right) => comparator(left, right) || compareId(left, right));
}

export function paginate(items, page, pageSize = PAGE_SIZE) {
  // Trang vượt giới hạn sẽ tự quay về trang cuối đang có dữ liệu.
  const source = Array.isArray(items) ? items : [];
  const safeSize = positiveInteger(pageSize, PAGE_SIZE);
  const total = source.length;
  const totalPages = Math.max(1, Math.ceil(total / safeSize));
  const safePage = Math.min(positiveInteger(page, 1), totalPages);
  const start = (safePage - 1) * safeSize;
  return {
    items: source.slice(start, start + safeSize),
    total,
    totalPages,
    page: safePage,
    pageSize: safeSize,
    start,
    end: Math.min(start + safeSize, total),
  };
}
