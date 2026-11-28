# Backend UIT ConFinder

Express (chạy trên Node.js) + SQLite có sẵn trong Node. Thiết kế và lý do chọn công nghệ: [docs/t5-feedback-improvement-plan.md](../docs/t5-feedback-improvement-plan.md), mục 4 và 5.

## Chạy trên máy

Cần Node **22.13 trở lên** (kiểm tra bằng `node -v`, nhóm đang dùng 24).

```bash
cd backend
npm install
cp .env.example .env      # Windows PowerShell: Copy-Item .env.example .env
npm run dev               # tự khởi động lại khi sửa code
```

Mở <http://localhost:3000/api/health>, thấy `"ok": true, "editions": 2346` là chạy được.

Chạy frontend song song (`python tools/serve.py` ở thư mục gốc, cổng 5500). Muốn frontend gọi backend trên máy thì tạm sửa `API_ENDPOINT` trong `site/js/config.js` thành `http://localhost:3000/api/conferences`, **không commit thay đổi này**.

Dòng `ExperimentalWarning: SQLite is an experimental feature` là bình thường.

## Lệnh

| Lệnh | Làm gì |
|---|---|
| `npm run dev` | Chạy server, tự nạp lại khi sửa file, đọc `.env` |
| `npm start` | Chạy server như trên Render |
| `npm test` | Chạy test backend |
| `npm run ingest` / `crawl` / `enrich` | Cập nhật dữ liệu (TV1-04, 07, 08) |
| `npm run spam-test` | Bắn 10 request vào `/api/match` để xem giới hạn tần suất (thêm `-- <url> <số lần>` để đổi) |

## Đã có sẵn (phần nền, chạy được)

- `GET /api/health`, `GET /api/conferences` (đang trả catalog trong bộ nhớ)
- SQLite trong bộ nhớ với 5 bảng, nạp từ `data/catalog.enriched.json`, chưa có file này thì dùng `site/data/conferences.snapshot.json`
- Theo tài liệu Express: `helmet` (header bảo mật, tắt `X-Powered-By`), `compression` (catalog 2 MB còn khoảng 130 KB), `trust proxy` dạng số, route tách bằng `express.Router`, middleware lỗi 4 tham số đặt cuối, tắt server êm khi nhận SIGTERM, `NODE_ENV=production` trên Render
- CORS chỉ cho domain trong `ALLOWED_ORIGIN`, giới hạn body 10 KB, xử lý lỗi không lộ stack trace
- Giới hạn tần suất: `/api/conferences` 60/phút, `/api/match` 5/phút và 20/ngày mỗi IP, trả 429 kèm `Retry-After`
- `POST /api/match`: luồng gợi ý 5 bước, cache 24 giờ, ngân sách AI toàn hệ thống. Chi tiết, hợp đồng API và rà soát bảo mật: [docs/ai-assistant.md](../docs/ai-assistant.md)
- 82 test (`npm test`), Gemini được thay bằng bản giả nên không cần mạng hay khóa

## Phần của từng người

Tìm `TODO(` trong thư mục `backend/` để thấy việc còn lại.

| File | Hàm | Chủ | Task | Trạng thái |
|---|---|---|---|---|
| `src/normalize.js`, `data/country-map.json` | `normalizePlace` | TV1 | TV1-01 | Xong phía backend; còn đưa sang `site/js/data-adapter.js` |
| `src/db.js` | `queryEditionIds` | TV1 | TV1-05 | Xong |
| `src/routes/conferences.js` | đọc từ SQLite | TV1 | TV1-06 | Chưa |
| `scripts/ingest.js`, `crawl-cfp.js`, `enrich.js` | cả file | TV1 | TV1-04, 07, 08 | Chưa |
| `src/filters.js` | `validateFilters`, `relaxFilters`, `toExploreUrl` | TV3 | TV3-10 | Xong |
| `src/retrieval.js` | `createRetrievalIndex`, `rankByKeywords` | TV3 | TV3-07 | Xong |
| `src/gemini.js` | `generateJson` | TV4 | TV4-05 | Xong, chờ khóa chạy được để thử thật |
| `src/prompts.js`, `src/match.js`, `src/ai-budget.js` | prompt, luồng 5 bước, cache, ngân sách | TV4 | TV4-04, 06, 10 | Xong; còn ghi 10 câu thử thật vào prompt-plan |
| `render.yaml`, `.github/workflows/ingest.yml` | deploy, cron | TV4 | TV4-01, 03 | Chưa deploy |

Người phụ trách task phải đọc, hiểu và tự giải thích được phần code đã làm sẵn cho mình. Quy tắc: viết test cùng lúc với code.

## Cấu trúc

```
backend/
  src/
    server.js      điểm chạy: nạp catalog → dựng SQLite → mở cổng
    app.js         ghép middleware chung → router → 404 → xử lý lỗi (tách riêng để test không cần mở cổng)
    routes/        mỗi nhóm endpoint một express.Router: health.js, conferences.js, match.js
    middleware/    rate-limit.js, error-handler.js
    services.js    dựng SQLite, chỉ mục BM25, ngân sách AI, dịch vụ gợi ý một lần (server và test dùng chung)
    prompts.js     prompt + JSON Schema cho 2 lần gọi Gemini
    ai-budget.js   trần lượt gọi AI toàn hệ thống và số yêu cầu đồng thời
    config.js      đọc biến môi trường, hạn mức
    catalog.js     nạp JSON, dùng chung normalizeCatalog với frontend
    db.js          schema 5 bảng, nạp dữ liệu, truy vấn
    errors.js      lỗi có mã HTTP
    filters.js     kiểm tra và nới bộ lọc (TV3)
    retrieval.js   BM25 (TV3)
    gemini.js      gọi Gemini (TV4)
    match.js       luồng gợi ý 5 bước (TV4)
    normalize.js   địa điểm → quốc gia, khu vực (TV1)
  data/            catalog.enriched.json (cron tạo), country-map.json
  scripts/         ingest, crawl, enrich
  tools/           spam-test
  tests/
```

## Deploy lên Render (TV4-01)

1. Render → **New → Blueprint** → chọn repo nhóm. Render đọc `render.yaml` ở thư mục gốc.
2. Điền biến môi trường: `ALLOWED_ORIGIN` (domain GitHub Pages của nhóm), `GEMINI_API_KEY`, `GEMINI_MODEL`.
3. Kiểm tra IP: tạm đặt `DEBUG_IP=1`, mở `/api/debug/ip`, phải thấy IP thật của mình chứ không phải IP nội bộ của Render. Sai thì đổi `TRUST_PROXY`. Kiểm tra xong đặt lại `DEBUG_IP=0`.
4. Chạy `npm run spam-test -- https://<tên-service>.onrender.com 8` để xác nhận 429.

## Bảo mật

- **Không commit `.env`** (đã có trong `.gitignore`). Khóa Gemini chỉ để trong `.env` trên máy, Render Environment và GitHub Secrets.
- Mọi câu SQL dùng tham số `?`, không nối chuỗi người dùng.
- Kết quả từ Gemini luôn được kiểm tra lại trước khi dùng (`validateFilters`, lọc ID ở bước 5).
