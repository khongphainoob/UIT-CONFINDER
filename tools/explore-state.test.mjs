import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Test trực tiếp file state mà không cần trình duyệt hay cài thêm thư viện.
const sourceUrl = new URL('../site/js/pages/explore-state.js', import.meta.url);
const source = await readFile(sourceUrl, 'utf8');
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const {
  DEFAULT_STATE,
  PAGE_SIZE,
  applyFilters,
  normalizeSearchText,
  normalizeState,
  paginate,
  parseState,
  serializeState,
  sortEditions,
} = await import(moduleUrl);

// Cố định thời gian để chạy hôm nay hay ngày mai vẫn cho cùng một kết quả.
const TEST_NOW = Date.parse('2026-10-20T00:00:00Z');
const VALID_FIELDS = [
  'AI',
  'Machine Learning',
  'Computer Vision',
  'Software Engineering',
  'Information Retrieval',
];

function deadline(id, type, instant, { quality = 'verified', precision = 'instant' } = {}) {
  return {
    id,
    type,
    instant,
    sourceText: instant ?? 'TBA',
    timezone: instant ? 'UTC' : null,
    precision,
    quality,
    sourceUrl: null,
    checkedAt: null,
    verifiedAt: null,
  };
}

function edition({
  id,
  acronym,
  name = `${acronym} Conference`,
  fields = [],
  ccf = null,
  core = null,
  format = null,
  rounds = [],
}) {
  return {
    id,
    seriesKey: acronym.toLocaleLowerCase('vi'),
    acronym,
    name,
    year: 2027,
    fields,
    ranks: { ccf, core, year: 2026, sourceUrl: null },
    place: null,
    format,
    websiteUrl: null,
    sourceUrl: null,
    checkedAt: null,
    verifiedAt: null,
    links: { cfp: null, template: null, authorGuide: null },
    rounds,
  };
}

function round(id, deadlines) {
  return { id, label: id.toUpperCase(), deadlines };
}

const EDITIONS = [
  edition({
    id: 'e01', acronym: 'NeurIPS',
    name: 'Conference on Neural Information Processing Systems',
    fields: ['AI', 'Machine Learning'], ccf: 'A', core: 'A*', format: 'Hybrid',
    rounds: [round('r1', [deadline('e01-paper-r1', 'paper', '2026-10-22T00:00:00Z')])],
  }),
  edition({
    id: 'e02', acronym: 'CVPR', fields: ['AI', 'Computer Vision'],
    ccf: 'A', core: 'A*', format: 'Offline',
    rounds: [round('r1', [
      deadline('e02-abstract-r1', 'abstract', '2026-10-21T00:00:00Z'),
      deadline('e02-paper-r1', 'paper', '2026-10-28T00:00:00Z'),
    ])],
  }),
  edition({
    id: 'e03', acronym: 'SOICT', fields: ['AI', 'Software Engineering'],
    core: 'B', format: 'Offline',
    rounds: [round('r1', [deadline(
      'e03-paper-r1', 'paper', '2026-11-15T00:00:00Z', { quality: 'estimated' },
    )])],
  }),
  edition({
    id: 'e04', acronym: 'ICSE', fields: ['Software Engineering'],
    ccf: 'A', core: 'A*', format: 'Hybrid',
    rounds: [round('r1', [deadline('e04-paper-r1', 'paper', '2026-10-10T00:00:00Z')])],
  }),
  edition({
    id: 'e05', acronym: 'LOCALAI', fields: ['AI'], format: 'Online',
    rounds: [round('r1', [deadline(
      'e05-paper-r1', 'paper', null, { quality: 'tba', precision: 'unknown' },
    )])],
  }),
  edition({
    id: 'e06', acronym: 'SIGIR', fields: ['Information Retrieval'],
    ccf: 'A', core: 'A', format: 'Offline',
    rounds: [round('r1', [deadline('e06-paper-r1', 'paper', '2026-12-15T00:00:00Z')])],
  }),
];

const MULTI_ROUND_EDITION = edition({
  id: 'e07', acronym: 'MULTI', fields: ['AI'], format: 'Online',
  rounds: [
    round('r1', [deadline('e07-r1-paper', 'paper', '2026-10-10T00:00:00Z')]),
    round('r2', [deadline('e07-r2-paper', 'paper', '2026-10-27T00:00:00Z')]),
  ],
});

