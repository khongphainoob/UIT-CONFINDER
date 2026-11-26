// SQLite có sẵn trong Node (node:sqlite). DB nằm trong bộ nhớ và được nạp lại từ JSON
// mỗi lần server khởi động, vì Render bản miễn phí xóa ổ đĩa sau mỗi lần deploy (QĐ4).
import { DatabaseSync } from 'node:sqlite';

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
  cfp_url        TEXT,
  cfp_crawled_at TEXT
);
CREATE TABLE editions (
  id          TEXT PRIMARY KEY,
  series_key  TEXT NOT NULL REFERENCES series(key),
  year        INTEGER,
  place       TEXT,
  country     TEXT,
  region      TEXT,
  format      TEXT,
  website_url TEXT
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
  created_at  TEXT NOT NULL
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
CREATE INDEX idx_deadlines_edition ON deadlines(edition_id);
`;

function toUtc(instant) {
  const time = instant ? Date.parse(instant) : Number.NaN;
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
    INSERT OR IGNORE INTO editions (id, series_key, year, place, country, region, format, website_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
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
      );
      for (const round of edition.rounds ?? []) {
        for (const deadline of round.deadlines ?? []) {
          insertDeadline.run(
            `${edition.id}:${deadline.id}`,
            edition.id,
            round.label ?? null,
            deadline.kind ?? null,
            toUtc(deadline.instant),
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

/**
 * TODO(TV1-05): lọc kỳ hội nghị bằng SQL theo bộ lọc đã qua validateFilters.
 * Bắt buộc dùng tham số `?`, không nối chuỗi người dùng vào câu SQL.
 *
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {{ region?: string|null, countries?: string[], ccfMin?: string|null,
 *           coreMin?: string|null, withinDays?: number|null, fields?: string[] }} filters
 * @param {{ now?: number }} [options]
 * @returns {string[]} danh sách edition id thỏa điều kiện
 */
export function queryEditionIds(db, filters, { now = Date.now() } = {}) {
  void filters;
  void now;
  return db.prepare('SELECT id FROM editions').all().map((row) => row.id);
}
