// TV1: đường live đã kiểm tra thành công GET, CORS (access-control-allow-origin: *) và schema.
export const API_ENDPOINT = 'https://ccfddl.com/conference/allconf.json';
export const SNAPSHOT_URL = new URL('../data/conferences.snapshot.json', import.meta.url);
export const PAGE_SIZE = 12;

// TV4: OAuth Client ID (loại Web) cho đồng bộ Google Calendar. Đây là thông tin công khai,
// không phải secret; Google chỉ chấp nhận nó từ các Authorized JavaScript origins đã khai báo.
// Để trống thì trang Đã lưu không hiện khối đồng bộ. Cách tạo: docs/google-calendar-sync.md.
export const GOOGLE_CLIENT_ID = '759516155051-g51ugl3sikl3616ki6oqo1iq7pqcumqk.apps.googleusercontent.com';
