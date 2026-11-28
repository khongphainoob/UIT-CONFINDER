// TV4-05: gọi Gemini. Dùng fetch giả nên không cần mạng hay khóa thật.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateJson } from '../src/gemini.js';

const GEMINI = { apiKey: 'secret-key', model: 'gemini-test', thinkingLevel: '' };
const REQUEST = { system: 'sys', user: 'hello', schema: { type: 'object' }, timeoutMs: 1000 };

function okResponse(body) {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
}

function candidate(text, finishReason = 'STOP') {
  return { candidates: [{ content: { parts: [{ text }] }, finishReason }] };
}

// Tắt console.warn trong lúc test các ca lỗi cho gọn output.
async function quietly(fn) {
  const original = console.warn;
  console.warn = () => {};
  try {
    return await fn();
  } finally {
    console.warn = original;
  }
}

test('gửi đúng endpoint, khóa trong header (không trong URL), có schema JSON', async () => {
  let seen;
  const fetchImpl = async (url, init) => {
    seen = { url, init, body: JSON.parse(init.body) };
    return okResponse(candidate('{"ok":true}'));
  };
  const result = await generateJson(GEMINI, REQUEST, { fetchImpl });
  assert.deepEqual(result, { ok: true });
  assert.equal(seen.url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent');
  assert.ok(!seen.url.includes('secret-key'));
  assert.equal(seen.init.headers['x-goog-api-key'], 'secret-key');
  assert.equal(seen.body.systemInstruction.parts[0].text, 'sys');
  assert.equal(seen.body.contents[0].parts[0].text, 'hello');
  assert.equal(seen.body.generationConfig.responseMimeType, 'application/json');
  assert.deepEqual(seen.body.generationConfig.responseJsonSchema, { type: 'object' });
  assert.equal(seen.body.generationConfig.thinkingConfig, undefined);
});

test('có thinkingLevel thì gửi thinkingConfig', async () => {
  let body;
  const fetchImpl = async (url, init) => {
    body = JSON.parse(init.body);
    return okResponse(candidate('{}'));
  };
  await generateJson({ ...GEMINI, thinkingLevel: 'MINIMAL' }, REQUEST, { fetchImpl });
  assert.deepEqual(body.generationConfig.thinkingConfig, { thinkingLevel: 'MINIMAL' });
});

test('ghép nhiều part thành một chuỗi JSON', async () => {
  const fetchImpl = async () => okResponse({ candidates: [{ content: { parts: [{ text: '{"a":' }, { text: '1}' }] }, finishReason: 'STOP' }] });
  assert.deepEqual(await generateJson(GEMINI, REQUEST, { fetchImpl }), { a: 1 });
});

test('thiếu khóa hoặc model thì 503, không gọi mạng', async () => {
  let called = false;
  const fetchImpl = async () => { called = true; };
  await assert.rejects(generateJson({ apiKey: '', model: 'x' }, REQUEST, { fetchImpl }), { status: 503 });
  assert.equal(called, false);
});

test('tên model lạ bị từ chối (không chèn được đường dẫn khác vào URL)', async () => {
  await quietly(() => assert.rejects(
    generateJson({ ...GEMINI, model: '../../v1/evil?x=' }, REQUEST, { fetchImpl: async () => okResponse({}) }),
    { status: 503 },
  ));
});

const failures = [
  ['HTTP 429 từ Gemini (hết quota)', async () => new Response('quota', { status: 429 })],
  ['HTTP 500', async () => new Response('boom', { status: 500 })],
  ['phản hồi không phải JSON', async () => new Response('<html>', { status: 200 })],
  ['finishReason MAX_TOKENS', async () => okResponse(candidate('{"a":', 'MAX_TOKENS'))],
  ['không có candidate', async () => okResponse({ candidates: [] })],
  ['JSON của model bị hỏng', async () => okResponse(candidate('không phải json'))],
  ['lỗi mạng', async () => { throw new TypeError('fetch failed'); }],
];
for (const [name, fetchImpl] of failures) {
  test(`${name} → 503 AI_UNAVAILABLE, không lộ chi tiết`, async () => {
    await quietly(() => assert.rejects(generateJson(GEMINI, REQUEST, { fetchImpl }), (error) => {
      assert.equal(error.status, 503);
      assert.equal(error.code, 'AI_UNAVAILABLE');
      assert.ok(!error.message.includes('secret-key'));
      return true;
    }));
  });
}

test('prompt bị bộ lọc an toàn chặn → 422 AI_BLOCKED', async () => {
  const fetchImpl = async () => okResponse({ promptFeedback: { blockReason: 'SAFETY' } });
  await assert.rejects(generateJson(GEMINI, REQUEST, { fetchImpl }), { status: 422, code: 'AI_BLOCKED' });
});

test('quá thời gian chờ → 503', async () => {
  const fetchImpl = (url, init) => new Promise((resolve, reject) => {
    init.signal.addEventListener('abort', () => reject(init.signal.reason));
  });
  // AbortSignal.timeout không giữ tiến trình sống; thiếu timer này Node 22 hủy test ("Promise resolution is still pending").
  const keepAlive = setTimeout(() => {}, 5_000);
  try {
    await quietly(() => assert.rejects(generateJson(GEMINI, { ...REQUEST, timeoutMs: 20 }, { fetchImpl }), { status: 503 }));
  } finally {
    clearTimeout(keepAlive);
  }
});
