// Chủ: TV1 (TV1-07). Crawl trang Call for Papers (CFP) của từng hội nghị để lấy văn bản chủ đề.
// Không dùng thêm thư viện: trang CFP chỉ cần lấy link và chữ, regex là đủ và dễ test.
//
// Lịch sự với website của người khác:
// - đọc robots.txt, trang cấm thì bỏ qua
// - tối đa 1 request/giây cho cả lượt chạy, timeout 10 giây, tối đa 2 MB mỗi trang
// - User-Agent tự nhận là bot, không ghi tên hay email cá nhân
import { createHash } from 'node:crypto';

export const USER_AGENT = 'UIT-ConFinder-Bot/1.0 (student project; CFP topics only)';
const DAY_MS = 24 * 60 * 60 * 1000;
const RANK_ORDER = { A: 0, B: 1, C: 2 };

// ---------- HTML → chữ ----------

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…' };

export function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code) => {
    if (code[0] === '#') {
      const value = code[1].toLowerCase() === 'x' ? Number.parseInt(code.slice(2), 16) : Number.parseInt(code.slice(1), 10);
      return Number.isFinite(value) && value > 0 && value < 0x110000 ? String.fromCodePoint(value) : ' ';
    }
    return ENTITIES[code.toLowerCase()] ?? whole;
  });
}

/**
 * @param {{ keepChrome?: boolean }} [options] keepChrome = false (mặc định) bỏ cả <nav>, <header>, <footer>, <aside>:
 *   menu lặp lại ở mọi trang ("Home, Venue, Sponsors…") làm loãng văn bản chủ đề. Lấy chữ của link thì giữ lại.
 */
