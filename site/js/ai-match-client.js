// TV4: hàm thuần cho widget AI (không đụng DOM), test được bằng node --test.
// Hợp đồng API: docs/ai-assistant.md. Widget DOM nằm ở js/ui/ai-assistant.js.

export const DESCRIPTION_MIN = 20;
export const DESCRIPTION_MAX = 1500;
const REQUEST_TIMEOUT_MS = 60_000; // Render bản miễn phí có thể mất 30–60 giây để "thức dậy"

const REGION_LABELS = {
  vietnam: 'Việt Nam', sea: 'Đông Nam Á', asia: 'Châu Á', europe: 'Châu Âu',
  america: 'Châu Mỹ', oceania: 'Châu Đại Dương', africa: 'Châu Phi',
};
// Tên quốc gia tiếng Việt từ mã ISO (JP → Nhật Bản); trình duyệt không hỗ trợ thì giữ nguyên mã.
const COUNTRY_NAMES = typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames(['vi'], { type: 'region' }) : null;
function countryName(code) {
  try {
    return COUNTRY_NAMES?.of(code) ?? code;
  } catch {
    return code;
  }
}
const KIND_LABELS = { abstract: 'Chỉ hạn abstract', paper: 'Chỉ hạn full paper' };
const RELAXED_LABELS = {
  withinDays: 'bỏ giới hạn thời gian',
  region: 'mở rộng ra mọi khu vực',
  rank: 'bỏ yêu cầu về hạng',
  fields: 'mở rộng sang mọi lĩnh vực',
};
const ERROR_MESSAGES = {
  NETWORK: 'Không kết nối được máy chủ AI. Kiểm tra mạng rồi thử lại.',
  TIMEOUT: 'Máy chủ phản hồi quá lâu (có thể đang khởi động). Hãy thử lại sau ít giây.',
  BAD_RESPONSE: 'Máy chủ trả dữ liệu không đúng định dạng.',
  RATE_LIMITED: 'Bạn đã hỏi quá nhiều trong thời gian ngắn.',
  DEFAULT: 'Có lỗi khi gợi ý hội nghị. Hãy thử lại.',
};

export function validateDescription(text) {
  const length = String(text ?? '').trim().length;
  if (length < DESCRIPTION_MIN) return { ok: false, length, message: `Hãy mô tả ít nhất ${DESCRIPTION_MIN} ký tự: đề tài, nơi muốn nộp, thời gian.` };
  if (length > DESCRIPTION_MAX) return { ok: false, length, message: `Mô tả tối đa ${DESCRIPTION_MAX} ký tự.` };
  return { ok: true, length, message: '' };
}

// Chỉ nhận http/https, bỏ dấu / cuối. Giá trị lạ thì coi như chưa cấu hình.
export function normalizeApiBase(base) {
  try {
    const url = new URL(String(base ?? ''));
    return ['http:', 'https:'].includes(url.protocol) ? url.href.replace(/\/+$/, '') : '';
  } catch {
    return '';
  }
}

// exploreUrl đến từ server: chỉ cho mở trang Hội nghị trong site, không cho dẫn ra ngoài.
export function safeExploreHref(url) {
  return typeof url === 'string' && /^conferences\.html(\?[^#\s]*)?$/.test(url) ? url : 'conferences.html';
}

function isValidResult(data) {
  return data && typeof data === 'object'
    && Array.isArray(data.results)
    && data.results.every((item) => item && typeof item.id === 'string' && item.edition && item.edition.id === item.id);
}

/**
 * Gọi POST /api/match. Không throw: luôn trả { ok: true, data } hoặc { ok: false, error }.
 * error = { code, message, retryAfter } để widget hiển thị và đếm ngược khi bị giới hạn.
 */
export async function requestMatch({ apiBase, description, filters = null, fetchImpl = fetch, timeoutMs = REQUEST_TIMEOUT_MS }) {
  const base = normalizeApiBase(apiBase);
  if (!base) return { ok: false, error: { code: 'NOT_CONFIGURED', message: 'Chưa cấu hình máy chủ AI.', retryAfter: 0 } };

  let response;
  try {
    response = await fetchImpl(`${base}/api/match`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(filters ? { description, filters } : { description }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const code = error?.name === 'TimeoutError' ? 'TIMEOUT' : 'NETWORK';
    return { ok: false, error: { code, message: ERROR_MESSAGES[code], retryAfter: 0 } };
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (response.ok) {
    return isValidResult(data)
      ? { ok: true, data }
      : { ok: false, error: { code: 'BAD_RESPONSE', message: ERROR_MESSAGES.BAD_RESPONSE, retryAfter: 0 } };
  }

  const code = typeof data?.error === 'string' ? data.error : `HTTP_${response.status}`;
  const headerRetry = Number(response.headers.get('retry-after'));
  const retryAfter = Math.max(0, Math.ceil(Number(data?.retryAfter) || headerRetry || 0));
  const serverMessage = typeof data?.message === 'string' ? data.message : '';
  const message = response.status === 429 ? ERROR_MESSAGES.RATE_LIMITED : serverMessage || ERROR_MESSAGES.DEFAULT;
  return { ok: false, error: { code, message, retryAfter } };
}

/**
 * Bộ lọc AI đã hiểu → danh sách chip để người dùng xem và bỏ bớt.
 * key dạng 'region', 'field:SC', 'keyword:prompt injection' để removeFilterChip biết bỏ gì.
 */
export function filtersToChips(filters) {
  if (!filters) return [];
  const chips = [];
  if (filters.region) chips.push({ key: 'region', label: REGION_LABELS[filters.region] ?? filters.region });
  for (const country of filters.countries ?? []) chips.push({ key: `country:${country}`, label: countryName(country) });
  if (filters.ccfMin) chips.push({ key: 'ccfMin', label: `CCF ≥ ${filters.ccfMin}` });
  if (filters.coreMin) chips.push({ key: 'coreMin', label: `CORE ≥ ${filters.coreMin}` });
  if (filters.withinDays) chips.push({ key: 'withinDays', label: `Còn hạn trong ${filters.withinDays} ngày` });
  if (filters.kind && filters.kind !== 'any') chips.push({ key: 'kind', label: KIND_LABELS[filters.kind] ?? filters.kind });
  for (const field of filters.fields ?? []) chips.push({ key: `field:${field}`, label: `Lĩnh vực ${field}` });
  for (const keyword of filters.keywords ?? []) chips.push({ key: `keyword:${keyword}`, label: keyword });
  return chips;
}

// Bỏ một chip, trả bộ lọc mới (không sửa object cũ) để gửi lại server, bỏ qua bước AI phân tích.
export function removeFilterChip(filters, key) {
  const next = {
    ...filters,
    countries: [...(filters.countries ?? [])],
    fields: [...(filters.fields ?? [])],
    keywords: [...(filters.keywords ?? [])],
  };
  const [type, value] = key.includes(':') ? [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)] : [key, null];
  if (type === 'country') next.countries = next.countries.filter((item) => item !== value);
  else if (type === 'field') next.fields = next.fields.filter((item) => item !== value);
  else if (type === 'keyword') next.keywords = next.keywords.filter((item) => item !== value);
  else if (type === 'kind') next.kind = 'any';
  else if (['region', 'ccfMin', 'coreMin', 'withinDays'].includes(type)) next[type] = null;
  return next;
}

export function describeRelaxed(relaxed) {
  const parts = (Array.isArray(relaxed) ? relaxed : []).map((step) => RELAXED_LABELS[step]).filter(Boolean);
  return parts.length ? `Không có hội nghị khớp mọi tiêu chí nên đã ${parts.join(', ')}.` : '';
}
