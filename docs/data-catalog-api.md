# Tài liệu đặc tả cấu trúc dữ liệu Catalog API (Dành cho Team)

> **Phụ trách dữ liệu:** Thành viên 1  
> **Áp dụng cho:** Toàn bộ thành viên phát triển giao diện (Trang chủ, Khám phá, Đã lưu, Chi tiết, Xuất lịch).  
> **File cung cấp dữ liệu:** `site/js/data-service.js` & `site/js/deadline-utils.js`

---

## 1. Cách gọi và lấy dữ liệu trong các trang

Mọi trang **không tự fetch API ngoài hay tự đọc file snapshot trực tiếp**, mà chỉ cần import và gọi hàm duy nhất `getCatalog()`:

```javascript
import { getCatalog } from '../data-service.js';

async function loadData() {
  try {
    const catalog = await getCatalog();
    console.log(catalog.meta);     // Thông tin nguồn dữ liệu (live hay snapshot)
    console.log(catalog.editions); // Mảng toàn bộ các kỳ hội nghị
  } catch (error) {
    console.error('Lỗi khi tải dữ liệu:', error.message);
  }
}
```

> **Lưu ý hiệu năng:** `getCatalog()` đã tích hợp cơ chế cache Promise. Toàn bộ website khi chuyển qua lại giữa các trang hoặc khi người dùng gõ tìm kiếm/bộ lọc sẽ **không bị gọi lại mạng**, đảm bảo tốc độ phản hồi tức thì.

---

## 2. Cấu trúc tổng quát của `catalog`

Hàm `getCatalog()` trả về một `Promise` phân giải thành Object có 2 thuộc tính chính:

```typescript
{
  meta: CatalogMeta,
  editions: Array<Edition>
}
```

### 2.1. Đối tượng `meta` (Thông tin nguồn dữ liệu)

| Thuộc tính | Kiểu dữ liệu | Ý nghĩa | Ví dụ |
|---|---|---|---|
| `mode` | `'live'` \| `'snapshot'` | Chế độ dữ liệu đang dùng (từ API thật hay từ snapshot dự phòng) | `'live'` |
| `loadedAt` | `string` (ISO) | Thời điểm dữ liệu được nạp vào trình duyệt | `'2026-10-28T08:00:00.000Z'` |
| `fetchedAt` | `string` \| `null` | Thời điểm snapshot được tạo ra | `'2026-10-27T08:00:00.000Z'` |
| `sourceUrl` | `string` | Đường dẫn nguồn dữ liệu | `'https://ccfddl.com/conference/allconf.json'` |

---

## 3. Cấu trúc chi tiết của từng kỳ hội nghị (`Edition`)

Mỗi phần tử trong mảng `catalog.editions` đại diện cho **1 kỳ tổ chức của một hội nghị** (tương ứng với 1 Card trên giao diện, 1 lượt Bookmark và 1 trang chi tiết).

```json
{
  "id": "cvpr27",
  "seriesKey": "AI/cvpr",
  "acronym": "CVPR",
  "name": "IEEE/CVF Conference on Computer Vision and Pattern Recognition",
  "year": 2027,
  "fields": ["AI"],
  "ranks": {
    "ccf": "A",
    "core": "A*",
    "year": null,
    "sourceUrl": null
  },
  "place": "Seattle, WA, United States",
  "format": "Offline",
  "websiteUrl": "https://cvpr.thecvf.com/Conferences/2027",
  "sourceUrl": "https://ccfddl.com/",
  "checkedAt": null,
  "verifiedAt": null,
  "links": {
    "cfp": null,
    "template": null,
    "authorGuide": null
  },
  "rounds": [ ... ]
}
```

### Bảng giải thích chi tiết các trường của `Edition`:

| Trường | Kiểu dữ liệu | Ý nghĩa & Hướng dẫn sử dụng |
|---|---|---|
| `id` | `string` | **Định danh duy nhất** của kỳ hội nghị (vd: `'cvpr27'`, `'aaai21'`). Dùng làm tham số URL `hoi-nghi.html?id=...` và ID lưu trong `LocalStorage`. |
| `seriesKey` | `string` | Mã định danh chuỗi hội nghị (vd: `'AI/cvpr'`). |
| `acronym` | `string` | Tên viết tắt của hội nghị (vd: `'CVPR'`, `'ICSE'`, `'SIGMOD'`). |
| `name` | `string` | Tên đầy đủ của hội nghị. |
| `year` | `number` | Năm tổ chức (vd: `2027`). |
| `fields` | `string[]` | Danh mục nghiên cứu chuẩn CCF. Gồm 10 mã: `'AI'`, `'SE'`, `'DB'`, `'NW'`, `'SC'`, `'DS'`, `'CG'`, `'HI'`, `'MX'`, `'CT'`. |
| `ranks.ccf` | `string` \| `null` | Xếp hạng CCF: `'A'`, `'B'`, `'C'`, `'N'` (None) hoặc `null`. |
| `ranks.core` | `string` \| `null` | Xếp hạng CORE: `'A*'`, `'A'`, `'B'`, `'C'`, `'N'` hoặc `null`. |
| `place` | `string` \| `null` | Địa điểm tổ chức dạng văn bản (vd: `'Seattle, WA, United States'`). |
| `format` | `string` \| `null` | Hình thức tổ chức: `'Online'`, `'Offline'`, `'Hybrid'` hoặc `null` nếu chưa rõ. |
| `websiteUrl` | `string` \| `null` | Link website chính thức của hội nghị. |
| `sourceUrl` | `string` | Link nguồn thu thập dữ liệu (mặc định `'https://ccfddl.com/'`). |
| `rounds` | `Round[]` | Danh sách các vòng nộp bài (xem mục 4). |

---

## 4. Cấu trúc Vòng nộp bài (`Round`) và Mốc thời gian (`DeadlineItem`)

Một kỳ hội nghị có thể có nhiều vòng nộp (Round 1, Round 2...) hoặc chỉ có 1 vòng Chính thức. Mỗi vòng chứa các mốc thời gian cụ thể (Abstract, Full Paper...).

### 4.1. Cấu trúc `Round`
```json
{
  "id": "r1",
  "label": "Chính thức",
  "deadlines": [ ... ]
}
```

### 4.2. Cấu trúc `DeadlineItem`
```json
{
  "id": "r1-abstract",
  "type": "abstract",
  "instant": "2026-11-10T23:59:59-12:00",
  "sourceText": "2026-11-10 23:59:59",
  "timezone": "UTC-12",
  "precision": "instant",
  "quality": "unverified",
  "sourceUrl": null,
  "checkedAt": null,
  "verifiedAt": null
}
```

### Bảng giải thích chi tiết `DeadlineItem`:

| Trường | Giá trị có thể nhận | Ý nghĩa |
|---|---|---|
| `id` | `string` | ID ổn định của mốc deadline (vd: `'r1-abstract'`, `'r1-paper'`). |
| `type` | `'abstract'` \| `'paper'` \| `'rebuttal'` \| `'decision'` \| `'opening'` | Loại mốc: Nộp tóm tắt, nộp bài toàn văn, phản biện, thông báo kết quả, khai mạc. |
| `instant` | `string` (ISO 8601 có múi giờ) \| `null` | Thời điểm nộp bài chính xác chuẩn ISO có offset múi giờ (vd: `'2026-11-10T23:59:59-12:00'`). **Dùng để so sánh thời gian, đếm ngược và xuất Calendar.** Nếu mốc là TBA hoặc chỉ có ngày thì trường này là `null`. |
| `sourceText` | `string` | Chuỗi nguyên văn từ nguồn (vd: `'2026-11-10 23:59:59'`, `'TBA'`). |
| `timezone` | `string` \| `null` | Múi giờ công bố gốc (vd: `'UTC-12'`, `'AoE'`, `'UTC'`). |
| `precision` | `'instant'` \| `'date'` \| `'unknown'` | Độ chính xác thời gian: Đủ ngày giờ (`instant`), chỉ có ngày (`date`), hoặc chưa rõ (`unknown`). |
| `quality` | `'verified'` \| `'unverified'` \| `'estimated'` \| `'tba'` | Chất lượng kiểm chứng của mốc. |

