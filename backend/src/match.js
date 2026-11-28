// Chủ: TV4 (TV4-04, TV4-06). Luồng gợi ý 5 bước của QĐ8 trong docs/t5-feedback-improvement-plan.md.
// Mỗi phụ thuộc (Gemini, thời gian, ngân sách) được truyền vào để test thay thế được.
import { createHash } from 'node:crypto';
import { getNextSubmission } from '../../site/js/deadline-utils.js';
import { pruneMatchCache, queryEditionIds, readMatchCache, writeMatchCache } from './db.js';
import { HttpError, aiUnavailable } from './errors.js';
import { relaxFilters, toExploreUrl, validateFilters } from './filters.js';
import { generateJson } from './gemini.js';
import {
  MAX_RESULTS, PARSE_SCHEMA, PARSE_SYSTEM, PROMPT_VERSION, RERANK_SCHEMA, RERANK_SYSTEM,
  buildParseUser, buildRerankUser,
} from './prompts.js';
import { FIELD_TERMS, rankByKeywords } from './retrieval.js';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CANDIDATE_LIMIT = 20;
const REASON_MAX = 300;
const TOPIC_MAX = 60;
const STATUS_ORDER = { upcoming: 0, unknown: 1, closed: 2 };

// Bỏ ký tự điều khiển (trừ xuống dòng) và gộp khoảng trắng để cache không lệch vì gõ thừa dấu cách.
export function cleanDescription(text) {
  return String(text)
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function cacheKey(description, filters) {
  const payload = JSON.stringify({ v: PROMPT_VERSION, d: description.toLowerCase(), f: filters });
  return createHash('sha256').update(payload).digest('hex');
}

// AI trả "none"/0 thay vì null (xem PARSE_SCHEMA); đổi về dạng validateFilters hiểu.
function fromParseOutput(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const clean = { ...raw };
  for (const key of ['region', 'ccfMin', 'coreMin']) if (clean[key] === 'none') clean[key] = null;
  if (clean.withinDays === 0) clean.withinDays = null;
  return clean;
}

// Năm mới nhất của từng hội nghị trong toàn catalog.
export function latestYearBySeries(editions) {
  const latest = new Map();
  for (const edition of editions) {
    if ((edition.year ?? 0) > (latest.get(edition.seriesKey) ?? 0)) latest.set(edition.seriesKey, edition.year);
  }
  return latest;
}

/**
 * Mỗi hội nghị chỉ một kỳ: ưu tiên kỳ còn hạn sớm nhất, không có thì kỳ mới nhất.
 * Chỉ giữ kỳ còn hạn hoặc kỳ mới nhất của hội nghị. Kỳ cũ (dù đã đóng hay hạn chưa rõ) không phải nơi
 * để nộp: WSDM 2023 ở Singapore không làm WSDM thành "hội nghị ở Singapore" khi kỳ 2027 ở Hồng Kông,
 * FSE 2023 hạn chưa rõ không được gợi ý khi đã có FSE 2027.
 */
export function pickOnePerSeries(editions, now, latestYears = latestYearBySeries(editions)) {
  const best = new Map();
  for (const edition of editions) {
    const submission = getNextSubmission(edition, { now });
    if (submission.status !== 'upcoming' && edition.year !== latestYears.get(edition.seriesKey)) continue;
    const item = { edition, submission };
    const current = best.get(edition.seriesKey);
    if (!current || isBetter(item, current)) best.set(edition.seriesKey, item);
  }
  return [...best.values()].sort(compareItems);
}

function isBetter(a, b) {
  return compareItems(a, b) < 0;
}

function compareItems(a, b) {
  const statusDiff = STATUS_ORDER[a.submission.status] - STATUS_ORDER[b.submission.status];
  if (statusDiff) return statusDiff;
  if (a.submission.status === 'upcoming') return a.submission.deadline.targetTime - b.submission.deadline.targetTime;
  return (b.edition.year ?? 0) - (a.edition.year ?? 0) || a.edition.id.localeCompare(b.edition.id);
}

// Thông tin gửi cho Gemini ở bước 5: chỉ những gì cần để đánh giá độ hợp đề tài.
// Cố ý KHÔNG gửi trạng thái và hạn nộp: AI từng nói sai ("closed" khi dữ liệu là upcoming) dù prompt cấm.
// Điều kiện thời gian đã lọc cứng bằng SQL ở bước 3; giao diện hiện hạn từ dữ liệu thật.
function toCandidate({ edition }) {
  return {
    id: edition.id,
    acronym: edition.acronym,
    name: edition.name,
    year: edition.year,
    field: edition.fields?.[0] ?? null,
    ccf: edition.ranks?.ccf ?? null,
    core: edition.ranks?.core ?? null,
    place: edition.place ?? null,
    country: edition.country ?? null,
    topics: Array.isArray(edition.topics) ? edition.topics.slice(0, 15) : [],
  };
}

function clampText(value, max) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

/**
 * Kiểm tra kết quả bước 5: bỏ ID không nằm trong danh sách ứng viên (chống AI bịa hội nghị),
 * bỏ trùng, kẹp điểm 0–100, cắt độ dài chữ.
 */
export function validateRerank(raw, candidateIds) {
  const allowed = new Set(candidateIds);
  const seen = new Set();
  const out = [];
  for (const item of Array.isArray(raw?.results) ? raw.results : []) {
    const id = typeof item?.id === 'string' ? item.id : '';
    if (!allowed.has(id) || seen.has(id)) continue;
    seen.add(id);
    const score = Math.round(Number(item.score));
    out.push({
      id,
      score: Number.isFinite(score) ? Math.min(100, Math.max(0, score)) : 0,
      reason: clampText(item.reason, REASON_MAX),
      matchedTopics: (Array.isArray(item.matchedTopics) ? item.matchedTopics : [])
        .map((topic) => clampText(topic, TOPIC_MAX))
        .filter(Boolean)
        .slice(0, 5),
    });
    if (out.length >= MAX_RESULTS) break;
  }
  return out;
}

/**
 * @param {{ config: object, catalog: { editions: object[] }, db: object, index: object,
 *           budget: ReturnType<import('./ai-budget.js').createAiBudget>,
 *           countries: string[], generate?: typeof generateJson, now?: () => number }} deps
 */
export function createMatchService({ config, catalog, db, index, budget, countries, generate = generateJson, now = Date.now }) {
  const editionsById = new Map(catalog.editions.map((edition) => [edition.id, edition]));
  const latestYears = latestYearBySeries(catalog.editions);
  const timeoutMs = config.limits.geminiTimeoutMs;

  async function callGemini(request) {
    if (!config.gemini.apiKey || !config.gemini.model) throw aiUnavailable('Server chưa cấu hình Gemini.');
    const release = budget.acquire();
    try {
      return await generate(config.gemini, { ...request, timeoutMs });
    } finally {
      release();
    }
  }

  // Bước 3: lọc SQL, rỗng thì nới dần cho tới khi có kết quả hoặc hết thứ để nới.
  function findCandidates(filters, at) {
    let current = filters;
    const relaxed = [];
    for (;;) {
      const editions = queryEditionIds(db, current, { now: at }).map((id) => editionsById.get(id)).filter(Boolean);
      const items = pickOnePerSeries(editions, at, latestYears);
      if (items.length) return { items, relaxed, filters: current };
      const next = relaxFilters(current);
      if (!next.relaxed) return { items: [], relaxed, filters: current };
      relaxed.push(next.relaxed);
      current = next.filters;
    }
  }

  async function match({ description: rawDescription, filters: clientFilters }) {
    const at = now();
    const description = cleanDescription(rawDescription);
    const presetFilters = clientFilters ? validateFilters(clientFilters, { countries }) : null;

    // Bước 0: cache.
    const key = cacheKey(description, presetFilters);
    pruneMatchCache(db, { now: at, ttlMs: CACHE_TTL_MS });
    const cached = readMatchCache(db, key, { now: at, ttlMs: CACHE_TTL_MS });
    if (cached) return { ...cached, results: hydrate(cached.results), cached: true };

    // Bước 1–2: AI phân tích câu hỏi (bỏ qua khi người dùng đã sửa chip và gửi lại bộ lọc).
    let parsedFilters = presetFilters;
    if (!parsedFilters) {
      const raw = await callGemini({ system: PARSE_SYSTEM, user: buildParseUser(description, at), schema: PARSE_SCHEMA, temperature: 0 });
      if (raw?.offTopic === true) {
        const result = { offTopic: true, parsedFilters: validateFilters({}), relaxed: [], exploreUrl: toExploreUrl(validateFilters({})), results: [] };
        writeMatchCache(db, key, result, { now: at });
        return { ...result, cached: false };
      }
      parsedFilters = validateFilters(fromParseOutput(raw), { countries });
    }

    // Bước 3–4: lọc SQL rồi BM25. AI không cho từ khóa thì dùng mô tả lĩnh vực làm từ khóa.
    const { items, relaxed, filters: usedFilters } = findCandidates(parsedFilters, at);
    const keywords = parsedFilters.keywords.length
      ? parsedFilters.keywords
      : parsedFilters.fields.map((field) => FIELD_TERMS[field]).filter(Boolean);
    const ranked = rankByKeywords(index, items.map((item) => item.edition), keywords, { limit: CANDIDATE_LIMIT });
    const base = { offTopic: false, parsedFilters, relaxed, exploreUrl: toExploreUrl(usedFilters) };
    if (!ranked.length) return { ...base, results: [], cached: false };

    // Bước 5: AI chọn và giải thích. Lỗi thì vẫn trả kết quả BM25 để người dùng không trắng tay.
    const submissions = new Map(items.map((item) => [item.edition.id, item]));
    const candidates = ranked.map(({ edition }) => toCandidate(submissions.get(edition.id)));
    let picks;
    try {
      const raw = await callGemini({ system: RERANK_SYSTEM, user: buildRerankUser(description, candidates, at), schema: RERANK_SCHEMA, temperature: 0.2 });
      picks = validateRerank(raw, candidates.map((candidate) => candidate.id));
    } catch (error) {
      // 503: Gemini lỗi, hết giờ, hết ngân sách hoặc đang bận; 422: bị bộ lọc an toàn chặn.
      if (error instanceof HttpError && (error.status === 503 || error.status === 422)) {
        return { ...base, results: hydrate(bm25Results(ranked)), rerankFailed: true, cached: false };
      }
      throw error;
    }
    if (!picks.length) {
      return { ...base, results: hydrate(bm25Results(ranked)), rerankFailed: true, cached: false };
    }

    // AI chấm độ hợp đề tài, dữ liệu quyết định hạn: còn hạn lên trước, giữ thứ tự của AI trong từng nhóm.
    const ordered = orderByStatus(picks, submissions);
    const result = { ...base, results: ordered };
    writeMatchCache(db, key, result, { now: at });
    return { ...result, results: hydrate(ordered), cached: false };
  }

  // Cache chỉ lưu id; khi trả về thì gắn edition đầy đủ để frontend dùng lại thẻ hội nghị.
  function hydrate(results) {
    return results
      .map((item) => ({ ...item, edition: editionsById.get(item.id) }))
      .filter((item) => item.edition);
  }

  return { match };
}

export function orderByStatus(picks, submissions) {
  return picks
    .map((pick, index) => ({ pick, index, rank: STATUS_ORDER[submissions.get(pick.id)?.submission.status] ?? 1 }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ pick }) => pick);
}

function bm25Results(ranked) {
  const top = ranked[0]?.score || 1;
  return ranked.slice(0, MAX_RESULTS).map(({ edition, score, matchedTerms }) => ({
    id: edition.id,
    score: Math.round((score / top) * 100) || 0,
    reason: '',
    matchedTopics: matchedTerms.slice(0, 5),
  }));
}

