// Chủ: TV4 (TV4-07). Bắn liên tiếp request vào /api/match để demo giới hạn tần suất.
// Dùng: npm run spam-test                       (server trên máy, cổng 3000)
//       npm run spam-test -- https://<api>.onrender.com 10

const base = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const total = Number(process.argv[3] || 10);
const body = JSON.stringify({ description: 'Thử giới hạn tần suất: tôi làm về thị giác máy tính và nhận dạng ảnh.' });

console.log(`Gửi ${total} request tới ${base}/api/match\n`);
console.log('Lần | Mã  | Retry-After | Kết quả');
console.log('----|-----|-------------|--------');

for (let i = 1; i <= total; i += 1) {
  try {
    const response = await fetch(`${base}/api/match`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    });
    const data = await response.json().catch(() => ({}));
    const retry = response.headers.get('retry-after') ?? '-';
    console.log(`${String(i).padStart(3)} | ${response.status} | ${retry.padStart(11)} | ${data.error ?? 'OK'}`);
  } catch (error) {
    console.log(`${String(i).padStart(3)} | ERR |           - | ${error.message}`);
  }
}
