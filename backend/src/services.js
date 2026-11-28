// Dựng mọi đối tượng dùng chung một lần khi khởi động: SQLite, chỉ mục BM25, ngân sách AI, dịch vụ gợi ý.
// server.js và test cùng gọi hàm này nên test chạy đúng cấu hình như server thật.
import { createAiBudget } from './ai-budget.js';
import { createDatabase } from './db.js';
import { generateJson } from './gemini.js';
import { createMatchService } from './match.js';
import { createRetrievalIndex } from './retrieval.js';

/**
 * @param {{ config: object, catalog: { meta: object, editions: object[], countries: string[] },
 *           generate?: typeof generateJson, now?: () => number }} options
 *   generate và now chỉ thay trong test (Gemini giả, đồng hồ cố định).
 */
export function createServices({ config, catalog, generate = generateJson, now = Date.now }) {
  const db = createDatabase(catalog);
  const index = createRetrievalIndex(catalog.editions);
  const budget = createAiBudget({
    dailyLimit: config.limits.aiDailyBudget,
    maxConcurrent: config.limits.aiMaxConcurrent,
    now,
  });
  const matchService = createMatchService({
    config, catalog, db, index, budget, countries: catalog.countries, generate, now,
  });
  return { db, index, budget, matchService, now };
}
