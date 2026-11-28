// GET /api/health, và /api/debug/ip khi bật DEBUG_IP để kiểm tra trust proxy sau khi deploy.
import { Router } from 'express';
import { countEditions } from '../db.js';

export function createHealthRouter({ config, catalog, db, budget }) {
  const router = Router();

  router.get('/health', (req, res) => {
    res.json({
      ok: true,
      editions: countEditions(db),
      source: catalog.meta.backendSource,
      dataUpdatedAt: catalog.meta.fetchedAt ?? null,
      aiConfigured: Boolean(config.gemini.apiKey && config.gemini.model),
      // Chỉ số lượt đã dùng, không có thông tin người dùng.
      aiBudget: { used: budget.snapshot().used, dailyLimit: budget.snapshot().dailyLimit },
    });
  });

  if (config.debugIp) {
    router.get('/debug/ip', (req, res) => res.json({ ip: req.ip, ips: req.ips }));
  }

  return router;
}
