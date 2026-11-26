// Chủ: TV1 (TV1-07). Crawl trang Call for Papers để lấy văn bản chủ đề.
//
// TODO(TV1-07):
// - Chỉ crawl chuỗi chưa có cfp_crawled_at hoặc đã quá 30 ngày; ưu tiên CCF A/B
// - Từ websiteUrl tìm link có chữ "call for papers", "cfp", "topics" (dùng cheerio: npm i cheerio)
// - Năm mới chưa có web thì thử website của năm trước
// - Đọc robots.txt, tối đa 1 request/giây, timeout 10 giây
// - User-Agent chung, ví dụ "UIT-ConFinder-Bot/1.0 (+<link repo>)"; không ghi tên hay email cá nhân
// - Lưu văn bản thô vào data/cfp/<seriesKey>.txt (thư mục này nên nằm trong .gitignore)
// - Ghi danh sách chuỗi lỗi kèm lý do ra data/cfp-errors.json để đưa vào báo cáo

console.error('TODO(TV1-07): chưa viết crawler CFP.');
process.exitCode = 1;
