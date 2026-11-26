// Kiểm thử phần nền của backend: health, catalog, CORS, giới hạn body, giới hạn tần suất.
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { loadCatalog } from '../src/catalog.js';
import { loadConfig } from '../src/config.js';
import { createDatabase } from '../src/db.js';

const ORIGIN = 'http://127.0.0.1:5500';

async function startServer(env = {}) {
  const config = loadConfig({ ALLOWED_ORIGIN: ORIGIN, GEMINI_API_KEY: 'test', GEMINI_MODEL: 'test', ...env });
  const catalog = await loadCatalog();
  const db = createDatabase(catalog);
  const server = createApp({ config, catalog, db }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  return { server, base: `http://127.0.0.1:${server.address().port}`, catalog };
}

function postMatch(base, body, headers = {}) {
  return fetch(`${base}/api/match`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('API nền', () => {
  let ctx;
  before(async () => { ctx = await startServer(); });
  after(() => ctx.server.close());

  test('health: SQLite nạp đủ số kỳ của catalog', async () => {
    const response = await fetch(`${ctx.base}/api/health`);
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.ok, true);
    assert.equal(data.editions, ctx.catalog.editions.length);
    assert.ok(data.editions > 2000);
  });

  test('conferences: đúng shape { meta, editions } như contracts.md', async () => {
    const data = await (await fetch(`${ctx.base}/api/conferences`)).json();
    assert.ok(Array.isArray(data.editions));
    const cvpr = data.editions.find((edition) => edition.acronym === 'CVPR');
    assert.ok(cvpr, 'có CVPR');
    assert.ok(Array.isArray(cvpr.rounds));
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
  before(async () => { ctx = await startServer(); });
  after(() => ctx.server.close());

  test('mô tả quá ngắn trả 400', async () => {
    const response = await postMatch(ctx.base, { description: 'ngắn' });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error, 'INVALID_INPUT');
  });

  test('JSON hỏng trả 400, không trả stack trace', async () => {
    const response = await postMatch(ctx.base, '{hỏng');
    const text = await response.text();
    assert.equal(response.status, 400);
    assert.ok(!text.includes('at '), 'không có stack trace');
  });

  test('body trên 10 KB trả 413', async () => {
    const response = await postMatch(ctx.base, { description: 'a'.repeat(12_000) });
    assert.equal(response.status, 413);
  });
});

describe('POST /api/match: giới hạn tần suất', () => {
  let ctx;
  before(async () => { ctx = await startServer(); });
  after(() => ctx.server.close());

  test('lần thứ 6 trong 1 phút trả 429 kèm Retry-After', async () => {
    const valid = { description: 'Tôi làm về thị giác máy tính, muốn nộp ở châu Á.' };
    for (let i = 1; i <= 5; i += 1) {
      const response = await postMatch(ctx.base, valid);
      assert.notEqual(response.status, 429, `lần ${i} chưa bị chặn`);
    }
    const blocked = await postMatch(ctx.base, valid);
    assert.equal(blocked.status, 429);
    assert.ok(Number(blocked.headers.get('retry-after')) > 0);
    const data = await blocked.json();
    assert.equal(data.error, 'RATE_LIMITED');
    assert.ok(data.retryAfter > 0);
  });
});

describe('việc còn lại của từng người', () => {
  test.todo('TV1-01 normalizePlace: "Ho Chi Minh City" → VN, "Singapore EXPO" → SG, "Virtual" → null');
  test.todo('TV1-05 queryEditionIds: lọc region vietnam ra 12 kỳ');
  test.todo('TV1-06 /api/conferences đọc từ SQLite');
  test.todo('TV3-07 rankByKeywords: ["object detection"] ra CVPR/ICCV');
  test.todo('TV3-10 validateFilters bỏ region lạ; relaxFilters nới đúng thứ tự; toExploreUrl đúng tham số');
  test.todo('TV4-04 runMatch: bỏ ID lạ ở bước 5; bước 5 lỗi vẫn trả 20 kết quả kèm rerankFailed');
  test.todo('TV4-06 cache: hỏi lại cùng câu trả cached: true');
  test.todo('TV4-10 câu lạc đề trả bộ lọc rỗng, không chạy bước 5');
});