// Helper nhỏ có cùng contract với TV1, dùng để TV3 tự kiểm tra trước khi ghép code nhóm.
function fakeGetNextSubmission(item, { kind = 'any', now = Date.now() } = {}) {
  const deadlines = (item.rounds ?? []).flatMap((itemRound) => (
    (itemRound.deadlines ?? []).map((itemDeadline) => ({
      ...itemDeadline,
      roundId: itemRound.id,
    }))
  )).filter((itemDeadline) => (
    kind === 'any' ? ['abstract', 'paper'].includes(itemDeadline.type) : itemDeadline.type === kind
  ));

  const exact = deadlines.filter((itemDeadline) => (
    itemDeadline.precision === 'instant'
    && !['estimated', 'tba'].includes(itemDeadline.quality)
    && Number.isFinite(Date.parse(itemDeadline.instant))
  ));
  const futureDeadlines = exact
    .filter((itemDeadline) => Date.parse(itemDeadline.instant) > now)
    .sort((left, right) => Date.parse(left.instant) - Date.parse(right.instant));
  if (futureDeadlines.length) {
    return { status: 'upcoming', deadline: futureDeadlines[0], futureDeadlines };
  }

  const hasUnknown = deadlines.some((itemDeadline) => (
    itemDeadline.precision !== 'instant'
    || ['estimated', 'tba'].includes(itemDeadline.quality)
    || !Number.isFinite(Date.parse(itemDeadline.instant))
  ));
  if (hasUnknown || deadlines.length === 0) {
    return { status: 'unknown', deadline: null, futureDeadlines: [] };
  }

  const past = exact.sort((left, right) => Date.parse(right.instant) - Date.parse(left.instant));
  return { status: 'closed', deadline: past[0] ?? null, futureDeadlines: [] };
}

function state(query = '') {
  return parseState(query, { validFields: VALID_FIELDS });
}

function run(query = '', editions = EDITIONS) {
  const parsed = state(query);
  const filtered = applyFilters(editions, parsed, {
    now: TEST_NOW,
    validFields: VALID_FIELDS,
    getNextSubmission: fakeGetNextSubmission,
  });
  return sortEditions(filtered, parsed);
}

function ids(items) {
  return items.map((item) => item.edition?.id ?? item.id);
}

const tests = [];
function test(name, callback) {
  tests.push({ name, callback });
}

test('T01 query rỗng', () => {
  assert.deepEqual(ids(run()), ['e02', 'e01', 'e06', 'e05', 'e03']);
});

test('T02 tìm acronym', () => {
  assert.deepEqual(ids(run('?q=soict')), ['e03']);
});

test('T03 tìm tên đầy đủ', () => {
  assert.deepEqual(ids(run('?q=neural%20information')), ['e01']);
});

test('T04 AND giữa field và mode', () => {
  assert.deepEqual(ids(run('?field=AI&mode=online')), ['e05']);
});

test('T05 OR trong nhóm field', () => {
  assert.deepEqual(
    ids(run('?field=AI&field=Computer%20Vision')),
    ['e02', 'e01', 'e05', 'e03'],
  );
});

test('T06 AND giữa field và core', () => {
  assert.deepEqual(ids(run('?field=AI&core=B')), ['e03']);
});

test('T07 core, paper và window 30', () => {
  assert.deepEqual(ids(run('?core=A*&kind=paper&window=30')), ['e01', 'e02']);
});

test('T08 abstract trong 30 ngày', () => {
  assert.deepEqual(ids(run('?kind=abstract&window=30')), ['e02']);
});

test('T09 window 7 ngày', () => {
  assert.deepEqual(ids(run('?window=7')), ['e02', 'e01']);
});

test('T10 mặc định loại closed', () => {
  assert.deepEqual(ids(run('?field=Software%20Engineering')), ['e03']);
});

test('T11 past cho phép closed', () => {
  assert.deepEqual(ids(run('?field=Software%20Engineering&past=1')), ['e03', 'e04']);
});

test('T12 sort name', () => {
  assert.deepEqual(ids(run('?mode=offline&sort=name')), ['e02', 'e06', 'e03']);
});

test('T13 CCF và CORE dùng AND', () => {
  assert.deepEqual(ids(run('?ccf=A&core=A*')), ['e02', 'e01']);
});

test('T14 estimated và TBA không vào window', () => {
  assert.deepEqual(ids(run('?window=90')), ['e02', 'e01', 'e06']);
});

test('T15 giá trị bộ lọc và số trang sai trở về mặc định', () => {
  const parsed = state('?core=X&kind=demo&window=8&page=-2');
  assert.deepEqual(parsed, { ...DEFAULT_STATE, fields: [], ccf: [], core: [], mode: [] });
  assert.deepEqual(ids(run('?core=X&kind=demo&window=8&page=-2')), ids(run()));
});

test('T16 bỏ lựa chọn trùng và chuẩn hóa mode', () => {
  const parsed = state('?field=AI&field=AI&mode=ONLINE');
  assert.deepEqual(parsed.fields, ['AI']);
  assert.deepEqual(parsed.mode, ['online']);
  assert.deepEqual(ids(run('?field=AI&field=AI&mode=ONLINE')), ['e05']);
});

