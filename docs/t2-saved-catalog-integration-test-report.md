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
