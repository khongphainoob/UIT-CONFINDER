// Điểm chạy: nạp catalog → dựng SQLite → mở cổng.
// Đọc file một lần lúc khởi động là chấp nhận được; khi đang phục vụ request thì không dùng hàm đồng bộ.
import { loadCatalog } from './catalog.js';
import { loadConfig } from './config.js';
import { createApp } from './app.js';
import { countEditions, createDatabase } from './db.js';

const config = loadConfig();
const catalog = await loadCatalog();
const db = createDatabase(catalog);
const app = createApp({ config, catalog, db });

if (!config.gemini.apiKey || !config.gemini.model) {
  console.warn('Chưa có GEMINI_API_KEY hoặc GEMINI_MODEL: /api/match sẽ trả 503.');
}
if (!config.allowedOrigins.length) {
  console.warn('ALLOWED_ORIGIN đang trống: trình duyệt sẽ không gọi được API từ frontend.');
}

const server = app.listen(config.port, () => {
  console.log(`UIT ConFinder API: http://localhost:${config.port}/api/health`);
  console.log(`Đã nạp ${countEditions(db)} kỳ hội nghị từ ${catalog.meta.backendSource}.`);
});

// Render gửi SIGTERM khi deploy bản mới: ngừng nhận kết nối mới, xử lý xong request đang chạy rồi thoát.
function shutdown(signal) {
  console.log(`Nhận ${signal}, đang tắt server...`);
  server.close(() => {
    db.close();
    process.exit(0);
  });
  // Quá 10 giây vẫn chưa xong thì thoát hẳn.
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
