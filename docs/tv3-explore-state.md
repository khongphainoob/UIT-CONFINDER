# TV3 — Quy ước bộ lọc cho trang Khám phá

Tài liệu này ghi lại phần mình làm cho task `T1-TV3-01`: thống nhất trạng thái bộ lọc, cách lưu bộ lọc trên URL và kết quả mong đợi trước khi nối vào giao diện. Phần này chưa phải trang Khám phá hoàn chỉnh. Giao diện danh sách vẫn cần được dựng ở `conference-list.js`, còn cách chọn deadline dùng helper do TV1 phụ trách.

## 1. Trạng thái cần lưu

Trang Khám phá cần nhớ những gì người dùng đang tìm và đang chọn. Mình gom các giá trị đó vào một object như sau:

```js
{
  q: '',
  fields: [],
  ccf: [],
  core: [],
  mode: [],
  kind: 'any',
  window: 'all',
  past: false,
  sort: 'deadline',
  page: 1,
}
```

- `q`: từ khóa tìm theo tên hoặc tên viết tắt của hội nghị.
- `fields`: một hoặc nhiều lĩnh vực nghiên cứu.
- `ccf`: hạng CCF gồm A, B, C.
- `core`: hạng CORE gồm A*, A, B, C.
- `mode`: hình thức online, offline hoặc hybrid.
- `kind`: loại hạn cần xem; `any` là cả abstract và paper.
- `window`: xem tất cả hoặc chỉ các hạn trong 7, 14, 30, 90 ngày tới.
- `past`: có cho phép hiện hội nghị đã hết hạn hay không.
- `sort`: sắp theo deadline, tên, CCF hoặc CORE.
- `page`: trang hiện tại, bắt đầu từ 1 và hiển thị 12 hội nghị mỗi trang.

## 2. Cách bộ lọc hoạt động

1. Nhiều lựa chọn trong cùng một nhóm được hiểu là “hoặc”. Ví dụ chọn AI và Software Engineering thì hội nghị thuộc một trong hai lĩnh vực đều được nhận.
2. Các nhóm khác nhau được ghép bằng “và”. Ví dụ AI + CORE A* + Online nghĩa là hội nghị phải thỏa cả ba điều kiện.
3. Ô tìm kiếm kiểm tra cả acronym và tên đầy đủ, không phân biệt chữ hoa, chữ thường hoặc dấu tiếng Việt.
4. Loại deadline và cùng một mốc `now` được truyền vào `getNextSubmission` để toàn bộ danh sách được tính tại cùng một thời điểm.
5. Bộ lọc “trong N ngày” dùng `futureDeadlines` với điều kiện `now < instant <= now + N*24h`.
6. Deadline dạng Estimated, chỉ có ngày hoặc TBA không được đưa vào khoảng thời gian vì chưa đủ chính xác.
7. Mặc định ẩn hội nghị đã đóng. Khi người dùng bật `past`, các hội nghị đó mới xuất hiện.
8. Thứ tự xử lý là lọc → sắp xếp → chia trang. Mỗi trang có tối đa 12 hội nghị.
9. Khi đổi bộ lọc hoặc cách sắp xếp, giao diện phải quay về trang 1.
10. Xóa bộ lọc chỉ đưa bộ lọc về mặc định, không xóa danh sách hội nghị người dùng đã lưu.

## 3. Cách lưu bộ lọc trên URL

Mỗi lựa chọn nhiều giá trị được lặp lại trên URL. Cách này giúp người dùng tải lại trang, dùng nút Back/Forward hoặc gửi đường link đã lọc cho người khác mà vẫn giữ đúng trạng thái.

Multi-select dùng params lặp:

```text
?q=machine%20learning&field=AI&field=Computer%20Vision&ccf=A&core=A*&mode=hybrid&kind=paper&window=30&past=1&sort=deadline&page=2
```

Khi tạo URL, các tham số được ghi theo thứ tự `q`, `field`, `ccf`, `core`, `mode`, `kind`, `window`, `past`, `sort`, `page`. Giá trị đang ở mặc định sẽ được bỏ qua để đường link gọn hơn. Riêng `past` chỉ xuất hiện dưới dạng `past=1` khi người dùng muốn xem dữ liệu đã hết hạn.

## 4. Những hàm đã viết

`site/js/pages/explore-state.js` xuất:

```js
DEFAULT_STATE
PAGE_SIZE
normalizeSearchText(value)
normalizeState(input, options)
parseState(searchParams, options)
serializeState(state, options)
applyFilters(editions, state, options)
sortEditions(items, state)
paginate(items, page, pageSize)
```

`applyFilters` nhận `getNextSubmission` từ bên ngoài. Nhờ vậy TV3 có thể kiểm thử bộ lọc bằng dữ liệu giả trong lúc chờ TV1 hoàn thành helper thật, đồng thời không phải chép lại nghiệp vụ deadline. Mỗi kết quả giữ cả thông tin hội nghị và deadline đã chọn:

```js
{ edition, submission: { status, deadline, futureDeadlines } }
```

## 5. Các trường hợp đã kiểm tra

Để kết quả không thay đổi theo ngày chạy máy, bộ test cố định thời gian tại `2026-10-20T00:00:00Z`. Dữ liệu mẫu chi tiết nằm trong `tools/explore-state.test.mjs`.

| Test | Input | Expected |
|---|---|---|
| T01 | Query rỗng | `e02, e01, e06, e05, e03` |
| T02 | `q=soict` | `e03` |
| T03 | Search theo tên đầy đủ | `e01` |
| T04 | `field=AI&mode=online` | `e05` |
| T05 | Chọn hai lĩnh vực | Nhận hội nghị thuộc một trong hai lĩnh vực |
| T06 | `field=AI&core=B` | `e03` |
| T07 | `core=A*&kind=paper&window=30` | `e01, e02` |
| T08 | `kind=abstract&window=30` | `e02` |
| T09 | `window=7` | `e02, e01` |
| T10 | Past mặc định | Loại closed |
| T11 | `past=1` | Cho phép closed |
| T12 | `sort=name` | Acronym tăng dần |
| T13 | Chọn đồng thời CCF và CORE | Hội nghị phải khớp cả hai hạng |
| T14 | Estimated và TBA | Không vào window |
| T15 | Giá trị bộ lọc và trang không hợp lệ | Trở về giá trị mặc định |
| T16 | Params trùng, mode hoa | Xóa trùng và canonical |
| T17 | Đổi bộ lọc khi đang ở trang 3 | Quay về trang 1 |
| T18 | Reset | DEFAULT_STATE; không xóa saved |
| T19 | Back/Forward | Parse lại đúng state |
| T20–T23 | 0/1/12/13 kết quả | Số trang và số phần tử đúng |
| T24 | CORE A* và rank null | Null không khớp A* |
| T25 | Nhiều round | Chọn deadline tương lai của round 2 |
| T26 | Deadline bằng now | Không vào window |
| T27 | Deadline đúng biên phải | Có vào window |
| T28 | Deadline sau biên 1ms | Không vào window |
| T29 | URL lỗi hoặc có tham số lạ | Trang không bị lỗi và dùng giá trị mặc định |

## 6. Chạy kiểm thử

Từ thư mục gốc repository:

```powershell
node tools/explore-state.test.mjs
```

Hiện bộ test chạy đạt 31/31 trường hợp. Trước khi chuyển task sang Done, nhóm vẫn cần đưa thay đổi lên branch riêng, gắn commit hoặc Pull Request và nhờ TV1 xem lại cách dùng helper deadline. Phần phụ thuộc chính là `T1-TV1-01` — model dữ liệu và helper chọn hạn.
