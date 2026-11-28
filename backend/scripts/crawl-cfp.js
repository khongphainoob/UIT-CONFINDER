// Chủ: TV1 (TV1-07). Crawl trang Call for Papers để lấy văn bản chủ đề cho bước enrich.
//
// - Cần chạy `npm run ingest` trước (đọc data/catalog.enriched.json).
// - Văn bản thô lưu ở data/cfp/<seriesKey>.txt (đã .gitignore); trạng thái crawl lưu vào series[key] trong catalog.
// - Chuỗi lỗi kèm lý do ghi ra data/cfp-errors.json để đưa vào báo cáo.
//
// Chạy thử: npm run crawl -- --limit=20
import { mkdir, writeFile } from 'node:fs/promises';
import { ENRICHED_PATH, readJsonIfExists, writeJsonAtomic } from '../src/catalog.js';
import { cfpFileName, crawlSeries, createPoliteFetcher, pickSeriesToCrawl } from '../src/cfp-crawler.js';

const CFP_DIR = new URL('../data/cfp/', import.meta.url);
const ERRORS_PATH = new URL('../data/cfp-errors.json', import.meta.url);
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
const limit = limitArg ? Number.parseInt(limitArg.split('=')[1], 10) || 120 : 120;

try {
  const catalog = await readJsonIfExists(ENRICHED_PATH);
  if (!catalog) throw new Error('Chưa có data/catalog.enriched.json, chạy npm run ingest trước.');
  catalog.series ??= {};
  await mkdir(CFP_DIR, { recursive: true });

  const targets = pickSeriesToCrawl(catalog, { limit });
  console.log(`Crawl ${targets.length} chuỗi (giới hạn ${limit}, 1 request/giây).`);
  const fetchPage = createPoliteFetcher();
  const errors = [];
  let ok = 0;

  for (const [index, target] of targets.entries()) {
    const result = await crawlSeries(target, fetchPage);
    const info = { ...catalog.series[target.seriesKey], cfpCrawledAt: new Date().toISOString() };
    if (result.ok) {
      await writeFile(new URL(cfpFileName(target.seriesKey), CFP_DIR), result.text, 'utf8');
      info.cfpUrl = result.cfpUrl;
      delete info.cfpError;
      ok += 1;
    } else {
      info.cfpError = result.error;
      errors.push({ seriesKey: target.seriesKey, acronym: target.acronym, urls: target.urls, error: result.error });
    }
    catalog.series[target.seriesKey] = info;
    console.log(`  [${index + 1}/${targets.length}] ${target.acronym}: ${result.ok ? `OK ${result.cfpUrl}` : `lỗi: ${result.error.slice(0, 120)}`}`);
    // Lưu dần để lỡ bị dừng giữa chừng (timeout của workflow) vẫn giữ được phần đã crawl.
    if ((index + 1) % 20 === 0) await writeJsonAtomic(ENRICHED_PATH, catalog);
  }

  await writeJsonAtomic(ENRICHED_PATH, catalog);
  // File lỗi tổng hợp từ cả catalog (không chỉ lượt này), để chạy lại vài chuỗi không làm mất danh sách cũ.
  const allErrors = Object.entries(catalog.series)
    .filter(([, info]) => info.cfpError)
    .map(([seriesKey, info]) => ({ seriesKey, crawledAt: info.cfpCrawledAt, error: info.cfpError }));
  await writeFile(ERRORS_PATH, `${JSON.stringify(allErrors, null, 2)}\n`, 'utf8');
  console.log(`Crawl xong: ${ok} thành công, ${errors.length} lỗi trong lượt này; tổng ${allErrors.length} chuỗi lỗi (data/cfp-errors.json).`);
} catch (error) {
  console.error(`Crawl lỗi: ${error.message}`);
  process.exitCode = 1;
}
