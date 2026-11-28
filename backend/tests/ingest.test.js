// TV1-04: ingest giữ phần làm giàu, chặn nguồn trả thiếu, ghi file nguyên tử; catalog gắn summary/topics vào từng kỳ.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { applySeriesInfo, loadCatalog, writeJsonAtomic } from '../src/catalog.js';
import { buildCatalog, describeChange, fetchCcfddl } from '../src/ingest.js';

// Hai hội nghị dạng allconf.json của CCFDDL.
function rawConf(title, sub, years) {
  return {
    title, description: `${title} Conference`, sub, rank: { ccf: 'A', core: 'A*' }, dblp: title.toLowerCase(),
    confs: years.map((year) => ({
      year, id: `${title.toLowerCase()}${String(year).slice(2)}`, link: `https://${title.toLowerCase()}.org/${year}`,
      timeline: [{ deadline: `${year - 1}-11-01 23:59:59` }], timezone: 'AoE', date: `June ${year}`, place: 'Hanoi, Vietnam',
    })),
  };
}
const RAW = [rawConf('CVPR', 'AI', [2026, 2027]), rawConf('ICSE', 'SE', [2027])];
const NOW = Date.parse('2026-11-28T00:00:00Z');

describe('buildCatalog', () => {
  test('chuẩn hóa đúng shape, giữ series của chuỗi còn tồn tại, bỏ chuỗi đã bị xóa', () => {
    const previous = {
      editions: [],
      series: {
        'cvpr': { summary: 'Computer vision.', topics: ['object detection'] },
        'XX/gone': { summary: 'Hội nghị đã bị CCFDDL xóa.', topics: ['x'] },
      },
    };
    const next = buildCatalog(RAW, previous, { now: NOW });
    assert.equal(next.editions.length, 3);
    assert.equal(next.editions[0].seriesKey, 'cvpr');
    assert.ok(Array.isArray(next.editions[0].rounds));
    assert.deepEqual(Object.keys(next.series), ['cvpr']);
    assert.equal(next.meta.ingestedAt, '2026-11-28T00:00:00.000Z');
  });

  test('số kỳ giảm quá 20% thì báo lỗi, không trả dữ liệu thiếu', () => {
    const previous = { editions: Array.from({ length: 10 }, (_, i) => ({ id: `e${i}` })), series: {} };
    assert.throws(() => buildCatalog(RAW, previous), /nghi nguồn lỗi/);
  });

  test('nguồn rỗng hoặc sai cấu trúc thì báo lỗi', () => {
    assert.throws(() => buildCatalog([], null), /rỗng/);
    assert.throws(() => buildCatalog({ khong: 'phai mang' }, null));
  });

  test('describeChange liệt kê kỳ thêm và bớt', () => {
    const next = buildCatalog(RAW, null, { now: NOW });
    const change = describeChange({ editions: [{ id: 'cvpr26' }, { id: 'old25' }] }, next);
    assert.deepEqual(change.added.sort(), ['cvpr27', 'icse27']);
    assert.deepEqual(change.removed, ['old25']);
  });
});

describe('fetchCcfddl', () => {
  test('HTTP lỗi hoặc không phải mảng thì ném lỗi', async () => {
    await assert.rejects(fetchCcfddl({ fetchImpl: async () => new Response('x', { status: 503 }) }), /HTTP 503/);
    await assert.rejects(fetchCcfddl({ fetchImpl: async () => Response.json({ a: 1 }) }), /mảng/);
    assert.equal((await fetchCcfddl({ fetchImpl: async () => Response.json(RAW) })).length, 2);
  });
});

describe('file catalog', () => {
  test('writeJsonAtomic không để lại file tạm', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'confinder-'));
    const url = pathToFileURL(join(dir, 'catalog.json'));
    await writeJsonAtomic(url, { a: 1 });
    await writeJsonAtomic(url, { a: 2 });
    assert.deepEqual(JSON.parse(await readFile(url, 'utf8')), { a: 2 });
    assert.deepEqual(await readdir(dir), ['catalog.json']);
  });

  test('loadCatalog đọc file đã làm giàu: gắn topics, link CFP và quốc gia vào từng kỳ', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'confinder-'));
    const url = pathToFileURL(join(dir, 'catalog.enriched.json'));
    const built = buildCatalog(RAW, null, { now: NOW });
    built.series['cvpr'] = { summary: 'Computer vision and pattern recognition.', topics: ['object detection', '3d vision', 'segmentation'], cfpUrl: 'https://cvpr.org/cfp', enrichedAt: '2026-11-28T00:00:00Z' };
    await writeJsonAtomic(url, built);

    const catalog = await loadCatalog({ enrichedPath: url });
    const cvpr = catalog.editions.find((edition) => edition.id === 'cvpr27');
    assert.equal(catalog.meta.backendSource, 'enriched');
    assert.equal(catalog.meta.enrichedSeries, 1);
    assert.deepEqual(cvpr.topics, ['object detection', '3d vision', 'segmentation']);
    assert.equal(cvpr.links.cfp, 'https://cvpr.org/cfp');
    assert.equal(cvpr.country, 'VN');
    assert.equal(catalog.editions.find((edition) => edition.id === 'icse27').topics, undefined);
  });

  test('applySeriesInfo không ghi đè link CFP có sẵn trong dữ liệu gốc', () => {
    const [edition] = applySeriesInfo([{ seriesKey: 'k', links: { cfp: 'https://goc/cfp' } }], { k: { cfpUrl: 'https://crawl/cfp', topics: ['a'] } });
    assert.equal(edition.links.cfp, 'https://goc/cfp');
  });
});
