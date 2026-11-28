// TV1: đường live đã kiểm tra thành công GET, CORS (access-control-allow-origin: *) và schema.
export const API_ENDPOINT = 'https://ccfddl.com/conference/allconf.json';
export const SNAPSHOT_URL = new URL('../data/conferences.snapshot.json', import.meta.url);
export const PAGE_SIZE = 12;

// TV4: OAuth Client ID (loại Web) cho đồng bộ Google Calendar. Đây là thông tin công khai,
// không phải secret; Google chỉ chấp nhận nó từ các Authorized JavaScript origins đã khai báo.
// Để trống thì trang Đã lưu không hiện khối đồng bộ. Cách tạo: docs/google-calendar-sync.md.
export const GOOGLE_CLIENT_ID = '759516155051-g51ugl3sikl3616ki6oqo1iq7pqcumqk.apps.googleusercontent.com';

// TV4: địa chỉ backend Express cho trang "Gợi ý AI" và widget "Hỏi AI" (backend/README.md).
// - Chạy trên máy (localhost/127.0.0.1): backend ở cổng 3000.
// - GitHub Pages: backend trên Render (render.yaml). Render chỉ nhận origin https://khongphainoob.github.io
//   (biến ALLOWED_ORIGIN), nên domain khác gọi vào sẽ bị trình duyệt chặn.
// Gói Free của Render ngủ sau 15 phút không có truy cập; lần gọi đầu mất khoảng 1 phút để thức dậy.
const LOCAL_HOSTS = ['localhost', '127.0.0.1'];
const RENDER_API = 'https://uit-confinder-api.onrender.com';
export const AI_API_BASE = LOCAL_HOSTS.includes(globalThis.location?.hostname) ? 'http://localhost:3000' : RENDER_API;
