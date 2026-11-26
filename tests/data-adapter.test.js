// Kiểm thử chuẩn hóa dữ liệu CCFDDL (TV1).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTimezoneOffset, parseDeadlineItem, normalizeCatalog } from '../site/js/data-adapter.js';

test('đọc múi giờ: AoE, UTC, tên viết tắt và dạng số', () => {
  for (const value of ['AoE', 'UTC-12', 'GMT-12']) {
    assert.equal(parseTimezoneOffset(value), '-12:00', value);
  }
  assert.equal(parseTimezoneOffset('UTC'), '+00:00');
  assert.equal(parseTimezoneOffset('PT'), '-08:00');
  assert.equal(parseTimezoneOffset('UTC+7'), '+07:00');
  assert.equal(parseTimezoneOffset('GMT+05:30'), '+05:30');
  assert.equal(parseTimezoneOffset('không rõ'), null);
  assert.equal(parseTimezoneOffset(null), null);
});

test('ngày giờ kèm AoE được ghép offset -12:00', () => {
  const item = parseDeadlineItem('d1', 'paper', '2026-11-10 23:59:59', 'AoE');
  assert.equal(item.instant, '2026-11-10T23:59:59-12:00');
  assert.equal(item.precision, 'instant');
  assert.equal(item.sourceText, '2026-11-10 23:59:59');
  assert.equal(Date.parse(item.instant), Date.parse('2026-11-11T11:59:59Z'));
});

test('chỉ có ngày: giữ precision date, không tự gán giờ', () => {
  const item = parseDeadlineItem('d2', 'paper', '2026-11-10', 'AoE');
  assert.equal(item.precision, 'date');
  assert.equal(item.instant, null);
});

test('TBA, TBD hoặc rỗng: precision unknown, quality tba', () => {
  for (const value of ['TBD', 'TBA', '']) {
    const item = parseDeadlineItem('d3', 'paper', value, 'UTC-12');
    assert.equal(item.precision, 'unknown');
    assert.equal(item.quality, 'tba');
    assert.equal(item.instant, null);
  }
});

test('chuỗi ISO đã có múi giờ được giữ nguyên', () => {
  const item = parseDeadlineItem('d4', 'abstract', '2027-01-15T23:59:59Z', null);
  assert.equal(item.instant, '2027-01-15T23:59:59Z');
  assert.equal(item.precision, 'instant');
});

test('có giờ nhưng không rõ múi giờ thì không đoán', () => {
  const item = parseDeadlineItem('d5', 'paper', '2027-01-15 23:59:59', 'Giờ địa phương');
  assert.equal(item.instant, null);
  assert.equal(item.precision, 'unknown');
});

test('chỉ gắn verified khi có verifiedAt', () => {
  const noDate = parseDeadlineItem('d6', 'paper', '2027-01-15T00:00:00Z', null, { quality: 'verified' });
  assert.equal(noDate.quality, 'unverified');
  const withDate = parseDeadlineItem('d7', 'paper', '2027-01-15T00:00:00Z', null, {
    quality: 'verified',
    verifiedAt: '2026-11-01T00:00:00Z',
  });
  assert.equal(withDate.quality, 'verified');
});

test('chuẩn hóa mảng CCFDDL thành Edition, Round, DeadlineItem', () => {
  const raw = [{
    title: 'TEST',
    description: 'Test Conference',
    sub: 'ai',
    rank: { ccf: 'A', core: 'A*' },
    confs: [
      {
        id: 'test27', year: 2027, place: 'Online', timezone: 'AoE', link: 'https://example.com',
        timeline: [{ abstract_deadline: '2027-01-01 23:59:59', deadline: '2027-01-08 23:59:59' }],
      },
      { year: '2028', place: 'Hybrid, Paris', timeline: [{ deadline: 'TBD' }, { deadline: '2028-02-01' }] },
      { year: 2029, place: 'Paris, France', link: 'javascript:alert(1)', timeline: [] },
    ],
  }];
  const { meta, editions } = normalizeCatalog(raw);
  assert.equal(meta.mode, 'live');
  assert.equal(editions.length, 3);

  const [first, second, third] = editions;
  assert.equal(first.id, 'test27');
  assert.deepEqual(first.fields, ['AI']);
  assert.deepEqual([first.ranks.ccf, first.ranks.core], ['A', 'A*']);
  assert.equal(first.format, 'Online');
  assert.equal(first.websiteUrl, 'https://example.com');
  assert.equal(first.rounds[0].label, 'Chính thức');
  assert.deepEqual(first.rounds[0].deadlines.map((d) => d.id), ['r1-abstract', 'r1-paper']);
  assert.equal(first.rounds[0].deadlines[1].instant, '2027-01-08T23:59:59-12:00');

  assert.equal(second.id, 'test-2028');
  assert.equal(second.year, 2028);
  assert.equal(second.format, 'Hybrid');
  assert.deepEqual(second.rounds.map((r) => r.label), ['Round 1', 'Round 2']);

  assert.equal(third.format, 'Offline');
  assert.equal(third.websiteUrl, null, 'link không phải http/https bị bỏ');
});

test('catalog đã chuẩn hóa: hạ verified thiếu verifiedAt, gắn tba cho mốc TBA', () => {
  const { editions } = normalizeCatalog({
    meta: { mode: 'snapshot' },
    editions: [{
      id: 'x', seriesKey: 'x', acronym: 'X', rounds: [{ id: 'r1', deadlines: [
        { id: 'a', quality: 'verified', precision: 'instant' },
        { id: 'b', quality: 'unverified', precision: 'unknown', sourceText: 'TBA' },
      ] }],
    }],
  });
  const [a, b] = editions[0].rounds[0].deadlines;
  assert.equal(a.quality, 'unverified');
  assert.equal(b.quality, 'tba');
});

test('dữ liệu thô sai cấu trúc thì báo lỗi rõ ràng', () => {
  assert.throws(() => normalizeCatalog(null), /không tồn tại/);
  assert.throws(() => normalizeCatalog({ foo: 1 }), /không hợp lệ/);
});
