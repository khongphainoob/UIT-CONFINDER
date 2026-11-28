// TV1-05: lọc bằng SQL phải cho cùng kết quả với logic frontend (getNextSubmission).
import { before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { getNextSubmission } from '../../site/js/deadline-utils.js';
import { countEditions, createDatabase, queryEditionIds, readMatchCache, writeMatchCache } from '../src/db.js';
import { validateFilters } from '../src/filters.js';
import { regionMatches } from '../src/normalize.js';
import { FIXED_NOW, getCatalog } from './helpers.js';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('queryEditionIds trên dữ liệu thật', () => {
  let catalog;
  let db;
  before(async () => {
    catalog = await getCatalog();
    db = createDatabase(catalog);
  });

  const ids = (raw) => new Set(queryEditionIds(db, validateFilters(raw, { countries: catalog.countries }), { now: FIXED_NOW }));
  const expected = (predicate) => new Set(catalog.editions.filter(predicate).map((edition) => edition.id));

  test('nạp đủ số kỳ', () => {
    assert.equal(countEditions(db), catalog.editions.length);
  });

  test('khu vực Việt Nam ra 11 kỳ; châu Á gồm cả Việt Nam', () => {
    assert.equal(ids({ region: 'vietnam' }).size, 11);
    const asia = ids({ region: 'asia' });
    for (const id of ids({ region: 'vietnam' })) assert.ok(asia.has(id), id);
    assert.deepEqual(asia, expected((edition) => regionMatches(edition.region, 'asia')));
  });

  test('khu vực và quốc gia cùng có thì lấy hợp: châu Âu hoặc Nhật', () => {
    const result = ids({ region: 'europe', countries: ['JP'] });
    assert.deepEqual(result, expected((edition) => edition.region === 'europe' || edition.country === 'JP'));
  });

  test('ccfMin B gồm A và B; coreMin A gồm A* và A', () => {
    assert.deepEqual(ids({ ccfMin: 'B' }), expected((edition) => ['A', 'B'].includes(edition.ranks.ccf)));
    assert.deepEqual(ids({ coreMin: 'A' }), expected((edition) => ['A*', 'A'].includes(edition.ranks.core)));
  });

  for (const kind of ['any', 'abstract', 'paper']) {
    for (const days of [30, 90, 180]) {
      test(`cửa sổ ${days} ngày, loại ${kind}: khớp futureDeadlines của getNextSubmission`, () => {
        const end = FIXED_NOW + days * DAY_MS;
        const reference = expected((edition) => getNextSubmission(edition, { kind, now: FIXED_NOW })
          .futureDeadlines.some((deadline) => deadline.targetTime <= end));
        assert.ok(reference.size > 0, 'cần có dữ liệu để so sánh');
        assert.deepEqual(ids({ withinDays: days, kind }), reference);
      });
    }
  }

  test('chuỗi kiểu SQL injection trong từ khóa không ảnh hưởng truy vấn', () => {
    const before = countEditions(db);
    const result = ids({ keywords: ["'; DROP TABLE editions; --"], region: 'asia' });
    assert.ok(result.size > 0);
    assert.equal(countEditions(db), before);
  });

  test('quốc gia lạ truyền thẳng vào SQL vẫn là tham số, không phải câu lệnh', () => {
    const result = queryEditionIds(db, { countries: ["VN' OR '1'='1"] }, { now: FIXED_NOW });
    assert.deepEqual(result, []);
  });
});

test('cache: hết hạn sau ttl', async () => {
  const db = createDatabase({ editions: [] });
  writeMatchCache(db, 'abc', { results: [{ id: 'x' }] }, { now: 1000 });
  assert.deepEqual(readMatchCache(db, 'abc', { now: 1500, ttlMs: 1000 }), { results: [{ id: 'x' }] });
  assert.equal(readMatchCache(db, 'abc', { now: 2500, ttlMs: 1000 }), null);
  assert.equal(readMatchCache(db, 'khong-co', { now: 1500, ttlMs: 1000 }), null);
});
