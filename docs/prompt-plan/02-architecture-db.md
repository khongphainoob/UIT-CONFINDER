# 02. Kiến trúc, cơ sở dữ liệu, API, lịch cron

Đặc tả này đưa cho AI trước khi sinh code backend. Quyết định chi tiết và lý do chọn A thay vì B nằm trong
`docs/t5-feedback-improvement-plan.md` (QĐ1–QĐ13).

## 1. Sơ đồ

```
                ┌────────────── GitHub Actions (cron 03:00 giờ VN mỗi ngày) ─────────────┐
                │  ingest.js ──► crawl-cfp.js ──► enrich.js ──► commit catalog.enriched.json │
                │  (CCFDDL)      (web hội nghị)   (Gemini tóm tắt)                         │
                └───────────────────────────────────────────┬──────────────────────────────┘
                                                            ▼ Render tự deploy lại
Trình duyệt (GitHub Pages)                        Backend Express (Render)
┌──────────────────────────┐   fetch trực tiếp    ┌──────────────────────────────────────────┐
│ HTML/CSS/JS thuần, 6 trang│ ───────────────────► CCFDDL allconf.json (lỗi thì dùng snapshot)
│ LocalStorage: Đã lưu      │                      │ helmet · cors · compression · json 10 KB │
│ Google Calendar (OAuth,   │   POST /api/match    │ express-rate-limit theo IP               │
│  chạy trên trình duyệt)   │ ───────────────────► │ SQLite (node:sqlite, trong bộ nhớ)       │
│ Widget + trang Gợi ý AI   │   GET /api/conferences│ BM25 · ngân sách AI · cache 24 giờ       │
└──────────────────────────┘                      │ Gemini API (khóa chỉ nằm ở server)       │
                                                   └──────────────────────────────────────────┘
```

Web tĩnh vẫn chạy độc lập khi backend tắt; chỉ phần Gợi ý AI cần backend (giấu khóa API, lọc bằng SQL, chặn spam).
Đăng nhập Google chỉ dùng để đồng bộ lịch, chạy hoàn toàn trên trình duyệt (`docs/google-calendar-sync.md`).

## 2. Lược đồ SQLite (`backend/src/db.js`)

DB nằm trong bộ nhớ, nạp lại từ `data/catalog.enriched.json` mỗi lần server khởi động (Render bản miễn phí xóa ổ đĩa sau mỗi lần deploy).

```
series (1) ───< editions (1) ───< deadlines
  key PK            id PK              id PK
  acronym           series_key FK      edition_id FK
  name, field       year, place        round_label, kind (abstract/paper/…)
  ccf, core         country, region    instant_utc (chỉ mốc giờ chính xác)
  summary           format             source_text, timezone, quality
  topics_json       website_url
  cfp_url           payload (JSON đầy đủ theo contracts.md)

match_cache (query_hash PK, result_json, created_at)   -- cache kết quả AI 24 giờ
ingest_log  (id, run_at, source, editions_total, errors)
Chỉ mục: editions(series_key), editions(region, country), deadlines(edition_id, instant_utc)
```

`summary`, `topics_json`, `cfp_url` là phần nhóm tự làm giàu (CCFDDL không có). Mọi giá trị vào câu SQL đi qua tham số `?`.

## 3. API

| Method | Đường dẫn | Giới hạn theo IP | Mô tả |
|---|---|---|---|
| GET | `/api/health` | — | Số kỳ trong DB, số lượt AI đã dùng hôm nay |
| GET | `/api/conferences` | 60/phút | Toàn bộ catalog từ SQLite. Tham số lọc: `region`, `country` (VN,JP), `ccfMin`, `coreMin`, `field` (AI,SE), `withinDays` |
| POST | `/api/match` | 5/phút, 20/ngày | Body `{ description (20–1.500 ký tự), filters? }` → tối đa 5 gợi ý kèm lý do |

Ngoài giới hạn theo IP còn có ngân sách AI toàn hệ thống: 300 lượt/ngày, tối đa 4 yêu cầu cùng lúc.

## 4. Lịch cập nhật dữ liệu (`.github/workflows/ingest.yml`)

| Bước | Tần suất | Giới hạn | Khi lỗi |
|---|---|---|---|
| `ingest` | Mỗi ngày 20:00 UTC (03:00 VN) | Số kỳ giảm quá 20% thì coi như nguồn lỗi | Dừng, giữ file cũ |
| `crawl` | Cùng lượt | 120 chuỗi/ngày, 1 request/giây, đọc robots.txt; chuỗi đã có chủ đề thì 180 ngày mới crawl lại, chuỗi lỗi 30 ngày mới thử lại | Bỏ chuỗi lỗi, ghi lý do |
| `enrich` | Cùng lượt | 100 lượt Gemini/ngày, giãn 4,5 giây | Gặp 429 thì dừng, hôm sau làm tiếp |

Chỉ commit khi dữ liệu đổi. Mọi file ghi theo kiểu ghi file tạm rồi đổi tên, nên không bao giờ để lại file ghi dở.
