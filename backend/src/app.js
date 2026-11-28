// Ghép Express app: middleware chung → các router → 404 → xử lý lỗi.
// Tách khỏi server.js để test gọi được mà không cần mở cổng.
// Thứ tự middleware theo tài liệu Express:
//   bảo mật: https://expressjs.com/en/advanced/best-practice-security.html
//   hiệu năng: https://expressjs.com/en/advanced/best-practice-performance.html
//   proxy: https://expressjs.com/en/guide/behind-proxies.html
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { errorHandler, notFound } from './middleware/error-handler.js';
import { createConferencesRouter } from './routes/conferences.js';
import { createHealthRouter } from './routes/health.js';
import { createMatchRouter } from './routes/match.js';

/**
 * @param {{ config: ReturnType<import('./config.js').loadConfig>,
 *           catalog: { meta: object, editions: object[] } } & ReturnType<import('./services.js').createServices>} deps
 */
export function createApp(deps) {
  const { config } = deps;
  const app = express();

  // Số proxy đứng trước server. Render cần 1; sai số này thì rate limit đếm sai IP (QĐ9).
  app.set('trust proxy', config.trustProxy);

  // Helmet đặt các header bảo mật và tắt X-Powered-By.
  // Cho phép đọc tài nguyên khác origin vì frontend (GitHub Pages) và API (Render) khác domain.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  // Nén gzip: /api/conferences từ khoảng 2 MB còn khoảng 130 KB.
  app.use(compression());
  // Domain không có trong danh sách không nhận header CORS, trình duyệt tự chặn.
  app.use(cors({ origin: config.allowedOrigins, methods: ['GET', 'POST'] }));
  app.use(express.json({ limit: config.limits.bodyBytes }));

  app.use('/api', createHealthRouter(deps));
  app.use('/api', createConferencesRouter(deps));
  app.use('/api', createMatchRouter(deps));

  app.use('/api', notFound);
  app.use(errorHandler);

  return app;
}
