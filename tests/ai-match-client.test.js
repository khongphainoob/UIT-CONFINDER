// Kiểm thử phần thuần của widget AI (TV4): gọi API, xử lý lỗi, chip bộ lọc.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  describeRelaxed, filtersToChips, normalizeApiBase, removeFilterChip, requestMatch,
  safeExploreHref, validateDescription, warmUp,
} from '../site/js/ai-match-client.js';

const BASE = 'http://localhost:3000';
const FILTERS = {
  region: 'asia', countries: ['JP'], ccfMin: 'B', coreMin: null, withinDays: 90,
  kind: 'paper', fields: ['SC'], keywords: ['prompt injection', 'llm security'],
};
const OK_DATA = {
  offTopic: false, parsedFilters: FILTERS, relaxed: [], exploreUrl: 'conferences.html?ccf=A', cached: false,
  results: [{ id: 'ccs27', score: 90, reason: 'ok', matchedTopics: [], edition: { id: 'ccs27', acronym: 'CCS' } }],
};

function jsonResponse(status, body, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });
}

test('validateDescription: 20–1500 ký tự sau khi bỏ khoảng trắng', () => {
  assert.equal(validateDescription('   ngắn   ').ok, false);
  assert.equal(validateDescription('a'.repeat(20)).ok, true);
  assert.equal(validateDescription('a'.repeat(1501)).ok, false);
  assert.equal(validateDescription(null).ok, false);
});

test('normalizeApiBase: chỉ nhận http/https, bỏ dấu / cuối', () => {
  assert.equal(normalizeApiBase('http://localhost:3000/'), 'http://localhost:3000');
  assert.equal(normalizeApiBase('https://api.example.com'), 'https://api.example.com');
  assert.equal(normalizeApiBase('javascript:alert(1)'), '');
  assert.equal(normalizeApiBase(''), '');
});

test('safeExploreHref: chỉ cho mở trang Hội nghị trong site', () => {
  assert.equal(safeExploreHref('conferences.html?ccf=A&window=90'), 'conferences.html?ccf=A&window=90');
  assert.equal(safeExploreHref('conferences.html'), 'conferences.html');
  for (const bad of ['https://evil.example', 'javascript:alert(1)', '//evil.example/conferences.html', 'conferences.html#x', null]) {
    assert.equal(safeExploreHref(bad), 'conferences.html', String(bad));
  }
});

test('requestMatch: gửi đúng body, có filters thì gửi kèm', async () => {
  const bodies = [];
  const fetchImpl = async (url, init) => {
    assert.equal(url, `${BASE}/api/match`);
    bodies.push(JSON.parse(init.body));
    return jsonResponse(200, OK_DATA);
  };
  const first = await requestMatch({ apiBase: BASE, description: 'mô tả', fetchImpl });
  assert.equal(first.ok, true);
  await requestMatch({ apiBase: BASE, description: 'mô tả', filters: FILTERS, fetchImpl });
  assert.deepEqual(bodies, [{ description: 'mô tả' }, { description: 'mô tả', filters: FILTERS }]);
});

test('requestMatch: 429 trả retryAfter từ body, không có thì lấy header', async () => {
  const fromBody = await requestMatch({
    apiBase: BASE, description: 'x', fetchImpl: async () => jsonResponse(429, { error: 'RATE_LIMITED', retryAfter: 42 }),
  });
  assert.deepEqual(fromBody.error, { code: 'RATE_LIMITED', message: 'Bạn đã hỏi quá nhiều trong thời gian ngắn.', retryAfter: 42 });
  const fromHeader = await requestMatch({
    apiBase: BASE, description: 'x', fetchImpl: async () => jsonResponse(429, {}, { 'retry-after': '17' }),
  });
  assert.equal(fromHeader.error.retryAfter, 17);
});

