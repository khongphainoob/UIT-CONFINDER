// Chủ: TV3. Bộ lọc dùng chung cho AI matcher, cùng tên tham số với site/js/pages/explore-state.js.
// Schema chi tiết: mục 5.4 trong docs/t5-feedback-improvement-plan.md.

export const REGIONS = Object.freeze(['vietnam', 'sea', 'asia', 'europe', 'america', 'oceania', 'africa']);
export const CCF_RANKS = Object.freeze(['A', 'B', 'C']);
export const CORE_RANKS = Object.freeze(['A*', 'A', 'B', 'C']);
export const WITHIN_DAYS = Object.freeze([30, 90, 180]);
export const KINDS = Object.freeze(['any', 'abstract', 'paper']);
export const FIELDS = Object.freeze(['AI', 'CG', 'CT', 'DB', 'DS', 'HI', 'MX', 'NW', 'SC', 'SE']);
export const MAX_KEYWORDS = 10;
export const MAX_KEYWORD_LENGTH = 60;

export const EMPTY_FILTERS = Object.freeze({
  region: null, countries: [], ccfMin: null, coreMin: null,
  withinDays: null, kind: 'any', fields: [], keywords: [],
});

/**
 * TODO(TV3-10a): chỉ giữ giá trị nằm trong danh sách cho phép ở trên, bỏ mọi thứ khác.
 * Không bao giờ throw: AI trả rác thì trả về bộ lọc rỗng.
 * @param {unknown} raw
 * @returns {typeof EMPTY_FILTERS}
 */
export function validateFilters(raw) {
  void raw;
  return { ...EMPTY_FILTERS, countries: [], fields: [], keywords: [] };
}

/**
 * TODO(TV3-10b): nới một bậc theo thứ tự withinDays → region/countries → ccfMin/coreMin.
 * @param {typeof EMPTY_FILTERS} filters
 * @returns {{ filters: typeof EMPTY_FILTERS, relaxed: string|null }} relaxed = null khi hết thứ để nới
 */
export function relaxFilters(filters) {
  return { filters, relaxed: null };
}

/**
 * TODO(TV3-10c): đổi bộ lọc thành URL trang Explore, ví dụ conferences.html?region=asia&ccf=A&ccf=B&window=90
 * @param {typeof EMPTY_FILTERS} filters
 * @returns {string}
 */
export function toExploreUrl(filters) {
  void filters;
  return 'conferences.html';
}
