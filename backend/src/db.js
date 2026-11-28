// SQLite có sẵn trong Node (node:sqlite). DB nằm trong bộ nhớ và được nạp lại từ JSON
// mỗi lần server khởi động, vì Render bản miễn phí xóa ổ đĩa sau mỗi lần deploy (QĐ4).
import { DatabaseSync } from 'node:sqlite';
import { CCF_RANKS, CORE_RANKS, ranksAtLeast } from './filters.js';
import { regionsWithin } from './normalize.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const SCHEMA = `
CREATE TABLE series (
  key            TEXT PRIMARY KEY,
  acronym        TEXT NOT NULL,
  name           TEXT,
  field          TEXT,
  ccf            TEXT,
  core           TEXT,
  summary        TEXT,
  topics_json    TEXT,
  cfp_url        TEXT
);
CREATE TABLE editions (
  id          TEXT PRIMARY KEY,
  series_key  TEXT NOT NULL REFERENCES series(key),
  year        INTEGER,
  place       TEXT,
  country     TEXT,
  region      TEXT,
  format      TEXT,
  website_url TEXT,
  -- Bản JSON đầy đủ của kỳ (đúng contracts.md) để GET /api/conferences trả lại nguyên shape,
  -- còn các cột ở trên dùng cho WHERE và chỉ mục.
  payload     TEXT NOT NULL
);
CREATE TABLE deadlines (
  id          TEXT PRIMARY KEY,
  edition_id  TEXT NOT NULL REFERENCES editions(id),
  round_label TEXT,
  kind        TEXT,
  instant_utc TEXT,
  source_text TEXT,
  timezone    TEXT,
  quality     TEXT
);
CREATE TABLE match_cache (
  query_hash  TEXT PRIMARY KEY,
  result_json TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);
