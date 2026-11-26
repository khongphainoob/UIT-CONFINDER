# Đồng bộ Google Calendar (TV4)

Trang Đã lưu có nút **Đồng bộ với Google Calendar**. Người dùng đăng nhập Google một lần,
web tạo một lịch riêng tên **UIT ConFinder** trong tài khoản của họ và ghi các hạn nộp còn hạn
vào đó, kèm nhắc trước 1 ngày và 1 giờ. Toàn bộ chạy trên trình duyệt; **không có backend**,
site vẫn là static site trên GitHub Pages.

## 1. Cách hoạt động

| Bước | Chi tiết |
|---|---|
| Đăng nhập | Google Identity Services, token model (`initTokenClient`). Access token sống ~1 giờ, chỉ giữ trong bộ nhớ, không lưu localStorage. |
| Quyền | `https://www.googleapis.com/auth/calendar.app.created`: chỉ tạo lịch phụ và sửa sự kiện trên lịch do web tạo. Không đọc/sửa lịch cá nhân. |
| Lịch riêng | `POST /calendars` lần đầu; ID lịch nhớ trong localStorage `uit-confinder:gcal-calendar-id:v1`. |
| Chọn mốc | `getNextSubmission(edition, {kind:'any', now}).futureDeadlines` của các kỳ đã lưu: abstract/paper còn hạn, đủ giờ chính xác. TBA/Estimated/date-only bị bỏ, giống ICS. |
| Chống trùng | Event ID suy ra cố định từ `edition.id` + `deadline.id` (base32hex). Bấm đồng bộ nhiều lần chỉ cập nhật, không nhân bản. |
| Đồng bộ | Mốc mới → thêm; đổi giờ/nội dung → cập nhật; không đổi → bỏ qua; mốc tương lai của kỳ đã bỏ lưu → gỡ. Sự kiện đã qua không bị đụng. |
| Gỡ toàn bộ | Người dùng xoá lịch **UIT ConFinder** trong Google Calendar. Thu hồi quyền tại https://myaccount.google.com/permissions. |

Mã nguồn: `site/js/google-calendar-sync.js` (logic + API), `site/js/pages/saved-calendar-sync.js` (khối giao diện),
test hàm thuần: `tests/google-calendar-sync.test.js`.

## 2. Tạo OAuth Client ID (làm một lần)

1. Vào https://console.cloud.google.com/ → tạo project, ví dụ `uit-confinder`.
2. **APIs & Services → Library** → bật **Google Calendar API**.
3. **Google Auth Platform → Branding** (OAuth consent screen): User type **External**, điền tên app, email hỗ trợ.
4. **Data Access → Add or remove scopes** → thêm `.../auth/calendar.app.created`.
5. **Audience**: giữ **Testing**, thêm email của cả nhóm và giảng viên vào **Test users** (tối đa 100).
6. **Clients → Create client** → loại **Web application** → **Authorized JavaScript origins**:
   - `http://127.0.0.1:5500` và `http://localhost:5500` (dev; nếu `tools/serve.py` báo cổng khác, thêm cổng đó)
   - `https://<tai-khoan>.github.io` (chỉ origin, **không** kèm `/UIT-CONFINDER/site/`)
   - Không cần Redirect URI cho token model.
7. Copy **Client ID** (dạng `xxxx.apps.googleusercontent.com`) vào `site/js/config.js`:

   ```js
   export const GOOGLE_CLIENT_ID = 'xxxx.apps.googleusercontent.com';
   ```

## 3. Cấu hình khi deploy — có cần biến môi trường không?

**Không.** OAuth Client ID là thông tin công khai (luôn hiện trong mã trang web), không phải secret.
An toàn nằm ở danh sách *Authorized JavaScript origins*: trang khác dùng lại Client ID này sẽ bị Google từ chối.
Vì vậy commit thẳng Client ID vào `config.js` và deploy GitHub Pages như cũ. Token model không dùng
client secret; **tuyệt đối không** đưa client secret (nếu Console có tạo) vào repo.

Nếu nhóm vẫn muốn mỗi môi trường một Client ID, có thể dùng GitHub Actions thay chuỗi trong `config.js`
từ *Repository variable* lúc build Pages, nhưng với đồ án này không cần.

## 4. Lưu ý khi demo

- App ở chế độ Testing nên Google hiện *"Google hasn't verified this app"* → **Continue**. Chỉ email trong Test users đăng nhập được.
- Mở web qua `http://127.0.0.1:5500`, không mở `file://`.
- Trình chặn quảng cáo có thể chặn `accounts.google.com/gsi/client`; khi đó khối đồng bộ báo lỗi tải thư viện.

## 5. Giới hạn đã biết

- `calendar.app.created` không cho liệt kê lịch, nên ID lịch nằm ở localStorage của trình duyệt. Đồng bộ từ
  trình duyệt/thiết bị khác, hoặc đổi tài khoản Google, sẽ tạo thêm một lịch **UIT ConFinder** mới.
- Chỉ đồng bộ abstract/paper (theo `getNextSubmission`), không đồng bộ rebuttal/decision/opening.
- Sự kiện dài 0 phút (start = end) như link Google Calendar hiện có; đã thử thật trên Google Calendar (26/11/2026), API chấp nhận.
- Không tự đồng bộ nền: người dùng phải bấm nút; bỏ lưu xong cần bấm lại để gỡ mốc khỏi lịch.
- Chưa điền `GOOGLE_CLIENT_ID` thì trang Đã lưu không hiện khối đồng bộ; `.ics` và link Google Calendar ở trang chi tiết vẫn dùng được.
- Muốn mở cho mọi tài khoản Google (Production) phải gửi Google xét duyệt scope; ngoài phạm vi đồ án.
