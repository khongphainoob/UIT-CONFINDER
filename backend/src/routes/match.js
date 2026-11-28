// POST /api/match: kiểm tra đầu vào rồi chuyển cho luồng gợi ý trong match.js.
import { Router } from 'express';
import { invalidInput } from '../errors.js';
import { createLimiter } from '../middleware/rate-limit.js';

export function validateMatchBody(body, limits) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw invalidInput('Body phải là JSON object.');
  }
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  if (description.length < limits.descriptionMin || description.length > limits.descriptionMax) {
    throw invalidInput(`Mô tả cần từ ${limits.descriptionMin} đến ${limits.descriptionMax} ký tự.`);
  }
  if (body.filters !== undefined && body.filters !== null
    && (typeof body.filters !== 'object' || Array.isArray(body.filters))) {
    throw invalidInput('filters phải là object.');
  }
  return { description, filters: body.filters ?? null };
}

export function createMatchRouter({ config, matchService }) {
  const { limits } = config;
  const router = Router();

  router.post(
    '/match',
    // Hai tầng: chặn bắn dồn trong 1 phút, và chặn tổng số lượt trong 1 ngày.
    createLimiter({ windowMs: 60_000, limit: limits.matchPerMinute }),
    createLimiter({ windowMs: 24 * 60 * 60_000, limit: limits.matchPerDay }),
    // Hàm async: Express 5 tự đưa lỗi vào errorHandler.
    async (req, res) => {
      const input = validateMatchBody(req.body, limits);
      const result = await matchService.match(input);
      // Kết quả phụ thuộc người hỏi, không để proxy hay trình duyệt lưu lại.
      res.set('Cache-Control', 'no-store').json(result);
    },
  );

  return router;
}