export function htmlToText(html, { keepChrome = false } = {}) {
  let source = String(html)
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|template|head)\b[\s\S]*?<\/\1>/gi, ' ');
  if (!keepChrome) source = source.replace(/<(nav|header|footer|aside)\b[\s\S]*?<\/\1>/gi, ' ');
  return decodeEntities(source
    // Thẻ khối xuống dòng để giữ ranh giới giữa các mục topic.
    .replace(/<(br|\/p|\/li|\/h[1-6]|\/div|\/tr|\/dt|\/dd|\/section|\/ul|\/ol)\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n- ')
    .replace(/<[^>]+>/g, ' '))
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

// ---------- Tìm link CFP ----------

export function extractLinks(html, baseUrl) {
  const links = [];
  const pattern = /<a\b[^>]*?\bhref\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi;
  for (const [, , href, inner] of String(html).matchAll(pattern)) {
    let url;
    try {
      url = new URL(decodeEntities(href.trim()), baseUrl);
    } catch {
      continue;
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') continue;
    url.hash = '';
    links.push({ url: url.href, text: htmlToText(inner, { keepChrome: true }).replace(/\n/g, ' ').trim() });
  }
  return links;
}

const POSITIVE = [
  // "call for papers", "call for research papers", "call for main conference papers"…
  [/call[\s_-]*for[\s_-]*([a-z]+[\s_-]*){0,3}papers?/, 6],
  [/\bcfp\b|\/cfp/, 5],
  [/topics?[\s_-]*of[\s_-]*interest/, 5],
  [/\bcall[\s_-]*for[\s_-]*(submissions|contributions)/, 4],
  [/research[\s_-]*track|main[\s_-]*track|technical[\s_-]*track/, 3],
  [/\bcalls?\b/, 2],
  [/\btopics?\b/, 2],
  [/\bsubmission/, 1],
];
// Trang của workshop, tutorial… cũng ghi "call for papers" nhưng không phải chủ đề chính của hội nghị.
const NEGATIVE = /workshop|tutorial|demo|poster|doctoral|phd|student|industry|artifact|competition|challenge|sponsor|volunteer|camera|registration|visa|award|journal|short|position|late[\s_-]*breaking|findings|reviewer/;

export function scoreCfpLink({ url, text }, homeUrl) {
  const haystack = `${text} ${url}`.toLowerCase();
  let score = 0;
  for (const [pattern, weight] of POSITIVE) if (pattern.test(haystack)) score += weight;
  // Menu chỉ ghi "Papers" / "Technical Papers" (CHI, SIGGRAPH) vẫn là trang CFP của track chính.
  if (/^(research |technical |full |main |regular )?papers?$/i.test(text.trim())) score += 4;
  // Link của workshop, journal track… bị loại hẳn: chúng cũng ghi "call for papers" nên trừ điểm là không đủ.
  if (!score || NEGATIVE.test(haystack)) return 0;
  if (/\.(pdf|docx?|zip|png|jpe?g)(\?|$)/i.test(url)) return 0;
  try {
    if (new URL(url).hostname === new URL(homeUrl).hostname) score += 1;
  } catch { /* homeUrl hỏng thì bỏ qua điểm cộng */ }
  return score;
}

/** Link CFP tốt nhất, điểm từ 4 trở lên mới nhận (tránh lấy nhầm link "Submission" chung chung). */
export function findCfpLink(links, homeUrl) {
  let best = null;
  for (const link of links) {
    if (link.url === homeUrl) continue;
    const score = scoreCfpLink(link, homeUrl);
    if (score >= 4 && (!best || score > best.score)) best = { ...link, score };
  }
  return best;
}

// ---------- Cắt đoạn chủ đề ----------

const TOPIC_MARKERS = ['topics of interest', 'topics include', 'topics of interest include', 'areas of interest', 'research areas', 'call for papers', 'topics', 'scope'];

/** Lấy đoạn quanh chữ "topics of interest"…, tối đa maxChars, để prompt enrich ngắn và đúng trọng tâm. */
export function focusCfpText(text, maxChars = 6000) {
  const lower = text.toLowerCase();
  for (const marker of TOPIC_MARKERS) {
    const index = lower.indexOf(marker);
    if (index !== -1) {
      const start = Math.max(0, lower.lastIndexOf('\n', Math.max(0, index - 300)));
      return text.slice(start, start + maxChars).trim();
    }
  }
  return text.slice(0, maxChars).trim();
}

// Dấu hiệu chắc chắn của trang chủ đề. Không tính "topics"/"scope" đứng một mình vì trang chủ nào cũng có thể có.
const STRONG_MARKERS = /topics? of interest|topics include|areas of interest|research areas|call for (research |main conference |technical )?papers|we (invite|solicit|welcome|seek) (original |high[- ]quality )?(research )?(submissions|papers|contributions)/;

/** Văn bản có đủ dấu hiệu là trang chủ đề không (tránh lưu trang chủ, "Coming soon" hay trang chặn bot). */
export function looksLikeCfp(text) {
  return text.length >= 400 && STRONG_MARKERS.test(text.toLowerCase());
}

// ---------- robots.txt ----------

/** Lấy luật của nhóm User-agent áp dụng cho bot này: nhóm có tên bot trước, không có thì nhóm "*". */
export function parseRobots(text, agent = 'uit-confinder-bot') {
  const groups = [];
  let current = null;
  let lastWasAgent = false;
  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, '').trim();
    const match = /^([a-z-]+)\s*:\s*(.*)$/i.exec(line);
    if (!match) continue;
    const field = match[1].toLowerCase();
    const value = match[2].trim();
    if (field === 'user-agent') {
      if (!lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (current && (field === 'allow' || field === 'disallow') && value) {
      current.rules.push({ allow: field === 'allow', path: value });
    }
  }
  const own = groups.find((group) => group.agents.some((name) => name !== '*' && agent.includes(name)));
  const fallback = groups.find((group) => group.agents.includes('*'));
  return (own ?? fallback)?.rules ?? [];
}

function ruleMatches(path, rule) {
  const pattern = rule.path.replace(/[.+?^{}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${pattern.endsWith('\\$') ? `${pattern.slice(0, -2)}$` : pattern}`).test(path);
}

/** Luật khớp dài nhất thắng; bằng nhau thì Allow thắng (theo RFC 9309). */
export function isAllowed(pathWithQuery, rules) {
  let best = null;
  for (const rule of rules) {
    if (!ruleMatches(pathWithQuery, rule)) continue;
    if (!best || rule.path.length > best.path.length || (rule.path.length === best.path.length && rule.allow)) best = rule;
  }
  return !best || best.allow;
}

// ---------- Fetch lịch sự ----------

/**
 * Tạo hàm tải trang dùng chung cho cả lượt chạy: giãn cách giữa các request, kiểm robots.txt theo origin (có cache).
 * @returns {(url: string) => Promise<{ url: string, html: string }>} url là địa chỉ cuối cùng sau redirect
 */
export function createPoliteFetcher({ fetchImpl = fetch, delayMs = 1000, timeoutMs = 10_000, maxBytes = 2_000_000, sleep } = {}) {
  const wait = sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const robotsCache = new Map();
  let lastRequestAt = 0;

  async function request(url) {
    const gap = lastRequestAt + delayMs - Date.now();
    if (gap > 0) await wait(gap);
    lastRequestAt = Date.now();
    return fetchImpl(url, {
      headers: { 'user-agent': USER_AGENT, accept: 'text/html,text/plain;q=0.9' },
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
    });
  }

  async function rulesFor(origin) {
    if (!robotsCache.has(origin)) {
      let rules = [];
      try {
        const response = await request(`${origin}/robots.txt`);
        // Không có robots.txt (404) nghĩa là không cấm gì. 401/403 thì coi như cấm hết (RFC 9309).
        if (response.ok) rules = parseRobots(await response.text());
        else if (response.status === 401 || response.status === 403) rules = [{ allow: false, path: '/' }];
      } catch {
        rules = [];
      }
      robotsCache.set(origin, rules);
    }
    return robotsCache.get(origin);
  }

  async function readLimited(response) {
    const length = Number(response.headers.get('content-length'));
    if (length > maxBytes) throw new Error('trang quá lớn');
    const text = await response.text();
    return text.length > maxBytes ? text.slice(0, maxBytes) : text;
  }

  return async function fetchPage(url) {
    const target = new URL(url);
    if (target.protocol !== 'http:' && target.protocol !== 'https:') throw new Error('chỉ nhận http/https');
    if (!isAllowed(`${target.pathname}${target.search}`, await rulesFor(target.origin))) {
      throw new Error('robots.txt không cho phép');
    }
    const response = await request(target.href);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const type = response.headers.get('content-type') ?? '';
    if (type && !/text\/html|application\/xhtml|text\/plain/i.test(type)) throw new Error(`không phải HTML (${type.split(';')[0]})`);
    return { url: response.url || target.href, html: await readLimited(response) };
  };
}

// ---------- Chọn chuỗi cần crawl ----------

/**
 * Chọn chuỗi hội nghị cần crawl, ưu tiên CCF A → B → C → chưa xếp hạng.
 * - Đã có topics và làm giàu chưa quá refreshDays ngày: bỏ qua (chủ đề hội nghị ít đổi giữa các năm).
 * - Vừa crawl (thành công hay lỗi) trong retryDays ngày: bỏ qua, tránh gọi lại website liên tục.
 * - URL thử: website kỳ mới nhất, rồi kỳ năm trước (năm mới thường chưa có trang CFP).
 */
export function pickSeriesToCrawl(catalog, { now = Date.now(), refreshDays = 180, retryDays = 30, limit = 120 } = {}) {
  const bySeries = new Map();
  for (const edition of catalog.editions) {
    const list = bySeries.get(edition.seriesKey) ?? [];
    list.push(edition);
    bySeries.set(edition.seriesKey, list);
  }

  const targets = [];
  for (const [seriesKey, editions] of bySeries) {
    const info = catalog.series?.[seriesKey] ?? {};
    if (info.topics?.length && now - Date.parse(info.enrichedAt ?? 0) < refreshDays * DAY_MS) continue;
    if (info.cfpCrawledAt && now - Date.parse(info.cfpCrawledAt) < retryDays * DAY_MS) continue;

    const sorted = [...editions].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
    const urls = [...new Set(sorted.map((edition) => edition.websiteUrl).filter((url) => /^https?:\/\//i.test(url ?? '')))].slice(0, 2);
    if (!urls.length) continue;
    targets.push({ seriesKey, acronym: sorted[0].acronym, ccf: sorted[0].ranks?.ccf ?? null, urls });
  }

  targets.sort((a, b) => (RANK_ORDER[a.ccf] ?? 3) - (RANK_ORDER[b.ccf] ?? 3) || a.acronym.localeCompare(b.acronym));
  return targets.slice(0, limit);
}

/** Tên file an toàn cho seriesKey ("AI/aaai" → "AI__aaai"), chỉ giữ chữ, số, gạch. */
export function cfpFileName(seriesKey) {
  const safe = seriesKey.replace(/\//g, '__').replace(/[^a-z0-9_-]/gi, '_');
  return `${safe || createHash('sha256').update(seriesKey).digest('hex').slice(0, 16)}.txt`;
}

/** Link trang tổng hợp "Calls" để đi thêm một bước khi trang chủ không có link CFP rõ (ví dụ ACL). */
export function findCallsHub(links, homeUrl) {
  return links.find((link) => link.url !== homeUrl
    && /^calls?\b|\bcalls$/i.test(link.text) && !NEGATIVE.test(link.text.toLowerCase())) ?? null;
}

/**
 * Crawl một chuỗi: thử từng URL, từ trang chủ tìm link CFP (hoặc qua trang "Calls" thêm một bước);
 * không có thì dùng chính trang chủ nếu trông giống CFP.
 * @returns {Promise<{ ok: true, cfpUrl: string, text: string } | { ok: false, error: string }>}
 */
export async function crawlSeries(target, fetchPage) {
  const errors = [];
  for (const homeUrl of target.urls) {
    try {
      const home = await fetchPage(homeUrl);
      const homeLinks = extractLinks(home.html, home.url);
      let link = findCfpLink(homeLinks, home.url);
      const hub = link ? null : findCallsHub(homeLinks, home.url);
      if (hub) {
        try {
          const hubPage = await fetchPage(hub.url);
          link = findCfpLink(extractLinks(hubPage.html, hubPage.url), hubPage.url);
          // Trang "Calls" tự nó đã là CFP thì dùng luôn.
          if (!link && looksLikeCfp(focusCfpText(htmlToText(hubPage.html)))) link = { url: hubPage.url };
        } catch (error) {
          errors.push(`${hub.url}: ${error.message}`);
        }
      }
      if (link) {
        try {
          const page = await fetchPage(link.url);
          const text = focusCfpText(htmlToText(page.html));
          if (looksLikeCfp(text)) return { ok: true, cfpUrl: page.url, text };
          errors.push(`${link.url}: trang CFP quá ngắn`);
        } catch (error) {
          errors.push(`${link.url}: ${error.message}`);
        }
      }
      const homeText = focusCfpText(htmlToText(home.html));
      if (looksLikeCfp(homeText)) return { ok: true, cfpUrl: home.url, text: homeText };
      if (!link) errors.push(`${homeUrl}: không thấy link CFP`);
    } catch (error) {
      errors.push(`${homeUrl}: ${error.message}`);
    }
  }
  return { ok: false, error: errors.join(' | ').slice(0, 500) || 'không có URL' };
}