---

## 5. Các hàm tiện ích có sẵn (Deadline Helpers)

Các thành viên **không cần tự viết thuật toán tính toán ngày giờ phức tạp**, hãy dùng các hàm tiện ích được cung cấp sẵn trong `site/js/deadline-utils.js`:

```javascript
import {
  getNextSubmission,
  getCountdownText,
  getUrgencyInfo,
  formatDateGMT7,
  formatTimeGMT7
} from '../deadline-utils.js';
```

### 5.1. `getNextSubmission(edition, { kind, now })`
Hàm quan trọng nhất cho **Trang chủ** và **Trang khám phá**:
- **Tham số:** 
  - `edition`: Object hội nghị.
  - `{ kind: 'any' | 'abstract' | 'paper', now?: number }` (mặc định `'any'`).
- **Kết quả trả về:**
  ```javascript
  {
    status: 'upcoming' | 'closed' | 'unknown',
    deadline: DeadlineItem | null, // Mốc nộp bài ưu tiên tiếp theo
    futureDeadlines: DeadlineItem[] // Danh sách các mốc tương lai còn hạn (đã xếp tăng dần)
  }
  ```
  - `status === 'upcoming'`: Hội nghị **còn hạn** nộp bài.
  - `status === 'closed'`: Tất cả các mốc nộp bài **đã kết thúc**.
  - `status === 'unknown'`: Dữ liệu chưa công bố (TBA) hoặc không đủ giờ chính xác.

### 5.2. `getCountdownText(targetTimeMs)`
- Trả về chuỗi tiếng Việt đếm ngược hiển thị trên Card:  
  *Ví dụ: `"còn 12 ngày 5 giờ"`, `"còn 4 giờ 30 phút"`, `"Đã hết hạn"`.*

### 5.3. `getUrgencyInfo(targetTimeMs)`
- Phân loại độ khẩn cấp để gắn class màu / icon cảnh báo:
  - `urgent`: Dưới 3 ngày (gấp - màu đỏ).
  - `week`: Dưới 7 ngày (màu cam).
  - `month`: Dưới 30 ngày (màu vàng/xanh).
  - `open`: Trên 30 ngày (còn rộng).
  - `expired`: Đã qua hạn.

### 5.4. `formatDateGMT7(isoString)` & `formatTimeGMT7(isoString)`
- Tự động quy đổi thời gian quốc tế (AoE / UTC-12) sang giờ Việt Nam chuẩn (GMT+7).  
  *Ví dụ: `'2026-11-10T23:59:59-12:00'` ➜ Giờ Việt Nam: `'18:59 GMT+7 · 11/11/2026'`.*

---

## 6. Hướng dẫn phân công chi tiết cho các thành viên

### 🏠 Thành viên 2 (Trang chủ - `site/js/pages/home.js`)
1. Gọi `const { editions } = await getCatalog();`.
2. Lọc danh sách các hội nghị sắp tới hạn:
   ```javascript
   const upcomingConfs = editions
     .map(conf => ({ conf, sub: getNextSubmission(conf) }))
     .filter(item => item.sub.status === 'upcoming')
     .sort((a, b) => Date.parse(a.sub.deadline.instant) - Date.parse(b.sub.deadline.instant))
     .slice(0, 6); // Lấy tối đa 6 hội nghị gần nhất
   ```
