// Kiểm thử qua HTTP: health, catalog, CORS, helmet, giới hạn body, giới hạn tần suất, /api/match.
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { ORIGIN, PARSE_SECURITY_ASIA, candidatesOf, fakeGemini, postJson, startServer } from './helpers.js';

const VALID = { description: 'Tôi làm về thị giác máy tính, muốn nộp ở châu Á.' };

describe('API nền', () => {
  let ctx;
  before(async () => { ctx = await startServer({ generate: fakeGemini([]).generate }); });
  after(() => ctx.server.close());

  test('health: SQLite nạp đủ số kỳ, có số lượt AI đã dùng', async () => {
    const response = await fetch(`${ctx.base}/api/health`);
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.ok, true);
    assert.equal(data.editions, ctx.catalog.editions.length);
    assert.deepEqual(data.aiBudget, { used: 0, dailyLimit: 300 });
  });

  test('conferences: đúng shape contracts.md, có thêm country/region', async () => {
    const data = await (await fetch(`${ctx.base}/api/conferences`)).json();
    const mobisys = data.editions.find((edition) => edition.acronym === 'MobiSys' && edition.year === 2027);
    assert.ok(Array.isArray(mobisys.rounds));
    assert.equal(mobisys.country, 'VN');
    assert.equal(mobisys.region, 'vietnam');
    // snapshot không còn bản ghi kiểm thử giả (fixture-*)
    assert.ok(!data.editions.some((edition) => edition.id.startsWith('fixture-')));
  });

  test('CORS: domain được phép nhận header, domain lạ thì không', async () => {
    const allowed = await fetch(`${ctx.base}/api/health`, { headers: { origin: ORIGIN } });
    assert.equal(allowed.headers.get('access-control-allow-origin'), ORIGIN);
    const blocked = await fetch(`${ctx.base}/api/health`, { headers: { origin: 'https://evil.example' } });
    assert.equal(blocked.headers.get('access-control-allow-origin'), null);
  });

  test('route không tồn tại trả 404 JSON', async () => {
    const response = await fetch(`${ctx.base}/api/khong-co`);
    assert.equal(response.status, 404);
    assert.equal((await response.json()).error, 'NOT_FOUND');
  });

  test('helmet: không lộ x-powered-by, có header bảo mật', async () => {
    const response = await fetch(`${ctx.base}/api/health`);
    assert.equal(response.headers.get('x-powered-by'), null);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  });

  test('compression: catalog được nén gzip khi trình duyệt cho phép', async () => {
    const response = await fetch(`${ctx.base}/api/conferences`, { headers: { 'accept-encoding': 'gzip' } });
    assert.equal(response.headers.get('content-encoding'), 'gzip');
    await response.arrayBuffer();
  });
});

describe('POST /api/match: kiểm tra đầu vào', () => {
  let ctx;
  before(async () => { ctx = await startServer({ generate: fakeGemini([]).generate }); });
  after(() => ctx.server.close());

  const cases = [
    ['mô tả quá ngắn', { description: 'ngắn' }, 400],
    ['mô tả quá dài', { description: 'a'.repeat(1501) }, 400],
    ['description không phải chuỗi', { description: 12345678901234567890 }, 400],
    ['filters là mảng', { ...VALID, filters: ['asia'] }, 400],
    ['body là mảng', [VALID], 400],
  ];
  for (const [name, body, status] of cases) {
    test(`${name} → ${status}`, async () => {
      const response = await postJson(`${ctx.base}/api/match`, body);
      assert.equal(response.status, status);
      assert.equal((await response.json()).error, 'INVALID_INPUT');
    });
  }

  test('JSON hỏng → 400, không trả stack trace', async () => {
    const response = await postJson(`${ctx.base}/api/match`, '{hỏng');
    const text = await response.text();
    assert.equal(response.status, 400);
    assert.ok(!text.includes('at '), 'không có stack trace');
  });

  test('body trên 10 KB → 413', async () => {
    const response = await postJson(`${ctx.base}/api/match`, { description: 'a'.repeat(12_000) });
    assert.equal(response.status, 413);
  });
});

describe('POST /api/match: luồng thật qua HTTP', () => {
  let ctx;
  let gemini;
  before(async () => {
    gemini = fakeGemini([PARSE_SECURITY_ASIA, (request) => ({
      results: candidatesOf(request).slice(0, 2).map((c) => ({ id: c.id, score: 80, reason: '<img src=x onerror=alert(1)>', matchedTopics: [] })),
    })]);
    ctx = await startServer({ generate: gemini.generate });
  });
  after(() => ctx.server.close());

  test('trả 200 đúng shape, không cho cache ở trình duyệt', async () => {
    const response = await postJson(`${ctx.base}/api/match`, VALID);
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(Object.keys(data).sort(), ['cached', 'exploreUrl', 'offTopic', 'parsedFilters', 'relaxed', 'results']);
    assert.equal(data.results.length, 2);
    assert.ok(data.results[0].edition.rounds);
    // Backend trả nguyên văn; frontend phải render bằng textContent (xem ai-assistant.js).
    assert.equal(data.results[0].reason, '<img src=x onerror=alert(1)>');
  });
});

describe('POST /api/match: giới hạn tần suất', () => {
  let ctx;
  before(async () => { ctx = await startServer({ generate: fakeGemini([]).generate, env: { GEMINI_API_KEY: '' } }); });
  after(() => ctx.server.close());

  test('lần thứ 6 trong 1 phút → 429 kèm Retry-After; yêu cầu lỗi 400 cũng bị tính', async () => {
    for (let i = 1; i <= 5; i += 1) {
      const response = await postJson(`${ctx.base}/api/match`, i % 2 ? VALID : { description: 'x' });
      assert.notEqual(response.status, 429, `lần ${i} chưa bị chặn`);
    }
    const blocked = await postJson(`${ctx.base}/api/match`, VALID);
    assert.equal(blocked.status, 429);
    assert.ok(Number(blocked.headers.get('retry-after')) > 0);
    const data = await blocked.json();
    assert.equal(data.error, 'RATE_LIMITED');
    assert.ok(data.retryAfter > 0);
  });

  test('X-Forwarded-For giả mạo không lách được khi không đứng sau proxy (TRUST_PROXY=0)', async () => {
    const response = await postJson(`${ctx.base}/api/match`, VALID, { 'x-forwarded-for': '203.0.113.99' });
    assert.equal(response.status, 429);
  });

  test('giới hạn /api/match không chặn /api/conferences', async () => {
    const response = await fetch(`${ctx.base}/api/conferences`);
    assert.equal(response.status, 200);
    await response.arrayBuffer();
  });
});

describe('giới hạn theo ngày', () => {
  let ctx;
  before(async () => { ctx = await startServer({ generate: fakeGemini([]).generate, env: { GEMINI_API_KEY: '' } }); });
  after(() => ctx.server.close());

  test('thiếu khóa Gemini → 503 AI_UNAVAILABLE', async () => {
    const response = await postJson(`${ctx.base}/api/match`, VALID);
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error, 'AI_UNAVAILABLE');
  });
});
