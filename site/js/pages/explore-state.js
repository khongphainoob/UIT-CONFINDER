// TV3: state URL/filter nằm riêng, không nhét vào common.js.
export const DEFAULT_STATE = Object.freeze({
  q: '', fields: Object.freeze([]), ccf: Object.freeze([]), core: Object.freeze([]),
  mode: Object.freeze([]), kind: 'any', window: 'all', past: false,
  sort: 'deadline', page: 1,
});
// TODO TV3: thêm parseState/serializeState/applyFilters/sort/paginate.
// Multi-select dùng params lặp; OR trong nhóm, AND giữa nhóm; 12 mục/trang.
