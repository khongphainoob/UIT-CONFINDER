// Chủ: TV1 (TV1-04). Lấy dữ liệu gốc từ CCFDDL, chuẩn hóa, giữ phần đã làm giàu từ lần chạy trước.
// Tách hàm thuần (buildCatalog) khỏi script để test được mà không cần mạng.
import { normalizeCatalog } from '../../site/js/data-adapter.js';

export const CCFDDL_URL = 'https://ccfddl.com/conference/allconf.json';
// Số kỳ giảm quá 20% so với lần trước thì coi như nguồn lỗi (trả thiếu dữ liệu), không ghi đè.
export const MAX_DROP_RATIO = 0.2;

export async function fetchCcfddl({ fetchImpl = fetch, url = CCFDDL_URL, timeoutMs = 20_000 } = {}) {
  const response = await fetchImpl(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`CCFDDL trả HTTP ${response.status}`);
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error('CCFDDL không trả về mảng hội nghị.');
  return data;
}

/**
 * @param {unknown[]} raw dữ liệu allconf.json của CCFDDL
 * @param {{ editions?: object[], series?: object } | null} previous file catalog.enriched.json lần trước (nếu có)
 * @returns {{ meta: object, editions: object[], series: object }}
 */
export function buildCatalog(raw, previous, { now = Date.now() } = {}) {
  const catalog = normalizeCatalog(raw);
  if (!catalog.editions.length) throw new Error('CCFDDL trả danh sách rỗng.');

  const previousTotal = previous?.editions?.length ?? 0;
  const minimum = Math.ceil(previousTotal * (1 - MAX_DROP_RATIO));
  if (previousTotal && catalog.editions.length < minimum) {
    throw new Error(`Số kỳ giảm từ ${previousTotal} còn ${catalog.editions.length} (dưới ${minimum}), nghi nguồn lỗi nên không ghi.`);
  }

  // Giữ summary/topics/CFP của chuỗi còn tồn tại; chuỗi bị CCFDDL xóa thì bỏ luôn phần làm giàu.
  const keys = new Set(catalog.editions.map((edition) => edition.seriesKey));
  const series = {};
  for (const [key, info] of Object.entries(previous?.series ?? {})) {
    if (keys.has(key)) series[key] = info;
  }

  const ingestedAt = new Date(now).toISOString();
  return {
    meta: { ...catalog.meta, mode: 'live', fetchedAt: ingestedAt, ingestedAt },
    editions: catalog.editions,
    series,
  };
}

/** Tóm tắt thay đổi để in ra log của workflow. */
export function describeChange(previous, next) {
  const before = new Set((previous?.editions ?? []).map((edition) => edition.id));
  const after = new Set(next.editions.map((edition) => edition.id));
  const added = [...after].filter((id) => !before.has(id));
  const removed = [...before].filter((id) => !after.has(id));
  return { total: after.size, added, removed };
}
