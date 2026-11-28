// Nạp catalog khi server khởi động, và đọc/ghi file catalog cho các script ingest → crawl → enrich.
// Ưu tiên file do cron tạo (data/catalog.enriched.json). Chưa có thì dùng snapshot của frontend,
// nhờ vậy server vẫn chạy được khi chưa chạy ingest lần nào.
//
// Shape file catalog.enriched.json:
//   { meta, editions: [...đúng contracts.md], series: { [seriesKey]: SeriesInfo } }
//   SeriesInfo = { cfpUrl?, cfpCrawledAt?, cfpError?, summary?, topics?, enrichedAt?, enrichModel?, enrichVersion? }
// Phần làm giàu để riêng theo seriesKey (không nhét vào từng kỳ) vì các năm của một hội nghị dùng chung chủ đề.
import { readFile, rename, writeFile } from 'node:fs/promises';
import { normalizeCatalog } from '../../site/js/data-adapter.js';
import { COUNTRIES, attachPlaceInfo } from './normalize.js';

export const ENRICHED_PATH = new URL('../data/catalog.enriched.json', import.meta.url);
export const SNAPSHOT_PATH = new URL('../../site/data/conferences.snapshot.json', import.meta.url);

async function readJson(url) {
  return JSON.parse(await readFile(url, 'utf8'));
}

/** Đọc file JSON, chưa có file thì trả null (lỗi khác như JSON hỏng vẫn ném ra). */
export async function readJsonIfExists(url) {
  try {
    return await readJson(url);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

/**
 * Ghi ra file tạm rồi đổi tên: rename trên cùng ổ đĩa là thao tác nguyên tử,
 * nên server hay workflow đọc file lúc nào cũng thấy bản cũ hoặc bản mới đầy đủ, không bao giờ thấy file ghi dở.
 */
export async function writeJsonAtomic(url, data) {
  const temp = new URL(`${url.href}.tmp-${process.pid}`);
  await writeFile(temp, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  await rename(temp, url);
}

/** Gắn summary/topics/link CFP của chuỗi vào từng kỳ. Không ghi đè link CFP sẵn có trong dữ liệu gốc. */
export function applySeriesInfo(editions, series = {}) {
  return editions.map((edition) => {
    const info = series[edition.seriesKey];
    if (!info) return edition;
    return {
      ...edition,
      summary: info.summary ?? null,
      topics: Array.isArray(info.topics) ? info.topics : [],
      links: { ...edition.links, cfp: edition.links?.cfp ?? info.cfpUrl ?? null },
    };
  });
}

/**
 * @returns {Promise<{ meta: object, editions: object[], countries: string[] }>}
 *   editions có thêm country/region và summary/topics nếu đã làm giàu (mở rộng shape contracts.md, không đổi trường cũ);
 *   countries là các mã quốc gia hợp lệ cho validateFilters.
 */
export async function loadCatalog({ enrichedPath = ENRICHED_PATH, snapshotPath = SNAPSHOT_PATH } = {}) {
  // enrichedPath = null: bỏ qua file cron, chỉ dùng snapshot (test cần dữ liệu cố định).
  let raw = enrichedPath ? await readJsonIfExists(enrichedPath) : null;
  const source = raw ? 'enriched' : 'snapshot';
  raw ??= await readJson(snapshotPath);
  // Dùng chung hàm chuẩn hóa với frontend để hai bên luôn ra cùng một shape (contracts.md).
  const catalog = normalizeCatalog(raw);
  const series = raw.series ?? {};
  return {
    meta: {
      ...catalog.meta,
      backendSource: source,
      enrichedSeries: Object.values(series).filter((info) => info.topics?.length).length,
    },
    editions: attachPlaceInfo(applySeriesInfo(catalog.editions, series)),
    countries: Object.keys(COUNTRIES),
  };
}
