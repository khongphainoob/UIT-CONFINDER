export const STORAGE_KEY = 'uit-confinder:saved:v1';
export const STORAGE_VERSION = 1;

function getStorage() {
  try {
    return window.localStorage;
  } catch (error) {
    return { error };
  }
}

function normalizeIds(value) {
  if (!Array.isArray(value)) return null;
  const ids = value.filter((id) => typeof id === 'string' && id.trim() !== '');
  return [...new Set(ids)];
}

function readStorage() {
  const storage = getStorage();
  if (storage.error) {
    return { ok: false, ids: [], error: 'Không thể truy cập danh sách đã lưu trên trình duyệt.' };
  }
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return { ok: true, ids: [], error: null };
    const payload = JSON.parse(raw);
    const ids = payload?.version === STORAGE_VERSION ? normalizeIds(payload.ids) : null;
    if (ids === null) {
      return { ok: false, ids: [], error: 'Dữ liệu hội nghị đã lưu không đúng định dạng.' };
    }
    return { ok: true, ids, error: null };
  } catch (error) {
    return { ok: false, ids: [], error: 'Không đọc được danh sách hội nghị đã lưu.' };
  }
}

function emitSavedChanged(ids) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  window.dispatchEvent(new CustomEvent('saved:changed', { detail: { ids } }));
}

export function getSavedIds() {
  return readStorage();
}

export function toggleSaved(editionId) {
  if (typeof editionId !== 'string' || editionId.trim() === '') {
    return { ok: false, saved: false, ids: [], error: 'ID hội nghị không hợp lệ.' };
  }
  const current = readStorage();
  if (!current.ok) return { ok: false, saved: false, ids: current.ids, error: current.error };
  const saved = !current.ids.includes(editionId);
  const ids = saved
    ? [...current.ids, editionId]
    : current.ids.filter((id) => id !== editionId);
  const storage = getStorage();
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, ids }));
    emitSavedChanged(ids);
    return { ok: true, saved, ids, error: null };
  } catch (error) {
    return { ok: false, saved: false, ids: current.ids, error: 'Không lưu được thay đổi vào trình duyệt.' };
  }
}