3. Render các thẻ Card hiển thị: Tên viết tắt (`acronym`), Tên đầy đủ (`name`), Badge Rank (`ccf`/`core`), Thời gian đếm ngược (`getCountdownText`), và nút click chuyển đến `hoi-nghi.html?id=${conf.id}`.

### 🔍 Thành viên 3 (Trang khám phá - `site/js/pages/conference-list.js`)
1. Gọi `const { editions } = await getCatalog();`.
2. Lọc (Filter) theo các điều kiện từ URL search params:
   - Từ khóa (`q`): So khớp không dấu với `acronym` và `name`.
   - Lĩnh vực (`fields`): Kiểm tra phần tử thuộc mảng `edition.fields`.
   - Xếp hạng (`ccf`, `core`): Kiểm tra `edition.ranks.ccf` hoặc `edition.ranks.core`.
   - Hình thức (`format`): `'Online'`, `'Offline'`, `'Hybrid'`.
   - Trạng thái nộp bài: Dựa vào `getNextSubmission(edition)`.
3. Sắp xếp (Sort) theo: Deadline gần nhất, Tên A-Z, Thứ hạng rank.
4. Phân trang: Chia mảng kết quả sau khi lọc với kích thước 12 item/trang (`PAGE_SIZE = 12`).

### 💾 Thành viên 4 (Trang đã lưu & Calendar - `site/js/pages/saved.js`)
1. Đọc danh sách `savedIds` từ `saved-store.js` (hoặc `LocalStorage`).
2. Gọi `const { editions } = await getCatalog();`.
3. Ghép (Join) dữ liệu:
   ```javascript
   const savedEditions = editions.filter(ed => savedIds.includes(ed.id));
   ```
4. Render danh sách các hội nghị người dùng đã lưu.
5. Khi người dùng bấm nút **"Xuất lịch"**:
   - Lấy mốc deadline chính xác (`deadline.instant`).
   - Truyền vào `buildGoogleCalendarUrl(edition, deadline)` hoặc `createIcs(edition, deadline)` để tải file `.ics` hoặc mở trang Google Calendar.

---

## 7. Mẫu dữ liệu hoàn chỉnh (Fixture thực tế từ Snapshot)

Nếu cần dữ liệu mẫu tĩnh để viết unit test hoặc dựng khung HTML/CSS độc lập, bạn có thể tham khảo mẫu hoàn chỉnh của hội nghị **CVPR 2027**:

```json
{
  "id": "cvpr27",
  "seriesKey": "AI/cvpr",
  "acronym": "CVPR",
  "name": "IEEE/CVF Conference on Computer Vision and Pattern Recognition",
  "year": 2027,
  "fields": ["AI"],
  "ranks": {
    "ccf": "A",
    "core": "A*",
    "year": null,
    "sourceUrl": null
  },
  "place": "Seattle, WA, United States",
  "format": "Offline",
  "websiteUrl": "https://cvpr.thecvf.com/Conferences/2027",
  "sourceUrl": "https://ccfddl.com/",
  "checkedAt": null,
  "verifiedAt": null,
  "links": {
    "cfp": null,
    "template": null,
    "authorGuide": null
  },
  "rounds": [
    {
      "id": "r1",
      "label": "Chính thức",
      "deadlines": [
        {
          "id": "r1-abstract",
          "type": "abstract",
          "instant": "2026-11-10T23:59:59-12:00",
          "sourceText": "2026-11-10 23:59:59",
          "timezone": "UTC-12",
          "precision": "instant",
          "quality": "unverified",
          "sourceUrl": null,
          "checkedAt": null,
          "verifiedAt": null
        },
        {
          "id": "r1-paper",
          "type": "paper",
          "instant": "2026-11-16T23:59:59-12:00",
          "sourceText": "2026-11-16 23:59:59",
          "timezone": "UTC-12",
          "precision": "instant",
          "quality": "unverified",
          "sourceUrl": null,
          "checkedAt": null,
          "verifiedAt": null
        }
      ]
    }
  ]
}
```
