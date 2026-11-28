// TV3-10: kiểm tra, nới và đổi bộ lọc sang URL Explore.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyFilters, relaxFilters, toExploreUrl, validateFilters } from '../src/filters.js';

const COUNTRIES = ['VN', 'SG', 'JP', 'US'];

test('giữ giá trị hợp lệ', () => {
  const filters = validateFilters({
    region: 'asia', countries: ['jp', 'VN'], ccfMin: 'B', coreMin: 'A*', withinDays: 90,
    kind: 'paper', fields: ['SC', 'AI'], keywords: ['Prompt Injection', 'LLM security'],
  }, { countries: COUNTRIES });
  assert.deepEqual(filters, {
    region: 'asia', countries: ['JP', 'VN'], ccfMin: 'B', coreMin: 'A*', withinDays: 90,
    kind: 'paper', fields: ['SC', 'AI'], keywords: ['prompt injection', 'llm security'],
  });
});

test('bỏ giá trị lạ, không throw', () => {
  const filters = validateFilters({
    region: 'đông á', countries: ['XX', 'vietnam', 42, 'US'], ccfMin: 'A+', coreMin: 'Z',
    withinDays: 'abc', kind: 'poster', fields: ['AI', 'HACK', 'AI'], keywords: ['', '   ', 7, 'graph neural networks'],
  }, { countries: COUNTRIES });
  assert.deepEqual(filters, {
    region: null, countries: ['US'], ccfMin: null, coreMin: null, withinDays: null,
    kind: 'any', fields: ['AI'], keywords: ['graph neural networks'],
  });
});

test('đầu vào không phải object thì trả bộ lọc rỗng', () => {
  for (const raw of [null, undefined, 'asia', 42, ['asia']]) {
    assert.deepEqual(validateFilters(raw), createEmptyFilters());
  }
});

test('không đọc thuộc tính từ prototype (chống prototype pollution)', () => {
  const raw = JSON.parse('{"__proto__": {"region": "asia", "ccfMin": "A"}}');
  const filters = validateFilters(raw);
  assert.equal(filters.region, null);
  assert.equal(filters.ccfMin, null);
  assert.equal({}.region, undefined);
});

test('withinDays làm tròn lên mốc gần nhất, quá 180 ngày là không giới hạn', () => {
  const days = (value) => validateFilters({ withinDays: value }).withinDays;
  assert.equal(days(14), 30);
  assert.equal(days(60), 90);
  assert.equal(days(120), 180);
  assert.equal(days(365), null);
  assert.equal(days(0), null);
  assert.equal(days(-5), null);
});

test('từ khóa: bỏ ký tự điều khiển, cắt 60 ký tự, tối đa 10, không trùng', () => {
  const keywords = Array.from({ length: 15 }, (_, i) => `topic ${i}`);
  keywords.unshift('a\u0000b', 'x'.repeat(80), 'Topic 0');
  const filters = validateFilters({ keywords });
  assert.equal(filters.keywords.length, 10);
  assert.equal(filters.keywords[0], 'a b');
  assert.equal(filters.keywords[1].length, 60);
  assert.equal(filters.keywords.filter((k) => k === 'topic 0').length, 1);
});

test('relaxFilters nới đúng thứ tự: thời gian → khu vực → hạng → lĩnh vực, giữ từ khóa', () => {
  let filters = validateFilters({
    region: 'asia', countries: ['JP'], ccfMin: 'A', withinDays: 30, fields: ['AI'], keywords: ['vision'],
  }, { countries: COUNTRIES });
  const steps = [];
  for (;;) {
    const next = relaxFilters(filters);
    if (!next.relaxed) break;
    steps.push(next.relaxed);
    filters = next.filters;
  }
  assert.deepEqual(steps, ['withinDays', 'region', 'rank', 'fields']);
  assert.deepEqual(filters.keywords, ['vision']);
  assert.equal(filters.countries.length, 0);
});

test('relaxFilters không sửa object gốc', () => {
  const original = validateFilters({ withinDays: 30 });
  relaxFilters(original);
  assert.equal(original.withinDays, 30);
});

test('toExploreUrl: dùng đúng tên tham số của explore-state.js', () => {
  const filters = validateFilters({
    region: 'asia', ccfMin: 'B', coreMin: 'A', withinDays: 90, kind: 'paper', fields: ['SC'],
  });
  assert.equal(
    toExploreUrl(filters),
    'conferences.html?field=SC&ccf=A&ccf=B&core=A*&core=A&kind=paper&window=90&region=asia',
  );
  assert.equal(toExploreUrl(createEmptyFilters()), 'conferences.html');
  // 180 ngày Explore chưa hỗ trợ nên không ghi vào URL
  assert.equal(toExploreUrl(validateFilters({ withinDays: 180 })), 'conferences.html');
});
