# Phân file và trình tự bàn giao

| Người | HTML tự xây | CSS tự xây | JavaScript chính |
|---|---|---|---|
| TV1 | conference.html | css/pages/conference-detail.css | data-service.js, data-adapter.js, deadline-utils.js, pages/conference-detail.js; data/ |
| TV2 | index.html, about.html, components.html | tokens.css, base.css, components.css, css/pages/home.css, about.css, components.css | common.js, ui/state.js, pages/home.js, about.js, components.js |
| TV3 | conferences.html | css/pages/conference-list.css | pages/conference-list.js, pages/explore-state.js |
| TV4 | saved.html | css/pages/saved.css | saved-store.js, calendar-export.js, pages/saved.js; tools/Git/hosting |

config.js và docs/contracts.md: đề xuất thay đổi qua PR, có owner module review. Không ai giữ quyền độc quyền cả repo; bảng này giúp tránh sửa chồng file.

## Thứ tự để code song song

1. TV4 thống nhất repo nhóm nộp, tạo nhánh setup và đưa khung này vào một PR. Nếu repo đã có file cùng đường dẫn thì đối chiếu từng file, không ghi đè hàng loạt. Không đổi repo tham khảo thành repo nộp khi chưa chốt.
2. TV2 duyệt/sửa nền trước 20/10: tokens, base, component demo, nav/footer. Đây là khung hỗ trợ học tập; nhóm phải tự hiểu, sửa và giải thích được mã dùng trong bài nộp.
3. TV1 duyệt data shape + helper API trước 21/10, đưa fixtures riêng cho mọi người dựng layout; không đợi fetch live mới code UI.
4. Mỗi người tạo branch theo task và tự hoàn thiện HTML/CSS/JS trang mình. Không đợi TV2 dựng hết site.
5. TV4 bàn giao storage/calendar API; chủ Home/List/Detail tự gắn SaveButton/Calendar đúng contract.
6. Review TV1↔TV3, TV2↔TV4. Merge PR nhỏ, thử lại luồng chính sau khi ghép.

## Nhánh theo task, không giữ một branch cá nhân cả tháng

Ví dụ: feat/t1-tv1-detail-shell; feat/t1-tv2-ui-foundation; feat/t1-tv3-explore-shell; feat/t1-tv4-saved-shell.
Đầu task cập nhật main rồi tạo nhánh. Một PR gắn một task, ghi input→output/ảnh/viewport. Không push trực tiếp main. Không commit node_modules, khóa API, file cá nhân hay bộ báo cáo nháp nặng.

Không đánh dấu task Done chỉ vì bộ khung chạy. Chuẩn nghiệm thu và các task tuần nằm ở Notion.
