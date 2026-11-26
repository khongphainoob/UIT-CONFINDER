// Middleware cuối chuỗi. Theo https://expressjs.com/en/guide/error-handling.html:
// hàm xử lý lỗi có đủ 4 tham số và được gắn sau mọi app.use() và route.
// Express 5 tự chuyển lỗi của hàm async (throw hoặc Promise bị reject) vào đây, không cần try/catch.
import { HttpError } from '../errors.js';

export function notFound(req, res) {
  res.status(404).json({ error: 'NOT_FOUND' });
}

export function errorHandler(error, req, res, next) {
  // Đã gửi header rồi thì để Express tự đóng kết nối.
  if (res.headersSent) {
    next(error);
    return;
  }
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.code, message: error.message, ...error.extra });
    return;
  }
  if (error.type === 'entity.too.large') {
    res.status(413).json({ error: 'PAYLOAD_TOO_LARGE' });
    return;
  }
  if (error.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'INVALID_INPUT', message: 'JSON không hợp lệ.' });
    return;
  }
  // Lỗi không lường trước: ghi log ở server, không gửi chi tiết hay stack trace ra ngoài.
  console.error(error);
  res.status(500).json({ error: 'INTERNAL_ERROR' });
}
