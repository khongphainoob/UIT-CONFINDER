# T2 — Saved theo catalog và luồng 5 trang

## Phạm vi

- Lưu theo `edition.id` trong `localStorage`.
- Trang Saved join ID đã lưu với `catalog.editions`.
- Hiển thị số lượng hợp lệ, cảnh báo ID không còn trong catalog và empty state.
- Giữ route cũ: `index.html`, `conferences.html`, `conference.html`, `saved.html`, `about.html`.

## Kiểm tra

| Case | Expected | Actual | Result |
|---|---|---|---|
| JavaScript syntax | Không có lỗi syntax | Tất cả file `site/js/**/*.js` qua `node --check` | PASS |
| Storage rỗng | `getSavedIds()` trả danh sách rỗng | `{ ok: true, ids: [] }` | PASS |
| Lưu một edition | Ghi `edition.id` và phát trạng thái đã lưu | `aaai27` chuyển nút thành “Đã lưu” | PASS |
| Saved render | Hiển thị đúng số item còn trong catalog | Hiển thị `1 hội nghị đã lưu`, link `conference.html?id=aaai27` | PASS |
| Bỏ lưu | Xóa thật khỏi storage và render empty | Hiển thị `0 hội nghị đã lưu` và empty state | PASS |
| JSON storage hỏng | Không throw, trả lỗi rõ | `getSavedIds()` trả `ok: false` và message lỗi | PASS |
| HTTP route | Năm route trả HTTP 200 | Cả 5 route cũ trả HTTP 200 | PASS |
| Explore tải nhiều dữ liệu | Không render toàn bộ catalog cùng lúc | Hiển thị tối đa 12 card, status vẫn ghi tổng số | PASS |

## Evidence

- Browser local server: `http://127.0.0.1:8766`
- Catalog snapshot: 2.346 editions, HTTP 200.
- Luồng kiểm tra: Home → Explore → Detail (`aaai27`) → Lưu → Saved → Bỏ lưu.

## Ghi chú tích hợp

Explore đang dùng state/query contract hiện có và giới hạn 12 card mỗi lượt; bộ lọc nghiệp vụ đầy đủ của TV3 không được coi là hoàn thành bởi phần Saved này.

## Kiểm tra xử lý lỗi và dữ liệu cũ

| Case | Expected | Actual | Result |
|---|---|---|---|
| Thêm ID mới | Ghi ID và trả `saved: true` | `toggleSaved('a')` ghi thành công và trả `saved: true` | PASS |
| Bỏ ID đã lưu | Xóa ID và trả `saved: false` | Lần gọi thứ hai xóa `a`, không còn ID trùng | PASS |
| ID trùng | Catalog lưu mỗi ID một lần | Hai lần thêm cùng ID không tạo bản ghi trùng | PASS |
| Reload | Đọc lại payload hợp lệ từ storage | `getSavedIds()` trả lại danh sách đã ghi | PASS |
| Storage rỗng | Hiển thị `0 hội nghị đã lưu` và empty state | Saved render empty state khi `ids=[]` | PASS |
| JSON lỗi | Không throw; hiển thị warning; không báo đã lưu | JSON hỏng trả `ok:false`, thao tác không đổi trạng thái | PASS |
| Storage không khả dụng/quota | Warning; không phát trạng thái thành công | `getSavedIds()`/`toggleSaved()` trả lỗi; không phát event khi `setItem` lỗi | PASS |
| ID cũ mất khỏi catalog | Báo, cho xóa, không tính vào count hợp lệ | Hiển thị warning `Xóa mục cũ`, count chỉ tính edition còn tồn tại | PASS |
| Stale-only và empty | Warning stale và empty state cùng hiển thị | Cả hai khối được render độc lập | PASS |
| Responsive/focus | Card và action không tràn; focus keyboard rõ | CSS có layout 2 cột từ 768px, xếp nút dọc dưới 480px, `:focus-within` | PASS |

### Lệnh và bằng chứng

- `node --check` trên 17 file `site/js/**/*.js` — PASS.
- Script Node kiểm tra thêm/bỏ/trùng/reload/rỗng/JSON lỗi/quota/storage bị chặn — PASS.
- `git diff --check` — PASS.
- Smoke test HTTP cho `index.html`, `conferences.html`, `conference.html`, `saved.html`, `about.html` tại `127.0.0.1:5500` — cả 5 route trả `200`.
- Chưa có browser automation trong starter; kiểm tra click thực tế, keyboard và viewport cần reviewer TV2 chạy lại trên trình duyệt.

## Trạng thái task và handoff

- **Trạng thái:** Code và test đã hoàn tất; chưa đánh dấu Done cuối cùng vì còn chờ reviewer TV2 kiểm tra browser.
- **Commit:** [1e5042b](https://github.com/khongphainoob/UIT-CONFINDER/commit/1e5042b).
- **Handoff:** Reviewer mở `http://127.0.0.1:5500/saved.html`, kiểm tra thêm/bỏ/trùng/reload, JSON lỗi, ID cũ, keyboard focus và viewport 360/768/1366px.
