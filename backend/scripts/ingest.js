// Chủ: TV1 (TV1-04). GitHub Actions chạy file này hằng ngày (TV4-03).
//
// TODO(TV1-04):
// 1. fetch('https://ccfddl.com/conference/allconf.json', { signal: AbortSignal.timeout(20_000) })
// 2. normalizeCatalog() trong site/js/data-adapter.js, rồi gắn country/region bằng src/normalize.js
// 3. Đọc catalog.enriched.json cũ (nếu có) và giữ lại summary/topics/cfp đã làm giàu theo seriesKey
// 4. Kiểm tra: số kỳ không giảm quá 20% so với file cũ, nếu giảm thì coi như nguồn lỗi
// 5. Ghi ra file tạm rồi đổi tên (fs.rename) để không bao giờ để lại file ghi dở
// 6. Lỗi bất kỳ bước nào: in lý do, process.exitCode = 1, KHÔNG ghi file
//
// Chạy thử: npm run ingest (trong thư mục backend)

console.error('TODO(TV1-04): chưa viết script ingest.');
process.exitCode = 1;
