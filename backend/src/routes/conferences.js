// GET /api/conferences: trả catalog đúng shape contracts.md.
import { Router } from 'express';
import { createLimiter } from '../middleware/rate-limit.js';

export function createConferencesRouter({ config, catalog }) {
  const router = Router();

  // TODO(TV1-06): đọc từ SQLite thay vì trả nguyên catalog trong bộ nhớ, giữ đúng shape contracts.md.
  router.get(
    '/conferences',
    createLimiter({ windowMs: 60_000, limit: config.limits.conferencesPerMinute }),
    (req, res) => {
      res.json({ meta: { ...catalog.meta, mode: 'live' }, editions: catalog.editions });
    },
  );

  return router;
}
