// TV4: Đồng bộ các hạn nộp đã lưu sang một lịch riêng "UIT ConFinder" trên Google Calendar.
// Chạy hoàn toàn trên trình duyệt (OAuth token model của Google Identity Services), không cần backend.
// Scope calendar.app.created chỉ cho phép tạo lịch phụ và sửa sự kiện trên lịch do web tạo,
// không đọc hay sửa lịch cá nhân của người dùng.
// Phần đầu file là hàm thuần (test bằng Node); phần sau mới dùng window/fetch.

import { getEventData } from './calendar-export.js';
import { getNextSubmission } from './deadline-utils.js';

export const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/calendar.app.created';
export const APP_CALENDAR_NAME = 'UIT ConFinder';
export const APP_MARKER = 'uit-confinder';
export const REMINDER_MINUTES = [24 * 60, 60];
export const GOOGLE_CALENDAR_WEB_URL = 'https://calendar.google.com/calendar/r';

const API_BASE = 'https://www.googleapis.com/calendar/v3';
const GIS_SRC = 'https://accounts.google.com/gsi/client';
const CALENDAR_ID_KEY = 'uit-confinder:gcal-calendar-id:v1';
const CALENDAR_TIMEZONE = 'Asia/Ho_Chi_Minh';
const BASE32HEX = '0123456789abcdefghijklmnopqrstuv';
const MAX_EVENT_ID_LENGTH = 1024;
const TOKEN_EXPIRY_MARGIN_MS = 60_000;
const REQUEST_CONCURRENCY = 4;

// ---------------------------------------------------------------------------
// Hàm thuần
// ---------------------------------------------------------------------------

// Google chỉ nhận event ID gồm 0-9 và a-v (base32hex), dài 5-1024 ký tự.
// ID suy ra cố định từ edition + deadline nên đồng bộ lại nhiều lần không tạo sự kiện trùng.
export function toEventId(editionId, deadlineId) {
  if (!editionId || !deadlineId) throw new Error('Thiếu mã kỳ hội nghị hoặc mã mốc thời gian.');
  // Tiền tố độ dài để ("a", "b/c") và ("a/b", "c") không ra cùng một ID.
  const bytes = new TextEncoder().encode(`${editionId.length}:${editionId}/${deadlineId}`);
  let buffer = 0;
  let bits = 0;
  let id = '';
  for (const byte of bytes) {
    buffer = ((buffer << 8) | byte) & 0xfff;
    bits += 8;
    while (bits >= 5) {
      id += BASE32HEX[(buffer >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) id += BASE32HEX[(buffer << (5 - bits)) & 31];
  if (id.length > MAX_EVENT_ID_LENGTH) throw new Error('Mã sự kiện vượt giới hạn 1024 ký tự của Google.');
  return id;
}

function isHttpUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

// Ném lỗi (từ getEventData) nếu mốc là TBA/Estimated/chỉ có ngày, giống luồng ICS.
export function buildEventResource(edition, deadline) {
  const event = getEventData(edition, deadline);
  const dateTime = event.date.toISOString();
  const resource = {
    id: toEventId(edition.id, deadline.id),
    status: 'confirmed',
    summary: event.summary,
    description: event.details,
    start: { dateTime },
    end: { dateTime },
    transparency: 'transparent', // hạn nộp không chiếm giờ bận trên lịch
    reminders: {
      useDefault: false,
      overrides: REMINDER_MINUTES.map((minutes) => ({ method: 'popup', minutes })),
    },
    extendedProperties: {
      private: { app: APP_MARKER, editionId: edition.id, deadlineId: deadline.id },
    },
  };
  if (edition.place) resource.location = edition.place;
  if (isHttpUrl(edition.websiteUrl)) {
    resource.source = { title: event.summary, url: edition.websiteUrl };
  }
  return resource;
}

// Lấy mọi mốc abstract/paper còn hạn và đủ chính xác của các kỳ đã lưu.
export function collectSyncTargets(editions, now) {
  const targets = [];
  let skipped = 0;
  for (const edition of Array.isArray(editions) ? editions : []) {
    const { futureDeadlines } = getNextSubmission(edition, { kind: 'any', now });
    for (const deadline of futureDeadlines) {
      try {
        targets.push({ edition, deadline, resource: buildEventResource(edition, deadline) });
      } catch {
        skipped += 1;
      }
    }
  }
  return { targets, skipped };
}

function isSameEvent(current, resource) {
  return Date.parse(current.start?.dateTime) === Date.parse(resource.start.dateTime)
    && current.summary === resource.summary
    && (current.description ?? '') === resource.description
    && (current.location ?? '') === (resource.location ?? '');
}

// existingEvents: sự kiện tương lai do web tạo trên lịch riêng.
// Sự kiện không còn trong targets (đã bỏ lưu) thì gỡ; sự kiện đã qua không đụng tới.
export function planSync(targets, existingEvents) {
  const existingById = new Map(existingEvents.map((event) => [event.id, event]));
  const targetIds = new Set();
  const toInsert = [];
  const toUpdate = [];
  let unchanged = 0;
  for (const target of targets) {
    const { id } = target.resource;
    if (targetIds.has(id)) continue;
    targetIds.add(id);
    const current = existingById.get(id);
    if (!current) toInsert.push(target);
    else if (isSameEvent(current, target.resource)) unchanged += 1;
    else toUpdate.push(target);
  }
  const toDelete = existingEvents.filter((event) => !targetIds.has(event.id));
  return { toInsert, toUpdate, toDelete, unchanged };
}

// ---------------------------------------------------------------------------
// Đăng nhập Google (Google Identity Services, token model)
// ---------------------------------------------------------------------------

let gisPromise = null;
let tokenClient = null;
let tokenState = null; // { accessToken, expiresAt }
let pendingToken = null; // { resolve, reject }

export function loadGoogleIdentity() {
  if (window.google?.accounts?.oauth2) return Promise.resolve(window.google.accounts.oauth2);
  if (!gisPromise) {
    gisPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = GIS_SRC;
      script.async = true;
      script.onload = () => {
        const oauth2 = window.google?.accounts?.oauth2;
        if (oauth2) resolve(oauth2);
        else reject(new Error('Thư viện đăng nhập Google tải không đầy đủ.'));
      };
      script.onerror = () => {
        gisPromise = null;
        script.remove();
        reject(new Error('Không tải được thư viện đăng nhập Google. Kiểm tra mạng hoặc trình chặn quảng cáo.'));
      };
      document.head.append(script);
    });
  }
  return gisPromise;
}

function settleToken(response, error) {
  const pending = pendingToken;
  pendingToken = null;
  if (!pending) return;
  if (error) {
    const messages = {
      popup_failed_to_open: 'Trình duyệt đã chặn cửa sổ đăng nhập Google. Cho phép popup rồi bấm lại.',
      popup_closed: 'Bạn đã đóng cửa sổ đăng nhập Google trước khi hoàn tất.',
    };
    pending.reject(new Error(messages[error.type] || 'Không đăng nhập được Google.'));
    return;
  }
  if (response?.error) {
    pending.reject(new Error(response.error === 'access_denied'
      ? 'Bạn chưa cấp quyền cho UIT ConFinder quản lý lịch riêng.'
      : `Google từ chối đăng nhập (${response.error}).`));
    return;
  }
  if (!window.google.accounts.oauth2.hasGrantedAllScopes(response, GOOGLE_SCOPE)) {
    pending.reject(new Error('Cần đánh dấu quyền "tạo lịch phụ và quản lý sự kiện" để đồng bộ.'));
    return;
  }
  tokenState = {
    accessToken: response.access_token,
    expiresAt: Date.now() + Number(response.expires_in || 0) * 1000,
  };
  pending.resolve(tokenState.accessToken);
}

// Gọi sớm (khi trang dựng xong) để lúc bấm nút, popup mở ngay trong user gesture và không bị chặn.
export async function prepareGoogleSignIn(clientId) {
  if (!clientId) throw new Error('Chưa cấu hình GOOGLE_CLIENT_ID trong js/config.js.');
  const oauth2 = await loadGoogleIdentity();
  if (!tokenClient) {
    tokenClient = oauth2.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_SCOPE,
      callback: (response) => settleToken(response, null),
      error_callback: (error) => settleToken(null, error),
    });
  }
  return tokenClient;
}

