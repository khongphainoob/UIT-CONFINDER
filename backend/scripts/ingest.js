// Chủ: TV1 (TV1-04). GitHub Actions chạy file này hằng ngày (TV4-03), sau đó tới crawl và enrich.
// Lỗi ở bất kỳ bước nào: in lý do, exitCode = 1 và KHÔNG ghi file, để server tiếp tục dùng bản cũ.
//
// Chạy thử: npm run ingest (trong thư mục backend)
import { ENRICHED_PATH, readJsonIfExists, writeJsonAtomic } from '../src/catalog.js';
import { buildCatalog, describeChange, fetchCcfddl } from '../src/ingest.js';

try {
  const previous = await readJsonIfExists(ENRICHED_PATH);
  const raw = await fetchCcfddl();
  const next = buildCatalog(raw, previous);
  await writeJsonAtomic(ENRICHED_PATH, next);

  const change = describeChange(previous, next);
  console.log(`Ingest xong: ${change.total} kỳ từ ${raw.length} hội nghị, giữ phần làm giàu của ${Object.keys(next.series).length} chuỗi.`);
  if (change.added.length) console.log(`  Thêm ${change.added.length}: ${change.added.slice(0, 20).join(', ')}`);
  if (change.removed.length) console.log(`  Bớt ${change.removed.length}: ${change.removed.slice(0, 20).join(', ')}`);
} catch (error) {
  console.error(`Ingest lỗi, giữ nguyên file cũ: ${error.message}`);
  process.exitCode = 1;
}
