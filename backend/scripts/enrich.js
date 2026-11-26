// Chủ: TV1 (TV1-08). Dùng Gemini tóm tắt văn bản CFP thành { summary, topics[] }.
//
// TODO(TV1-08):
// - Đọc data/cfp/<seriesKey>.txt, cắt tối đa 6.000 ký tự
// - Gọi generateJson() trong src/gemini.js với schema { summary: string, topics: string[] }
// - Kiểm tra: topics 3–15 mục, summary dưới 400 ký tự; sai thì bỏ, không ghi
// - Chuỗi đã có topics thì bỏ qua để không tốn quota khi chạy lại
// - Ghi kết quả vào catalog.enriched.json (ghi file tạm rồi đổi tên)
// - Ghi prompt đã dùng vào docs/prompt-plan/04-matcher-prompt.md

console.error('TODO(TV1-08): chưa viết script enrich.');
process.exitCode = 1;