export async function requestGoogleAccessToken(clientId) {
  if (tokenState && tokenState.expiresAt - TOKEN_EXPIRY_MARGIN_MS > Date.now()) {
    return tokenState.accessToken;
  }
  // Đã chuẩn bị sẵn thì gọi ngay, không await: Safari chặn popup nếu mở sau một bước bất đồng bộ.
  const client = tokenClient || await prepareGoogleSignIn(clientId);
  // Lần đăng nhập trước bị bỏ dở mà Google không báo lại thì huỷ để không kẹt mãi.
  pendingToken?.reject(new Error('Lần đăng nhập Google trước đã bị thay bằng lần mới.'));
  return new Promise((resolve, reject) => {
    pendingToken = { resolve, reject };
    // Lần sau chỉ hiện màn hình đồng ý khi thật cần.
    client.requestAccessToken(tokenState ? { prompt: '' } : {});
  });
}

// ---------------------------------------------------------------------------
// Google Calendar REST API
// ---------------------------------------------------------------------------

class GoogleApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function describeApiError(status, apiMessage) {
  if (status === 401) return 'Phiên đăng nhập Google đã hết hạn. Bấm đồng bộ lại.';
  if (status === 403) return `Google từ chối yêu cầu${apiMessage ? `: ${apiMessage}` : '.'}`;
  if (status === 429) return 'Gửi quá nhiều yêu cầu tới Google. Đợi một lát rồi thử lại.';
  return apiMessage || `Google Calendar trả lỗi ${status}.`;
}