test('requestMatch: 503 dùng thông báo của server', async () => {
  const result = await requestMatch({
    apiBase: BASE, description: 'x', fetchImpl: async () => jsonResponse(503, { error: 'AI_BUSY', message: 'AI đang bận', retryAfter: 5 }),
  });
  assert.deepEqual(result.error, { code: 'AI_BUSY', message: 'AI đang bận', retryAfter: 5 });
});

test('requestMatch: lỗi mạng, hết giờ, dữ liệu sai định dạng, chưa cấu hình', async () => {
  const network = await requestMatch({ apiBase: BASE, description: 'x', fetchImpl: async () => { throw new TypeError('fetch failed'); } });
  assert.equal(network.error.code, 'NETWORK');

  // AbortSignal.timeout dùng timer không giữ tiến trình sống: Node 22 thấy event loop trống và hủy test
  // (CI báo "Promise resolution is still pending"). Giữ một timer thường cho tới khi có kết quả.
  const keepAlive = setTimeout(() => {}, 5_000);
  const timeout = await requestMatch({
    apiBase: BASE, description: 'x', timeoutMs: 10,
    fetchImpl: (url, init) => new Promise((resolve, reject) => init.signal.addEventListener('abort', () => reject(init.signal.reason))),
  }).finally(() => clearTimeout(keepAlive));
  assert.equal(timeout.error.code, 'TIMEOUT');

  // Kết quả có edition không khớp id: không tin, không render
  const bad = await requestMatch({
    apiBase: BASE, description: 'x',
    fetchImpl: async () => jsonResponse(200, { results: [{ id: 'a', edition: { id: 'b' } }] }),
  });
  assert.equal(bad.error.code, 'BAD_RESPONSE');

  const html = await requestMatch({ apiBase: BASE, description: 'x', fetchImpl: async () => new Response('<html>', { status: 200 }) });
  assert.equal(html.error.code, 'BAD_RESPONSE');

  const missing = await requestMatch({ apiBase: '', description: 'x', fetchImpl: async () => assert.fail('không được gọi mạng') });
  assert.equal(missing.error.code, 'NOT_CONFIGURED');
});

test('filtersToChips: đủ loại tiêu chí, nhãn tiếng Việt', () => {
  assert.deepEqual(filtersToChips(FILTERS).map((chip) => chip.label), [
    'Châu Á', 'Nhật Bản', 'CCF ≥ B', 'Còn hạn trong 90 ngày', 'Chỉ hạn full paper', 'Lĩnh vực SC', 'prompt injection', 'llm security',
  ]);
  assert.deepEqual(filtersToChips(null), []);
});

test('removeFilterChip: bỏ đúng một tiêu chí, không sửa object cũ', () => {
  const chips = filtersToChips(FILTERS);
  for (const chip of chips) {
    const next = removeFilterChip(FILTERS, chip.key);
    assert.equal(filtersToChips(next).length, chips.length - 1, chip.key);
  }
  assert.equal(removeFilterChip(FILTERS, 'kind').kind, 'any');
  assert.deepEqual(removeFilterChip(FILTERS, 'keyword:prompt injection').keywords, ['llm security']);
  assert.equal(FILTERS.keywords.length, 2);
});

test('describeRelaxed', () => {
  assert.equal(describeRelaxed([]), '');
  assert.equal(describeRelaxed(['withinDays', 'region']), 'Không có hội nghị khớp mọi tiêu chí nên đã bỏ giới hạn thời gian, mở rộng ra mọi khu vực.');
  assert.equal(describeRelaxed(['lạ']), '');
});

test('warmUp: gọi /api/health đúng một lần cho mỗi địa chỉ, bỏ qua lỗi, bỏ địa chỉ không hợp lệ', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => { calls.push([url, init.method]); throw new TypeError('offline'); };
  assert.equal(warmUp('https://warm.example/', { fetchImpl }), true);
  assert.equal(warmUp('https://warm.example', { fetchImpl }), false);
  assert.equal(warmUp('javascript:alert(1)', { fetchImpl }), false);
  assert.equal(warmUp('', { fetchImpl }), false);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(calls, [['https://warm.example/api/health', 'GET']]);
});
