// Kiểm thử tìm, lọc, sắp xếp, phân trang và đồng bộ URL của trang Khám phá (TV3).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_STATE,
  normalizeSearchText,
  parseState,
  serializeState,
  applyFilters,
  sortEditions,
  paginate,
} from '../site/js/pages/explore-state.js';
import { getNextSubmission } from '../site/js/deadline-utils.js';

const NOW = Date.parse('2026-10-20T00:00:00Z');
const DAY = 24 * 60 * 60 * 1000;

function makeEdition(id, acronym, name, { fields, ccf = null, core = null, format, paper }) {
  const deadlines = paper === 'TBA'
    ? [{ id: `${id}-paper`, type: 'paper', instant: null, precision: 'unknown', quality: 'tba' }]
    : [{ id: `${id}-paper`, type: 'paper', instant: new Date(paper).toISOString(), precision: 'instant', quality: 'unverified' }];
  return { id, acronym, name, year: 2027, fields, ranks: { ccf, core }, format, rounds: [{ id: 'r1', label: 'R1', deadlines }] };
}

const E1 = makeEdition('e1', 'CVPR', 'Computer Vision and Pattern Recognition', { fields: ['AI'], ccf: 'A', core: 'A*', format: 'Offline', paper: NOW + 10 * DAY });
const E2 = makeEdition('e2', 'ICSE', 'International Conference on Software Engineering', { fields: ['SE'], ccf: 'A', core: 'A*', format: 'Hybrid', paper: NOW + 40 * DAY });
const E3 = makeEdition('e3', 'XYZ', 'Trí tuệ nhân tạo ứng dụng', { fields: ['AI'], ccf: 'C', format: 'Online', paper: NOW - 5 * DAY });
const E4 = makeEdition('e4', 'TBC', 'Hội nghị chưa công bố hạn', { fields: ['DB'], ccf: 'B', format: 'Online', paper: 'TBA' });
const ALL = [E1, E2, E3, E4];

const filterIds = (state) => applyFilters(ALL, { ...DEFAULT_STATE, ...state }, { now: NOW, getNextSubmission })
  .map((item) => item.edition.id);

test('tìm không phân biệt hoa thường và dấu tiếng Việt', () => {
  assert.equal(normalizeSearchText('Cömputer Vísion'), 'computer vision');
  assert.equal(normalizeSearchText('  Trí   tuệ nhân tạo '), 'tri tue nhan tao');
  assert.equal(normalizeSearchText('Đà Nẵng'), 'da nang');
  for (const query of ['computer vision', 'Cömputer Vísion', 'COMPUTER VISION', 'vision computer']) {
    assert.deepEqual(filterIds({ q: query }), ['e1'], query);
  }
});

test('mặc định ẩn kỳ đã hết hạn, bật past thì hiện lại', () => {
  assert.deepEqual(filterIds({ q: 'tri tue' }), []);
  assert.deepEqual(filterIds({ q: 'tri tue', past: true }), ['e3']);
  assert.deepEqual(filterIds({}), ['e1', 'e2', 'e4']);
});

test('OR trong cùng nhóm, AND giữa các nhóm', () => {
  assert.deepEqual(filterIds({ ccf: ['A', 'B'] }), ['e1', 'e2', 'e4']);
  assert.deepEqual(filterIds({ ccf: ['A'], mode: ['online'] }), []);
  assert.deepEqual(filterIds({ ccf: ['A'], mode: ['hybrid'] }), ['e2']);
  assert.deepEqual(filterIds({ fields: ['AI'], past: true }), ['e1', 'e3']);
  assert.deepEqual(filterIds({ core: ['A*'] }), ['e1', 'e2']);
});

test('lọc theo số ngày còn lại chỉ lấy mốc chính xác trong cửa sổ', () => {
  assert.deepEqual(filterIds({ window: '30' }), ['e1']);
  assert.deepEqual(filterIds({ window: '90' }), ['e1', 'e2']);
});