async function callApi(token, path, { method = 'GET', body, query } = {}) {
  const url = new URL(`${API_BASE}${path}`);
  for (const [key, value] of Object.entries(query || {})) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  }
  const headers = { Authorization: `Bearer ${token}` };
  if (body) headers['Content-Type'] = 'application/json';
  let response;
  try {
    response = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new GoogleApiError(0, 'Không kết nối được Google Calendar. Kiểm tra mạng.');
  }
  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) tokenState = null;
    throw new GoogleApiError(response.status, describeApiError(response.status, data?.error?.message));
  }
  return data;
}

function readCachedCalendarId() {
  try {
    return window.localStorage.getItem(CALENDAR_ID_KEY);
  } catch {
    return null;
  }
}

function writeCachedCalendarId(id) {
  try {
    window.localStorage.setItem(CALENDAR_ID_KEY, id);
  } catch {
    // Không lưu được thì lần sau tạo lịch mới; không chặn đồng bộ.
  }
}

export function hasSyncedBefore() {
  return Boolean(readCachedCalendarId());
}

// calendar.app.created không cho liệt kê lịch của người dùng, nên ID lịch riêng được nhớ trong localStorage.
// Lịch đã bị xoá (404/410) hoặc thuộc tài khoản khác (403) thì tạo lịch mới.
async function ensureAppCalendar(token) {
  const cachedId = readCachedCalendarId();
  if (cachedId) {
    try {
      const calendar = await callApi(token, `/calendars/${encodeURIComponent(cachedId)}`);
      return calendar.id;
    } catch (error) {
      if (![403, 404, 410].includes(error.status)) throw error;
    }
  }
  const created = await callApi(token, '/calendars', {
    method: 'POST',
    body: {
      summary: APP_CALENDAR_NAME,
      description: 'Hạn nộp hội nghị đã lưu trên UIT ConFinder. Xoá lịch này để gỡ toàn bộ.',
      timeZone: CALENDAR_TIMEZONE,
    },
  });
  writeCachedCalendarId(created.id);
  return created.id;
}

async function listAppEvents(token, calendarId, now) {
  const events = [];
  let pageToken;
  do {
    const page = await callApi(token, `/calendars/${encodeURIComponent(calendarId)}/events`, {
      query: {
        privateExtendedProperty: `app=${APP_MARKER}`,
        timeMin: new Date(now).toISOString(),
        singleEvents: true,
        maxResults: 250,
        pageToken,
        fields: 'items(id,summary,description,location,start),nextPageToken',
      },
    });
    events.push(...(page?.items || []));
    pageToken = page?.nextPageToken;
  } while (pageToken);
  return events;
}

async function insertOrReplaceEvent(token, calendarId, resource, exists) {
  const eventsPath = `/calendars/${encodeURIComponent(calendarId)}/events`;
  if (exists) {
    await callApi(token, `${eventsPath}/${resource.id}`, { method: 'PUT', body: resource });
    return;
  }
  try {
    await callApi(token, eventsPath, { method: 'POST', body: resource });
  } catch (error) {
    // 409: ID đã tồn tại (sự kiện đã qua hoặc từng bị xoá) → ghi đè, status confirmed khôi phục nó.
    if (error.status !== 409) throw error;
    await callApi(token, `${eventsPath}/${resource.id}`, { method: 'PUT', body: resource });
  }
}

async function runPool(items, limit, worker) {
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next];
      next += 1;
      await worker(item);
    }
  });
  await Promise.all(runners);
}

function labelOf(target) {
  return target.resource?.summary || target.summary || target.id;
}

// Trả { calendarId, created, updated, unchanged, removed, skipped, failed: [{label, message}] }.
export async function syncSavedDeadlines({ clientId, editions, now = Date.now(), onProgress } = {}) {
  const { targets, skipped } = collectSyncTargets(editions, now);
  const token = await requestGoogleAccessToken(clientId);
  const calendarId = await ensureAppCalendar(token);
  const existing = await listAppEvents(token, calendarId, now);
  const plan = planSync(targets, existing);

  const result = {
    calendarId,
    created: 0,
    updated: 0,
    unchanged: plan.unchanged,
    removed: 0,
    skipped,
    failed: [],
  };
  const jobs = [
    ...plan.toInsert.map((target) => ({ kind: 'created', target })),
    ...plan.toUpdate.map((target) => ({ kind: 'updated', target })),
    ...plan.toDelete.map((event) => ({ kind: 'removed', target: event })),
  ];
  let done = 0;
  onProgress?.({ done, total: jobs.length });

  await runPool(jobs, REQUEST_CONCURRENCY, async ({ kind, target }) => {
    try {
      if (kind === 'removed') {
        await callApi(token, `/calendars/${encodeURIComponent(calendarId)}/events/${target.id}`, { method: 'DELETE' })
          .catch((error) => { if (error.status !== 410) throw error; });
      } else {
        await insertOrReplaceEvent(token, calendarId, target.resource, kind === 'updated');
      }
      result[kind] += 1;
    } catch (error) {
      result.failed.push({ label: labelOf(target), message: error.message });
    }
    done += 1;
    onProgress?.({ done, total: jobs.length });
  });

  return result;
}
