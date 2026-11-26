// Kiểm thử lưu hội nghị bằng LocalStorage (TV4). Node không có window nên dựng một window giả.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { STORAGE_KEY, getSavedIds, toggleSaved, removeSavedIds } from '../site/js/saved-store.js';

class MemoryStorage {
  constructor() { this.data = new Map(); }
  getItem(key) { return this.data.has(key) ? this.data.get(key) : null; }
  setItem(key, value) { this.data.set(key, String(value)); }
  removeItem(key) { this.data.delete(key); }
}

let storage;
let events;

beforeEach(() => {
  storage = new MemoryStorage();
  events = [];
  const fakeWindow = new EventTarget();
  fakeWindow.localStorage = storage;
  fakeWindow.addEventListener('saved:changed', (event) => events.push(event.detail.ids));
  globalThis.window = fakeWindow;
});

afterEach(() => {
  delete globalThis.window;
});

const stored = () => JSON.parse(storage.getItem(STORAGE_KEY));

test('chưa lưu gì thì trả về danh sách rỗng', () => {
  assert.deepEqual(getSavedIds(), { ok: true, ids: [], error: null });
});

test('lưu rồi bỏ lưu, dữ liệu ghi kèm số phiên bản', () => {
  const first = toggleSaved('cvpr27');
  assert.deepEqual([first.ok, first.saved, first.ids], [true, true, ['cvpr27']]);
  assert.deepEqual(stored(), { version: 1, ids: ['cvpr27'] });

  const second = toggleSaved('cvpr27');
  assert.deepEqual([second.ok, second.saved, second.ids], [true, false, []]);
  assert.deepEqual(stored(), { version: 1, ids: [] });
});

test('ghi thành công thì phát sự kiện saved:changed', () => {
  toggleSaved('chi27');
  toggleSaved('vldb27');
  assert.deepEqual(events, [['chi27'], ['chi27', 'vldb27']]);
});

test('JSON hỏng: báo lỗi, không ghi đè dữ liệu cũ', () => {
  storage.setItem(STORAGE_KEY, '{hỏng');
  const read = getSavedIds();
  assert.equal(read.ok, false);
  assert.equal(read.error, 'Không đọc được danh sách hội nghị đã lưu.');
  assert.equal(toggleSaved('cvpr27').ok, false);
  assert.equal(storage.getItem(STORAGE_KEY), '{hỏng');
  assert.deepEqual(events, []);
});

test('sai phiên bản hoặc sai cấu trúc thì báo không đúng định dạng', () => {
  storage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, ids: ['a'] }));
  assert.match(getSavedIds().error, /không đúng định dạng/);
  storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, ids: 'a' }));
  assert.match(getSavedIds().error, /không đúng định dạng/);
});

test('bỏ ID trùng, ID rỗng và ID không phải chuỗi', () => {
  storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, ids: ['a', 'a', '', 5, ' ', 'b'] }));
  assert.deepEqual(getSavedIds().ids, ['a', 'b']);
});

test('từ chối ID rỗng', () => {
  assert.equal(toggleSaved('').ok, false);
  assert.equal(toggleSaved('   ').ok, false);
  assert.equal(storage.getItem(STORAGE_KEY), null);
});

test('trình duyệt chặn ghi (đầy bộ nhớ): báo lỗi, không báo đã lưu', () => {
  storage.setItem = () => { throw new Error('QuotaExceededError'); };
  const result = toggleSaved('cvpr27');
  assert.deepEqual([result.ok, result.saved], [false, false]);
  assert.equal(result.error, 'Không lưu được thay đổi vào trình duyệt.');
});

test('không truy cập được LocalStorage (chế độ ẩn danh chặn)', () => {
  Object.defineProperty(globalThis.window, 'localStorage', { get() { throw new Error('SecurityError'); } });
  const result = getSavedIds();
  assert.equal(result.ok, false);
  assert.match(result.error, /Không thể truy cập/);
});

test('xóa nhiều ID cùng lúc', () => {
  storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, ids: ['a', 'b', 'c'] }));
  const result = removeSavedIds(['a', 'c', 'khong-co']);
  assert.deepEqual([result.ok, result.ids], [true, ['b']]);
  assert.equal(removeSavedIds('a').ok, false);
});
