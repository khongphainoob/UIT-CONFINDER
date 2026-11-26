// Kiểm thử tải catalog: live trước, snapshot khi lỗi, cache một lần (TV1). fetch được thay bằng hàm giả.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { getCatalog } from '../site/js/data-service.js';
import { API_ENDPOINT } from '../site/js/config.js';

const realFetch = globalThis.fetch;
const realWarn = console.warn;
let calls;

const SNAPSHOT = {
  meta: { checkedAt: null },
  editions: [{ id: 'snap27', seriesKey: 'snap', acronym: 'SNAP', rounds: [] }],
};
const LIVE = [{ title: 'LIVE', sub: 'ai', confs: [{ id: 'live27', year: 2027, timeline: [] }] }];

function jsonResponse(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function mockFetch(liveHandler) {
  globalThis.fetch = async (url) => {
    const href = String(url);
    calls.push(href);
    if (href === API_ENDPOINT) return liveHandler();
    if (href.endsWith('conferences.snapshot.json')) return jsonResponse(SNAPSHOT);
    throw new Error(`URL không mong đợi: ${href}`);
  };
}

beforeEach(() => {
  calls = [];
  console.warn = () => {};
});

afterEach(() => {
  globalThis.fetch = realFetch;
  console.warn = realWarn;
});

test('live trả dữ liệu hợp lệ thì dùng live', async () => {
  mockFetch(() => jsonResponse(LIVE));
  const catalog = await getCatalog({ forceReload: true });
  assert.equal(catalog.meta.mode, 'live');
  assert.equal(catalog.editions[0].id, 'live27');
  assert.equal(calls.length, 1);
});

test('live lỗi HTTP thì chuyển sang snapshot', async () => {
  mockFetch(() => jsonResponse(null, 500));
  const catalog = await getCatalog({ forceReload: true });
  assert.equal(catalog.meta.mode, 'snapshot');
  assert.equal(catalog.editions[0].id, 'snap27');
  assert.equal(calls.length, 2);
});

test('mất mạng khi gọi live thì chuyển sang snapshot', async () => {
  mockFetch(() => { throw new TypeError('Failed to fetch'); });
  assert.equal((await getCatalog({ forceReload: true })).meta.mode, 'snapshot');
});

test('live sai schema thì chuyển sang snapshot', async () => {
  mockFetch(() => jsonResponse({ khong: 'dung' }));
  assert.equal((await getCatalog({ forceReload: true })).meta.mode, 'snapshot');
});

test('gọi nhiều lần chỉ tải một lần nhờ cache Promise', async () => {
  mockFetch(() => jsonResponse(LIVE));
  const [first, second, third] = await Promise.all([
    getCatalog({ forceReload: true }),
    getCatalog(),
    getCatalog(),
  ]);
  assert.equal(first, second);
  assert.equal(second, third);
  assert.equal(calls.length, 1);
});

test('cả live và snapshot đều lỗi thì báo lỗi và xóa cache để thử lại được', async () => {
  globalThis.fetch = async () => jsonResponse(null, 503);
  await assert.rejects(getCatalog({ forceReload: true }), /snapshot dự phòng/);
  mockFetch(() => jsonResponse(LIVE));
  assert.equal((await getCatalog()).meta.mode, 'live');
});