test('biên cửa sổ: đúng now + 30 ngày được nhận, quá 1 ms thì loại', () => {
  const onEdge = makeEdition('edge', 'EDGE', 'Edge', { fields: ['AI'], format: 'Online', paper: NOW + 30 * DAY });
  const pastEdge = makeEdition('over', 'OVER', 'Over', { fields: ['AI'], format: 'Online', paper: NOW + 30 * DAY + 1 });
  const ids = applyFilters([onEdge, pastEdge], { ...DEFAULT_STATE, window: '30' }, { now: NOW, getNextSubmission })
    .map((item) => item.edition.id);
  assert.deepEqual(ids, ['edge']);
});

test('applyFilters bắt buộc truyền getNextSubmission', () => {
  assert.throws(() => applyFilters(ALL, DEFAULT_STATE, { now: NOW }), TypeError);
});

test('sắp xếp theo hạn: còn hạn, chưa rõ, rồi đã hết hạn', () => {
  const items = applyFilters(ALL, { ...DEFAULT_STATE, past: true }, { now: NOW, getNextSubmission });
  assert.deepEqual(sortEditions(items, { sort: 'deadline' }).map((i) => i.edition.id), ['e1', 'e2', 'e4', 'e3']);
  assert.deepEqual(sortEditions(items, { sort: 'name' }).map((i) => i.edition.acronym), ['CVPR', 'ICSE', 'TBC', 'XYZ']);
  assert.deepEqual(sortEditions(items, { sort: 'ccf' }).map((i) => i.edition.id), ['e1', 'e2', 'e4', 'e3']);
});

test('sắp xếp không làm đổi mảng gốc', () => {
  const items = applyFilters(ALL, { ...DEFAULT_STATE, past: true }, { now: NOW, getNextSubmission });
  const before = items.map((i) => i.edition.id);
  sortEditions(items, { sort: 'name' });
  assert.deepEqual(items.map((i) => i.edition.id), before);
});

test('phân trang 12 kỳ: 0, 1, 12, 13 kết quả và trang vượt giới hạn', () => {
  const list = (n) => Array.from({ length: n }, (_, i) => i);
  assert.deepEqual([paginate(list(0), 1).items.length, paginate(list(0), 1).totalPages], [0, 1]);
  assert.equal(paginate(list(1), 1).totalPages, 1);
  assert.equal(paginate(list(12), 1).totalPages, 1);
  const second = paginate(list(13), 2);
  assert.deepEqual([second.totalPages, second.items], [2, [12]]);
  assert.equal(paginate(list(13), 999).page, 2);
  assert.equal(paginate(list(13), -1).page, 1);
});

test('đọc URL: chuẩn hóa giá trị, bỏ giá trị lạ', () => {
  const state = parseState('?q=%20cvpr%20&ccf=a&ccf=B&ccf=X&page=-3&window=15&sort=NAME&past=1');
  assert.equal(state.q, 'cvpr');
  assert.deepEqual(state.ccf, ['A', 'B']);
  assert.equal(state.page, 1);
  assert.equal(state.window, 'all');
  assert.equal(state.sort, 'name');
  assert.equal(state.past, true);
  assert.equal(parseState(`?q=${'a'.repeat(150)}`).q.length, 100);
});

test('ghi URL: chỉ ghi giá trị khác mặc định, tham số lặp cho nhiều lựa chọn', () => {
  assert.equal(serializeState(DEFAULT_STATE).toString(), '');
  assert.equal(serializeState({ ...DEFAULT_STATE, ccf: ['B', 'A'], window: '30', page: 2 }).toString(),
    'ccf=A&ccf=B&window=30&page=2');
});

test('ghi rồi đọc lại URL khôi phục đúng trạng thái', () => {
  const state = { ...DEFAULT_STATE, q: 'vision', ccf: ['A'], core: ['A*'], mode: ['online', 'hybrid'], kind: 'paper', window: '14', past: true, sort: 'core', page: 3 };
  const restored = parseState(serializeState(state));
  assert.deepEqual(restored, { ...state, fields: [], mode: ['online', 'hybrid'] });
});
