# Hợp đồng giữa các module — bản khởi tạo để nhóm duyệt

Hợp đồng là tên hàm và cấu trúc dữ liệu mà 4 người thống nhất. Người gọi không cần biết cách module bên trong xử lý. Không tự đổi tên/shape nếu chưa báo người dùng module đó.

## 1. Catalog đã chuẩn hóa (TV1)

`getCatalog({signal}?) -> Promise<{meta, editions}>`.
Trong starter, hàm này chỉ đọc snapshot rỗng. TV1 bổ sung validate đầy đủ, live API/adapter/fallback. Trang gọi một lần rồi dùng catalog đã có; không fetch lại mỗi lần gõ tìm kiếm.

```js
const catalog = {
  meta: { mode: 'snapshot', fetchedAt: null, checkedAt: null, sourceUrl: null },
  editions: [{
    id: 'fixture-series-2027', // fixture, KHÔNG phải một hội nghị thật
    seriesKey: 'fixture-series', acronym: 'DEMO', name: 'Dữ liệu kiểm thử',
    year: 2027, fields: ['AI'],
    ranks: { ccf: null, core: null, year: null, sourceUrl: null },
    place: null, format: null, // Online | Offline | Hybrid | null
    websiteUrl: null, sourceUrl: null,
    checkedAt: null, verifiedAt: null,
    links: { cfp: null, template: null, authorGuide: null },
    rounds: [{
      id: 'r1', label: 'Round 1',
      deadlines: [{
        id: 'd1', type: 'paper', // abstract | paper | rebuttal | decision | opening
        instant: null, // ISO 8601 có Z/offset, không dùng giờ local không timezone
        sourceText: 'TBA', timezone: null,
        precision: 'unknown', // instant | date | unknown
        quality: 'tba', // verified | unverified | estimated | tba
        sourceUrl: null, checkedAt: null, verifiedAt: null,
      }],
    }],
  }],
};
```

Một card/lượt lưu = một `edition.id`. Round/deadline cũng có ID ổn định. `sourceText` giữ nguyên cách nguồn viết; không parse bằng cách đoán theo locale. Date-only/Estimated/TBA không được tự thành timestamp chính xác. Giờ đọc file `loadedAt` không phải `checkedAt/verifiedAt`.

## 2. Deadline chung (TV1)

`getNextSubmission(edition, {kind, now}) -> {status, deadline, futureDeadlines}`.

- `kind`: any/abstract/paper; `now`: milliseconds, truyền cùng một giá trị khi xử lý cả list.
- `deadline`: mốc đã chọn hoặc null; có đủ ID/type/roundId/instant/precision/quality.
- `futureDeadlines`: mảng cùng kind có instant hợp lệ và tương lai, đã sắp tăng dần; lấy từ tất cả round.
- status upcoming nếu có mốc đủ chính xác còn tương lai; unknown nếu còn dữ liệu thiếu/ước lượng hoặc thiếu loại mốc; closed khi tất cả mốc liên quan đều biết chính xác và đã qua.
- Không đưa estimated/date-only/TBA vào futureDeadlines; chúng có nhãn riêng và không được xuất lịch.
- Khi toàn bộ mốc đã qua, deadline là mốc vừa qua gần nhất để hiển thị khi bật past; tie theo đặc tả.
- Home/List/Saved dùng helper; Detail có thể chọn một deadlineId cụ thể và phải truyền đúng mốc đó cho Calendar.

TV3 lọc cửa sổ bằng futureDeadlines: now < deadline <= now + N*24h. Không lấy ngày diễn ra hội nghị, không lọc chuỗi countdown. Helper là hàm thuần để test bằng now cố định. Starter mới có stub báo TODO, chưa thực hiện thuật toán.

## 3. Lưu hội nghị và Calendar (TV4)

- `getSavedIds() -> {ok, ids, error}`: ids là array edition ID hợp lệ về kiểu dữ liệu, error là null hoặc thông tin để trang hiển thị warning. Đối chiếu ID còn trong catalog ở page layer.
- `toggleSaved(id) -> {ok, saved, ids, error}`: chỉ thành công sau khi ghi storage; key đề xuất `uit-confinder:saved:v1`, lưu JSON `{version:1, ids:[...]}`.
- Sau khi ghi thành công, phát `window` CustomEvent `saved:changed` với `detail:{ids}` để đồng bộ các nút trong cùng trang. Sự kiện `storage` để đồng bộ tab khác nếu thực hiện; không đồng bộ tài khoản.
- `buildGoogleCalendarUrl(edition, selectedDeadline) -> string URL`.
- `createIcs(edition, selectedDeadline) -> string nội dung ICS`; caller tạo Blob/tải, revoke Object URL sau khi dùng.
- Calendar helpers từ chối dữ liệu không đủ chính xác/Estimated/TBA bằng lỗi có lý do; caller hiển thị lý do hoặc disable. Không tự chọn lại deadline, thêm duration hay reminder.

Các hàm TV4 hiện là stub; chưa có lưu/xuất lịch thật trong starter.

## 4. UI chung (TV2)

- `initCommonUI(pageKey)` chỉ dựng nav/footer và menu mobile; không xử lý business. pageKey: `home | explore | detail | saved | about | components`; `detail` đánh dấu mục Khám phá.
- `showState(host,{kind,title,message,action?})` dùng DOM/textContent; kind loading/error/empty. `action` tuỳ chọn: `{label,onClick}` (nút, vd. Thử lại) hoặc `{label,href}` (liên kết http/https hoặc tương đối). Không truyền `action` thì chạy như cũ.
- `createIcon(name, className?)` trong common.js trả `<svg class="icon">` dùng sprite `#i-<name>`; dùng khi render bằng DOM API.
- tokens/base/components là nền chung; chủ trang tự viết layout/responsive CSS của mình.
- Card renderer có thể do từng chủ trang viết theo cùng shape; không bắt buộc tạo framework component.

## 5. State Explore (TV3)

q, fields[], ccf[], core[], mode[], kind, window, past, sort, page. Mặc định trong explore-state.js.
URL multi-select dùng params lặp. Lọc OR trong nhóm, AND giữa nhóm, sort rồi mới phân trang 12 edition. Reset không xóa saved. TV3 tự hiện thực parser/validator/pipeline và UI; hàm parse/serialize không được phụ thuộc DOM.

## 6. Khi contract đổi

Chủ module sửa docs này cùng PR, đưa ví dụ input/output, báo TV đang gọi module, và chỉ merge sau review. Không đổi ID/field để chữa lỗi riêng của một trang. Stub chưa làm phải ném lỗi rõ, không trả kết quả giả khiến các trang hiểu đã có chức năng.