CREATE TABLE ingest_log (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  run_at         TEXT NOT NULL,
  source         TEXT,
  editions_total INTEGER,
  errors         TEXT
);
CREATE INDEX idx_editions_series ON editions(series_key);
CREATE INDEX idx_editions_region ON editions(region, country);
CREATE INDEX idx_deadlines_edition ON deadlines(edition_id, instant_utc);
`;

// Chỉ mốc có giờ chính xác mới tính là "còn hạn", giống getNextSubmission (contracts.md mục 2).
function toUtc(deadline) {
  if (deadline.precision !== 'instant' || ['estimated', 'tba'].includes(deadline.quality)) return null;
  const time = deadline.instant ? Date.parse(deadline.instant) : Number.NaN;
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

export function createDatabase(catalog) {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);

  const insertSeries = db.prepare(`
    INSERT OR IGNORE INTO series (key, acronym, name, field, ccf, core, summary, topics_json, cfp_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insertEdition = db.prepare(`
    INSERT OR IGNORE INTO editions (id, series_key, year, place, country, region, format, website_url, payload)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insertDeadline = db.prepare(`
    INSERT OR IGNORE INTO deadlines (id, edition_id, round_label, kind, instant_utc, source_text, timezone, quality)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);

  // Gói trong một transaction để nạp khoảng 2.400 kỳ trong chưa tới một giây.
  db.exec('BEGIN');
  try {
    for (const edition of catalog.editions) {
      insertSeries.run(
        edition.seriesKey,
        edition.acronym,
        edition.name ?? null,
        edition.fields?.[0] ?? null,
        edition.ranks?.ccf ?? null,
        edition.ranks?.core ?? null,
        edition.summary ?? null,
        edition.topics ? JSON.stringify(edition.topics) : null,
        edition.links?.cfp ?? null,
      );
      insertEdition.run(
        edition.id,
        edition.seriesKey,
        edition.year ?? null,
        edition.place ?? null,
        edition.country ?? null,
        edition.region ?? null,
        edition.format ?? null,
        edition.websiteUrl ?? null,
        JSON.stringify(edition),
      );
      for (const round of edition.rounds ?? []) {
        for (const deadline of round.deadlines ?? []) {
          insertDeadline.run(
            `${edition.id}:${deadline.id}`,
            edition.id,
            round.label ?? null,
            deadline.type ?? null,
            toUtc(deadline),
            deadline.sourceText ?? null,
            deadline.timezone ?? null,
            deadline.quality ?? null,
          );
        }
      }
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  return db;
}

export function countEditions(db) {
  return db.prepare('SELECT COUNT(*) AS total FROM editions').get().total;
}

function placeholders(values) {
  return values.map(() => '?').join(', ');
}

/**
 * Lọc kỳ hội nghị bằng SQL theo bộ lọc ĐÃ qua validateFilters (TV1-05).
 * Mọi giá trị đi vào câu SQL qua tham số `?`; phần nối chuỗi chỉ là tên cột và dấu `?` do code tự sinh.
 *
 * - region và countries cùng có thì lấy hợp (OR): "châu Á hoặc Úc".
 * - withinDays: còn ít nhất một mốc chính xác trong (now, now + N ngày], cùng quy tắc với futureDeadlines.
 *
 * @returns {string[]} edition id
 */
export function queryEditionIds(db, filters, { now = Date.now() } = {}) {
  const where = [];
  const params = [];

  const place = [];
  if (filters.region) {
    const regions = regionsWithin(filters.region);
    place.push(`e.region IN (${placeholders(regions)})`);
    params.push(...regions);
  }
  if (filters.countries?.length) {
    place.push(`e.country IN (${placeholders(filters.countries)})`);
    params.push(...filters.countries);
  }
  if (place.length) where.push(`(${place.join(' OR ')})`);

  const ccf = ranksAtLeast(filters.ccfMin, CCF_RANKS);
  if (ccf.length) {
    where.push(`s.ccf IN (${placeholders(ccf)})`);
    params.push(...ccf);
  }
  const core = ranksAtLeast(filters.coreMin, CORE_RANKS);
  if (core.length) {
    where.push(`s.core IN (${placeholders(core)})`);
    params.push(...core);
  }
  if (filters.fields?.length) {
    where.push(`s.field IN (${placeholders(filters.fields)})`);
    params.push(...filters.fields);
  }
  if (filters.withinDays) {
    const kinds = filters.kind === 'abstract' || filters.kind === 'paper' ? [filters.kind] : ['abstract', 'paper'];
    where.push(`EXISTS (
      SELECT 1 FROM deadlines d
      WHERE d.edition_id = e.id
        AND d.kind IN (${placeholders(kinds)})
        AND d.instant_utc > ? AND d.instant_utc <= ?)`);
    params.push(...kinds, new Date(now).toISOString(), new Date(now + filters.withinDays * DAY_MS).toISOString());
  }

  const sql = `SELECT e.id FROM editions e JOIN series s ON s.key = e.series_key
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY e.id`;
  return db.prepare(sql).all(...params).map((row) => row.id);
}

/**
 * Đọc kỳ hội nghị từ SQLite theo đúng shape contracts.md (TV1-06).
 * @param {string[] | null} ids null = tất cả; giữ thứ tự id như queryEditionIds trả về
 */
export function listEditions(db, ids = null) {
  if (ids === null) {
    return db.prepare('SELECT payload FROM editions ORDER BY rowid').all().map((row) => JSON.parse(row.payload));
  }
  if (!ids.length) return [];
  const statement = db.prepare('SELECT payload FROM editions WHERE id = ?');
  return ids.map((id) => statement.get(id)).filter(Boolean).map((row) => JSON.parse(row.payload));
}

// Cache kết quả AI (TV4-06). created_at là milliseconds để so sánh thẳng với now.
export function readMatchCache(db, hash, { now, ttlMs }) {
  const row = db.prepare('SELECT result_json, created_at FROM match_cache WHERE query_hash = ?').get(hash);
  if (!row || now - row.created_at > ttlMs) return null;
  return JSON.parse(row.result_json);
}

export function writeMatchCache(db, hash, result, { now }) {
  db.prepare('INSERT OR REPLACE INTO match_cache (query_hash, result_json, created_at) VALUES (?, ?, ?)')
    .run(hash, JSON.stringify(result), now);
}

// Dọn bản hết hạn để bảng không phình mãi khi server chạy lâu.
export function pruneMatchCache(db, { now, ttlMs }) {
  db.prepare('DELETE FROM match_cache WHERE created_at < ?').run(now - ttlMs);
}
