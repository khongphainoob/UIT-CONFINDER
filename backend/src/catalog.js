// Nạp catalog khi server khởi động.
// Ưu tiên file do cron tạo (data/catalog.enriched.json). Chưa có thì dùng snapshot của frontend,
// nhờ vậy server chạy được ngay cả khi TV1 chưa xong script ingest.
import { readFile } from 'node:fs/promises';
import { normalizeCatalog } from '../../site/js/data-adapter.js';
import { COUNTRIES, attachPlaceInfo } from './normalize.js';

export const ENRICHED_PATH = new URL('../data/catalog.enriched.json', import.meta.url);
export const SNAPSHOT_PATH = new URL('../../site/data/conferences.snapshot.json', import.meta.url);

async function readJson(url) {
  return JSON.parse(await readFile(url, 'utf8'));
}

/**
 * @returns {Promise<{ meta: object, editions: object[], countries: string[] }>}
 *   editions có thêm country/region (mở rộng shape contracts.md, không đổi trường cũ);
 *   countries là các mã quốc gia hợp lệ cho validateFilters.
 */
export async function loadCatalog({ enrichedPath = ENRICHED_PATH, snapshotPath = SNAPSHOT_PATH } = {}) {
  let raw;
  let source;
  try {
    raw = await readJson(enrichedPath);
    source = 'enriched';
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    raw = await readJson(snapshotPath);
    source = 'snapshot';
  }
  // Dùng chung hàm chuẩn hóa với frontend để hai bên luôn ra cùng một shape (contracts.md).
  const catalog = normalizeCatalog(raw);
  return {
    meta: { ...catalog.meta, backendSource: source },
    editions: attachPlaceInfo(catalog.editions),
    countries: Object.keys(COUNTRIES),
  };
}
