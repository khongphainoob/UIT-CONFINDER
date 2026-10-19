# Kiểm tra trước PR

## Kiểm bộ khung

- Chạy server, mở 5 trang và components.html; kiểm Network/Console không lỗi import/404.
- Thử dưới /ten-repo/ để phát hiện đường dẫn bắt đầu bằng /; dùng đường dẫn tương đối cho link/asset.
- Mobile 360px, tablet 768px, desktop 1366px; tab qua input/nút, mở/đóng menu bằng phím.
- Home search chuyển q đúng mã hóa sang Khám phá; TV3 còn phải hiện thực parse/filter/URL history.
- Snapshot starter rỗng; chưa có hội nghị thật, filter, save, countdown hoặc calendar hoàn chỉnh.

## Khi hiện thực business

Ghi mã case trong đặc tả Notion + input/now cố định/expected/actual/browser/commit/reviewer. Tách fixture kiểm thử khỏi snapshot thật. Ưu tiên timezone qua ngày/năm, abstract đã qua/paper còn hạn, nhiều round, TBA/date-only/Estimated, OR/AND, URL history, 0/1/12/13 kết quả, JSON storage hỏng/ID mất và import ICS.

Phần kiểm lúc tạo starter: syntax ES modules, import/link local, HTTP/MIME và getCatalog đọc snapshot. Không đồng nghĩa đã kiểm tương tác browser hay nghiệm thu chức năng IE104.