test('T17 filter mới được caller đặt page về 1', () => {
  const current = state('?page=3');
  const next = normalizeState({ ...current, fields: ['AI'], page: 1 }, { validFields: VALID_FIELDS });
  assert.equal(next.page, 1);
});

test('T18 reset trả state mặc định và không liên quan storage', () => {
  assert.deepEqual(
    normalizeState(DEFAULT_STATE, { validFields: VALID_FIELDS }),
    { ...DEFAULT_STATE, fields: [], ccf: [], core: [], mode: [] },
  );
});

test('T19 đọc lại URL khôi phục đúng bộ lọc', () => {
  const stateA = state('?field=AI&kind=paper&page=2');
  const stateB = state('?core=A*&window=30');
  assert.notDeepEqual(stateA, stateB);
  assert.deepEqual(state('?field=AI&kind=paper&page=2'), stateA);
});

test('T20 0 kết quả', () => {
  assert.equal(run('?q=khong-ton-tai').length, 0);
});

test('T21 1 kết quả không cần trang 2', () => {
  const result = paginate(run('?q=soict'), 1);
  assert.equal(result.items.length, 1);
  assert.equal(result.totalPages, 1);
});

test('T22 12 kết quả chỉ có một trang', () => {
  const items = Array.from({ length: 12 }, (_, index) => ({ id: `x${index}` }));
  const result = paginate(items, 1);
  assert.equal(result.items.length, 12);
  assert.equal(result.totalPages, 1);
});

test('T23 13 kết quả tạo trang 2 có 1 mục', () => {
  const items = Array.from({ length: 13 }, (_, index) => ({ id: `x${index}` }));
  const result = paginate(items, 2);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].id, 'x12');
  assert.equal(result.totalPages, 2);
});

test('T24 rank null không khớp CORE A*', () => {
  assert.deepEqual(ids(run('?core=A*')), ['e02', 'e01']);
});

test('T25 nhiều round chọn round tương lai', () => {
  const result = run('?kind=paper&window=7', [MULTI_ROUND_EDITION]);
  assert.deepEqual(ids(result), ['e07']);
  assert.equal(result[0].submission.deadline.id, 'e07-r2-paper');
});

test('T26 deadline đúng bằng now bị loại khỏi window', () => {
  const item = edition({
    id: 'boundary-now', acronym: 'NOW', fields: ['AI'], format: 'Online',
    rounds: [round('r1', [deadline('boundary-now-paper', 'paper', '2026-10-20T00:00:00Z')])],
  });
  assert.equal(run('?window=7', [item]).length, 0);
});

test('T27 deadline đúng biên phải được tính', () => {
  const item = edition({
    id: 'boundary-end', acronym: 'END', fields: ['AI'], format: 'Online',
    rounds: [round('r1', [deadline('boundary-end-paper', 'paper', '2026-10-27T00:00:00Z')])],
  });
  assert.deepEqual(ids(run('?window=7', [item])), ['boundary-end']);
});

test('T28 deadline sau biên 1ms bị loại', () => {
  const item = edition({
    id: 'after-end', acronym: 'AFTER', fields: ['AI'], format: 'Online',
    rounds: [round('r1', [deadline('after-end-paper', 'paper', '2026-10-27T00:00:00.001Z')])],
  });
  assert.equal(run('?window=7', [item]).length, 0);
});

test('T29 URL không hợp lệ không làm chương trình dừng', () => {
  const parsed = state('?unknown=x&field=%E0%A4%A&page=abc');
  assert.equal(parsed.page, 1);
  assert.deepEqual(parsed.fields, []);
});

test('serialize dùng params lặp và bỏ default', () => {
  const params = serializeState({
    ...DEFAULT_STATE,
    q: 'machine learning',
    fields: ['Computer Vision', 'AI'],
    ccf: ['B', 'A'],
    core: ['A', 'A*'],
    mode: ['Hybrid', 'online'],
    kind: 'paper',
    window: '30',
    past: true,
    page: 2,
  }, { validFields: VALID_FIELDS });
  assert.equal(
    params.toString(),
    'q=machine+learning&field=AI&field=Computer+Vision&ccf=A&ccf=B&core=A*&core=A&mode=online&mode=hybrid&kind=paper&window=30&past=1&page=2',
  );
  assert.equal(serializeState(DEFAULT_STATE).toString(), '');
});

test('normalizeSearchText bỏ dấu tiếng Việt', () => {
  assert.equal(normalizeSearchText('  Trí   tuệ NHÂN tạo  '), 'tri tue nhan tao');
});

assert.equal(PAGE_SIZE, 12);

let passed = 0;
for (const { name, callback } of tests) {
  try {
    await callback();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

console.log(`\n${passed}/${tests.length} tests passed.`);
