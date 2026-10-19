// TV1: trang chỉ gọi getCatalog, không tự fetch một endpoint khác.
import { SNAPSHOT_URL } from './config.js';

export async function getCatalog({ signal } = {}) {
  const response = await fetch(SNAPSHOT_URL, { signal });
  if (!response.ok) throw new Error(`Không tải được catalog (HTTP ${response.status}).`);
  const catalog = await response.json();
  if (!catalog || !catalog.meta || !Array.isArray(catalog.editions)) {
    throw new Error('Catalog sai cấu trúc meta/editions.');
  }
  // TODO TV1: kiểm đầy đủ schema từng edition; live -> adapter -> fallback.
  // loadedAt là giờ đọc file, KHÔNG phải ngày kiểm chứng dữ liệu nguồn.
  return { meta: { ...catalog.meta, mode: 'snapshot', loadedAt: new Date().toISOString() }, editions: catalog.editions };
}
