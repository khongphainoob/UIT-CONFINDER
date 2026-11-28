// GET /api/conferences: trả catalog đúng shape contracts.md, đọc từ SQLite (TV1-06).
// Không có tham số thì trả tất cả, giống file allconf.json của CCFDDL nên frontend dùng thay được.
// Có tham số thì lọc ngay bằng SQL, dùng chung queryEditionIds với luồng AI:
//   ?region=asia&country=VN,JP&ccfMin=B&coreMin=A&field=AI,SE&withinDays=90
// Giá trị sai (region lạ, hạng lạ…) bị validateFilters bỏ qua, meta.filters cho biết bộ lọc thực sự đã áp dụng.
import { Router } from 'express';
import { listEditions, queryEditionIds } from '../db.js';
import { validateFilters } from '../filters.js';
import { createLimiter } from '../middleware/rate-limit.js';

const MAX_PARAM_LENGTH = 200;

function single(value) {
  const text = Array.isArray(value) ? value[0] : value;
  return typeof text === 'string' && text.length <= MAX_PARAM_LENGTH ? text.trim() : undefined;
}

function list(value) {
  const text = single(value);
  return text ? text.split(',').map((item) => item.trim()).filter(Boolean) : undefined;
}

export function parseConferenceQuery(query, countries) {
  const withinDays = single(query.withinDays);
  const filters = validateFilters({
    region: single(query.region),
    countries: list(query.country),
    ccfMin: single(query.ccfMin)?.toUpperCase(),
    coreMin: single(query.coreMin)?.toUpperCase(),
    fields: list(query.field)?.map((field) => field.toUpperCase()),
    withinDays: withinDays ? Number(withinDays) : undefined,
  }, { countries });
  const active = Boolean(filters.region || filters.countries.length || filters.ccfMin || filters.coreMin
    || filters.fields.length || filters.withinDays);
  return { filters, active };
}

export function createConferencesRouter({ config, catalog, db, now = Date.now }) {
  const router = Router();

  router.get(
    '/conferences',
    createLimiter({ windowMs: 60_000, limit: config.limits.conferencesPerMinute }),
    (req, res) => {
      const { filters, active } = parseConferenceQuery(req.query, catalog.countries);
      const editions = active ? listEditions(db, queryEditionIds(db, filters, { now: now() })) : listEditions(db);
      const { keywords, kind, ...applied } = filters;
      res.json({
        meta: { ...catalog.meta, mode: 'live', total: editions.length, ...(active ? { filters: applied } : {}) },
        editions,
      });
    },
  );

  return router;
}
