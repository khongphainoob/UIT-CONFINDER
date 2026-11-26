// Giới hạn tần suất theo IP (QĐ9). Cấu hình theo tài liệu express-rate-limit:
// https://express-rate-limit.mintlify.app/reference/configuration
import { rateLimit } from 'express-rate-limit';

export function createLimiter({ windowMs, limit }) {
  return rateLimit({
    windowMs,
    limit,
    // 'draft-8' gửi header RateLimit chuẩn và Retry-After khi bị chặn; tắt header X-RateLimit-* cũ.
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler(req, res, _next, options) {
      const resetTime = req.rateLimit?.resetTime;
      const seconds = resetTime instanceof Date
        ? Math.ceil((resetTime.getTime() - Date.now()) / 1000)
        : Math.ceil(options.windowMs / 1000);
      res.status(options.statusCode).json({ error: 'RATE_LIMITED', retryAfter: Math.max(seconds, 1) });
    },
  });
}
