// POST /api/match: kiểm tra đầu vào rồi chuyển cho luồng gợi ý trong match.js.
import { Router } from 'express';
import { invalidInput } from '../errors.js';
import { runMatch } from '../match.js';
import { createLimiter } from '../middleware/rate-limit.js';

export function validateMatchBody(body, limits) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw invalidInput('Body phải là JSON object.');
  }
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  if (description.length < limits.descriptionMin || description.length > limits.descriptionMax) {
    throw invalidInput(`Mô tả cần từ ${limits.descriptionMin} đến ${limits.descriptionMax} ký tự.`);
  }
  if (body.filters !== undefined
    && (typeof body.filters !== 'object' || body.filters === null || Array.isArray(body.filters))) {
    throw invalidInput('filters phải là object.');
  }
  return { description, filters: body.filters ?? null };
}

export function createMatchRouter(deps) {
  const { limits } = deps.config;
  const router = Router();

  router.post(
    '/match',
    // Hai tầng: chặn bắn dồn trong 1 phút, và chặn tổng số lượt trong 1 ngày.
    createLimiter({ windowMs: 60_000, limit: limits.matchPerMinute }),
    createLimiter({ windowMs: 24 * 60 * 60_000, limit: limits.matchPerDay }),
    // Hàm async: Express 5 tự đưa lỗi vào errorHandler.
    async (req, res) => {
      const input = validateMatchBody(req.body, limits);
      const result = await runMatch(input, deps);
      res.json(result);
    },
  );

  return router;
}
