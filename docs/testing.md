# Kiểm tra trước PR

## Smoke test

- Chạy `python tools/serve.py`, mở 5 trang và `components.html`.
- Kiểm tra Console/Network: không lỗi import, 404 hoặc MIME.
- Mở site dưới `/ten-repo/`; link và asset phải dùng đường dẫn tương đối.
- Kiểm tra responsive ở 360, 768 và 1366 px.
- Dùng bàn phím để đi qua input/nút và mở/đóng menu.

## Khi thay đổi business

- Tách fixture kiểm thử khỏi snapshot thật.
- Cố định `now` khi test deadline và filter.
- Bao phủ: timezone, nhiều round, date-only/TBA/Estimated, OR trong nhóm,
  AND giữa nhóm, URL history, 0/1/12/13 kết quả, storage hỏng và ID không còn.
- Ghi `input`, `expected`, `actual`, browser, commit và reviewer trong test report
  hoặc hệ thống theo dõi task.

## Phạm vi kết luận

Syntax/import/HTTP chỉ xác nhận bộ khung chạy được. Không dùng kết quả đó để khẳng
định browser interaction hoặc nghiệm thu chức năng hoàn chỉnh.
