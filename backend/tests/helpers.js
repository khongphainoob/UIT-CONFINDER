// Công cụ dùng chung cho test backend: catalog thật nạp một lần, Gemini giả, server tạm.
import { createApp } from '../src/app.js';
import { loadCatalog } from '../src/catalog.js';
import { loadConfig } from '../src/config.js';
import { createServices } from '../src/services.js';

// Mốc cố định: snapshot tạo ngày 27/10/2026, nên 01/11/2026 còn nhiều hạn tương lai để test.
export const FIXED_NOW = Date.parse('2026-11-01T00:00:00Z');
export const ORIGIN = 'http://127.0.0.1:5500';

let catalogPromise;
export function getCatalog() {
  catalogPromise ??= loadCatalog();
  return catalogPromise;
}

export function testConfig(env = {}) {
  return loadConfig({ ALLOWED_ORIGIN: ORIGIN, GEMINI_API_KEY: 'test-key', GEMINI_MODEL: 'test-model', ...env });
}

/**
 * Gemini giả: mỗi lần gọi lấy phần tử tiếp theo trong hàng đợi.
 * Phần tử là object (trả về), Error (throw) hoặc hàm (request) => kết quả.
 * Ghi lại mọi request để test kiểm tra prompt đã gửi.
 */
export function fakeGemini(queue) {
  const calls = [];
  const generate = async (gemini, request) => {
    calls.push(request);
    if (!queue.length) throw new Error('Gemini giả: hết kết quả trong hàng đợi');
    const next = queue.shift();
    if (next instanceof Error) throw next;
    return typeof next === 'function' ? next(request) : structuredClone(next);
  };
  return { generate, calls };
}

// Lấy danh sách ứng viên mà backend gửi cho Gemini ở bước 5.
export function candidatesOf(request) {
  const match = /<candidates>\n([\s\S]*)\n<\/candidates>/.exec(request.user);
  return match ? JSON.parse(match[1]) : [];
}

export async function createTestServices({ generate, env, now = () => FIXED_NOW } = {}) {
  const config = testConfig(env);
  const catalog = await getCatalog();
  const services = createServices({ config, catalog, generate, now });
  return { config, catalog, ...services };
}

export async function startServer(options = {}) {
  const deps = await createTestServices(options);
  const server = createApp(deps).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  return { ...deps, server, base: `http://127.0.0.1:${server.address().port}` };
}

export function postJson(url, body, headers = {}) {
  return fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

// Câu trả lời mẫu của bước 1 (đã theo PARSE_SCHEMA: "none"/0 thay cho null).
export const PARSE_SECURITY_ASIA = {
  offTopic: false,
  region: 'asia',
  countries: [],
  ccfMin: 'B',
  coreMin: 'none',
  withinDays: 0,
  kind: 'any',
  fields: ['SC'],
  keywords: ['LLM security', 'prompt injection', 'adversarial machine learning'],
};
