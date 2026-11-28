// Chủ: TV3 (TV3-10). Bộ lọc dùng chung cho AI matcher, cùng tên tham số với site/js/pages/explore-state.js.
// Mọi giá trị đi qua đây trước khi chạm SQL: AI hay người dùng gửi gì lạ thì bị bỏ, không throw.
// Schema: mục 5.4 trong docs/t5-feedback-improvement-plan.md.

// Cây khu vực dùng chung với frontend (site/js/place-utils.js).
import { REGION_CODES as REGIONS } from './normalize.js';

export { REGIONS };
export const CCF_RANKS = Object.freeze(['A', 'B', 'C']);
export const CORE_RANKS = Object.freeze(['A*', 'A', 'B', 'C']);
export const WITHIN_DAYS = Object.freeze([30, 90, 180]);
export const KINDS = Object.freeze(['any', 'abstract', 'paper']);
export const FIELDS = Object.freeze(['AI', 'CG', 'CT', 'DB', 'DS', 'HI', 'MX', 'NW', 'SC', 'SE']);
export const MAX_COUNTRIES = 5;
export const MAX_KEYWORDS = 10;
export const MAX_KEYWORD_LENGTH = 60;
// Explore hiện chỉ hiểu các mốc này (explore-state.js); mốc khác không ghi vào URL.
const EXPLORE_WINDOWS = Object.freeze([7, 14, 30, 90]);
// Thứ tự nới khi lọc ra rỗng: bỏ điều kiện ít quan trọng nhất trước.
const RELAX_ORDER = Object.freeze(['withinDays', 'region', 'rank', 'fields']);

export function createEmptyFilters() {
  return {
    region: null, countries: [], ccfMin: null, coreMin: null,
    withinDays: null, kind: 'any', fields: [], keywords: [],
  };
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function read(raw, key) {
  // Chỉ đọc thuộc tính của chính object, không đi lên prototype.
  return Object.hasOwn(raw, key) ? raw[key] : undefined;
}

function oneOf(value, allowed) {
  return typeof value === 'string' && allowed.includes(value) ? value : null;
}

function listOf(value, accept, max) {
  if (!Array.isArray(value)) return [];
  const out = [];
  for (const item of value) {
    const accepted = accept(item);
    if (accepted !== null && !out.includes(accepted)) out.push(accepted);
    if (out.length >= max) break;
  }
  return out;
}

// "2 tháng" → AI trả 60 → làm tròn lên 90. Quá 180 ngày coi như không giới hạn thời gian.
function normalizeWithinDays(value) {
  const days = Number(value);
  if (!Number.isFinite(days) || days <= 0) return null;
  return WITHIN_DAYS.find((limit) => days <= limit) ?? null;
}

function normalizeKeyword(value) {
  if (typeof value !== 'string') return null;
  const text = value
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_KEYWORD_LENGTH)
    .trim();
  return text ? text.toLowerCase() : null;
}

/**
 * Chỉ giữ giá trị nằm trong danh sách cho phép.
 * @param {unknown} raw bộ lọc do AI trả hoặc frontend gửi lại
 * @param {{ countries?: string[] }} [options] mã quốc gia hợp lệ (COUNTRIES trong place-utils.js)
 */
export function validateFilters(raw, { countries = [] } = {}) {
  const filters = createEmptyFilters();
  if (!isPlainObject(raw)) return filters;

  filters.region = oneOf(read(raw, 'region'), REGIONS);
  filters.countries = listOf(read(raw, 'countries'), (item) => {
    const code = typeof item === 'string' ? item.trim().toUpperCase() : '';
    return /^[A-Z]{2}$/.test(code) && countries.includes(code) ? code : null;
  }, MAX_COUNTRIES);
  filters.ccfMin = oneOf(read(raw, 'ccfMin'), CCF_RANKS);
  filters.coreMin = oneOf(read(raw, 'coreMin'), CORE_RANKS);
  filters.withinDays = normalizeWithinDays(read(raw, 'withinDays'));
  filters.kind = oneOf(read(raw, 'kind'), KINDS) ?? 'any';
  filters.fields = listOf(read(raw, 'fields'), (item) => oneOf(item, FIELDS), FIELDS.length);
  filters.keywords = listOf(read(raw, 'keywords'), normalizeKeyword, MAX_KEYWORDS);
  return filters;
}

// Hạng tối thiểu → danh sách hạng được nhận: ccfMin 'B' → ['A', 'B'].
export function ranksAtLeast(minimum, order) {
  const index = order.indexOf(minimum);
  return index === -1 ? [] : order.slice(0, index + 1);
}

/**
 * Nới một bậc theo RELAX_ORDER. Từ khóa không bao giờ bị bỏ vì đó là phần "đề tài".
 * @returns {{ filters: ReturnType<typeof createEmptyFilters>, relaxed: string|null }}
 *   relaxed = tên bậc vừa nới, null khi không còn gì để nới
 */
export function relaxFilters(filters) {
  const next = { ...filters, countries: [...filters.countries], fields: [...filters.fields], keywords: [...filters.keywords] };
  for (const step of RELAX_ORDER) {
    if (step === 'withinDays' && next.withinDays !== null) {
      next.withinDays = null;
      return { filters: next, relaxed: step };
    }
    if (step === 'region' && (next.region || next.countries.length)) {
      next.region = null;
      next.countries = [];
      return { filters: next, relaxed: step };
    }
    if (step === 'rank' && (next.ccfMin || next.coreMin)) {
      next.ccfMin = null;
      next.coreMin = null;
      return { filters: next, relaxed: step };
    }
    if (step === 'fields' && next.fields.length) {
      next.fields = [];
      return { filters: next, relaxed: step };
    }
  }
  return { filters: next, relaxed: null };
}

/**
 * Đổi bộ lọc thành URL trang Explore để người dùng tự lọc tiếp.
 * region/country chỉ có tác dụng khi Explore làm xong TV3-04; trước đó Explore bỏ qua tham số lạ.
 */
export function toExploreUrl(filters, page = 'conferences.html') {
  const params = new URLSearchParams();
  for (const field of filters.fields) params.append('field', field);
  for (const rank of ranksAtLeast(filters.ccfMin, CCF_RANKS)) params.append('ccf', rank);
  for (const rank of ranksAtLeast(filters.coreMin, CORE_RANKS)) params.append('core', rank);
  if (filters.kind !== 'any') params.set('kind', filters.kind);
  if (EXPLORE_WINDOWS.includes(filters.withinDays)) params.set('window', String(filters.withinDays));
  if (filters.region) params.set('region', filters.region);
  for (const country of filters.countries) params.append('country', country);
  const query = params.toString();
  return query ? `${page}?${query}` : page;
}
