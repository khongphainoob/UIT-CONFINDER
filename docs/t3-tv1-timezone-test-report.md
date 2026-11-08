# T3-TV1-01 — Bằng chứng kiểm thử Timezone và Countdown chung (TV1)

Tài liệu này ghi lại kết quả kiểm tra tự động và đối chiếu kỳ vọng (`expected`) / thực tế (`actual`) cho Task `T3-TV1-01` của Thành viên 1 (TV1): hoàn thiện logic múi giờ AoE, GMT+7, đếm ngược countdown, trạng thái hết hạn và bộ helper dùng chung cho toàn bộ dự án (`home.js`, `conference-list.js`, `saved.js`, `conference-detail.js`).

---

## 1. Thông tin kiểm thử

| Thuộc tính | Giá trị |
|---|---|
| **Mã task** | `T3-TV1-01` (Hoàn thiện timezone và countdown chung) |
| **Người thực hiện** | Huy Lê Phạm Gia (TV1) |
| **Phạm vi kiểm thử** | `site/js/deadline-utils.js`, `site/js/data-adapter.js` |
| **Hình thức kiểm thử** | Đối chiếu expected / actual theo logic helper |
| **Kết quả kiểm thử** | **17/17 ca đạt chuẩn (PASS)** |
| **Mốc thời gian cố định dùng test** | `2026-10-20T12:00:00Z` |

---

## 2. Bảng đối chiếu chi tiết Expected vs Actual

| Mã ca | Tiêu chí kiểm thử | Đầu vào (Input) | Kết quả kỳ vọng (Expected) | Kết quả thực tế (Actual) | Đánh giá |
|:---:|---|---|---|---|:---:|
| **TC01** | AoE = UTC-12 khi nguồn chỉ rõ | `parseTimezoneOffset('AoE')`, `'UTC-12'`, `'GMT-12'` | `'-12:00'` | `'-12:00'` | **PASS** |
| **TC02** | Các múi giờ chuẩn khác | `parseTimezoneOffset('UTC')`, `'PT'`, `'UTC+7'` | `'+00:00'`, `'-08:00'`, `'+07:00'` | `'+00:00'`, `'-08:00'`, `'+07:00'` | **PASS** |
| **TC03** | Quy đổi AoE sang GMT+7 cùng instant | `parseDeadlineItem('d1', 'paper', '2026-11-10 23:59:59', 'AoE')` | Instant có offset `-12:00`, quy đổi sang GMT+7: `18:59 GMT+7 · 11/11/2026` | `instant: 2026-11-10T23:59:59-12:00`, GMT+7: `18:59 GMT+7 · 11/11/2026` | **PASS** |
| **TC04** | Giữ precision cho Date-only | `parseDeadlineItem('d2', 'paper', '2026-11-10', 'AoE')` | `precision: 'date'`, `instant: null` (không tự gán giờ) | `precision: 'date'`, `instant: null` | **PASS** |
| **TC05** | Mốc TBA / TBD | `parseDeadlineItem('d3', 'paper', 'TBD', 'UTC-12')` | `precision: 'unknown'`, `quality: 'tba'`, `instant: null` | `precision: 'unknown'`, `quality: 'tba'`, `instant: null` | **PASS** |
| **TC06** | Countdown khi đã hết hạn | `now: 2026-10-20T12:00:00Z`, `target: 2026-10-19T12:00:00Z` | `'Đã hết hạn'` (không âm, không NaN) | `'Đã hết hạn'` | **PASS** |
| **TC07** | Countdown khi `target = now` | `now = target = 2026-10-20T12:00:00Z` | `'Đã hết hạn'` (không âm) | `'Đã hết hạn'` | **PASS** |
| **TC08** | Countdown khi target null / NaN | `getCountdownText(null)`, `getCountdownText(NaN)` | `'Chưa rõ'` | `'Chưa rõ'` | **PASS** |
| **TC09** | Countdown ngày và giờ | `target = now + 2 ngày 5 giờ` | `'còn 2 ngày 5 giờ'` | `'còn 2 ngày 5 giờ'` | **PASS** |
| **TC10** | Countdown giờ và phút | `target = now + 4 giờ 30 phút` | `'còn 4 giờ 30 phút'` | `'còn 4 giờ 30 phút'` | **PASS** |
| **TC11** | Phân loại độ khẩn cấp (Urgency) | `target <= now`, `< 3d`, `< 7d`, `< 30d`, `>= 30d` | `expired`, `urgent`, `week`, `month`, `open` | `expired`, `urgent`, `week`, `month`, `open` | **PASS** |
| **TC12** | Chuyển giao năm (Year boundary) | `now: 2026-12-31T23:59:59Z`, `target: 2027-01-01T00:00:00Z` | `countdown: 'còn dưới 1 phút'`, `urgency: 'urgent'` | `countdown: 'còn dưới 1 phút'`, `urgency: 'urgent'` | **PASS** |
| **TC13** | Chuyển giao tháng (Month boundary) | `now: 2026-02-28T22:00:00Z`, `target: 2026-03-01T01:00:00Z` | `countdown: 'còn 3 giờ'` | `countdown: 'còn 3 giờ'` | **PASS** |
| **TC14** | `deadline = now` bị loại khỏi future | `deadline.instant = now` | `status: 'closed'`, `futureDeadlines: []` (bị loại) | `status: 'closed'`, `futureDeadlines: []` | **PASS** |
| **TC15** | Nhiều round: chọn round tương lai | Round 1 đã qua, Round 2 còn hạn | `status: 'upcoming'`, `deadline: r2-paper`, `futureDeadlines: 1` | `status: 'upcoming'`, `deadline: r2-paper`, `futureDeadlines: 1` | **PASS** |
| **TC16** | Abstract qua, Paper còn | `abstract` đã qua, `paper` còn hạn | • `kind='any'`: `status: 'upcoming'`, `deadline: paper`<br>• `kind='abstract'`: `status: 'closed'`, `futureDeadlines: []`<br>• `kind='paper'`: `status: 'upcoming'`, `deadline: paper` | • `kind='any'`: `upcoming`, `paper`<br>• `kind='abstract'`: `closed`, `[]`<br>• `kind='paper'`: `upcoming`, `paper` | **PASS** |
| **TC17** | Không có mốc đúng kind | Hội nghị chỉ có mốc `paper`, gọi `kind='abstract'` | `status: 'unknown'`, `deadline: null`, `futureDeadlines: []` | `status: 'unknown'`, `deadline: null`, `futureDeadlines: []` | **PASS** |

---

## 3. Kết luận nghiệm thu Task T3-TV1-01
1. **Múi giờ & Định dạng:** Đã hoàn thiện cơ chế chuẩn hóa AoE sang UTC-12 và tự động tính toán giờ chuẩn Việt Nam (GMT+7) từ cùng một `instant`. Các mốc `date-only` tuyệt đối không bị gán giờ giả mạo, giữ đúng `precision: 'date'`.
2. **Countdown & Hết hạn:** Countdown không bao giờ bị âm hoặc `NaN`. Khi mốc nộp bài đến hạn (`target <= now`), trạng thái chuyển sang `closed` / `expired` và cập nhật chính xác danh sách mốc tương lai `futureDeadlines`.
3. **Tính tái sử dụng cao:** Helper là các hàm thuần (pure functions), hoàn toàn tách rời DOM, sẵn sàng dùng chung ổn định cho cả 4 thành viên (Trang chủ TV2, Khám phá TV3, Đã lưu TV4 và Chi tiết TV1).

