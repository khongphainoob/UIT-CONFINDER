"""Chạy từ bất kỳ thư mục nào: python tools/serve.py"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import socket
import sys

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def find_available_port(start_port=5500, max_tries=10):
    for port in range(start_port, start_port + max_tries):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(('127.0.0.1', port)) != 0:
                return port
    return start_port

class NoCacheHandler(SimpleHTTPRequestHandler):
    """Máy chủ dev: trình duyệt không bao giờ dùng file cũ.

    Chỉ "no-cache" là chưa đủ: file đã vào cache TRƯỚC khi có header vẫn bị Chrome dùng lại
    mà không hỏi server, nên trang trộn file mới với file cũ và vỡ, ví dụ:
    - routes.js cũ thiếu ROUTES.match làm link "Gợi ý AI" thành .../undefined (404)
    - explore-state.js cũ thiếu countByPlace làm conference-list.js báo SyntaxError
    Cách xử lý:
    - mọi file: no-store (không lưu vào cache nữa)
    - trang HTML: Clear-Site-Data "cache" để Chrome xóa luôn cache cũ của origin này
      trước khi tải JS/CSS của trang. Chỉ dùng cho máy chủ dev; GitHub Pages không bị ảnh hưởng.
    """

    def end_headers(self) -> None:
        self.send_header('Cache-Control', 'no-store')
        if self.path.split('?', 1)[0].endswith(('.html', '/')):
            self.send_header('Clear-Site-Data', '"cache"')
        super().end_headers()


site = Path(__file__).resolve().parents[1] / 'site'
handler = partial(NoCacheHandler, directory=str(site))

port = find_available_port(5500)
ThreadingHTTPServer.allow_reuse_address = False

try:
    server = ThreadingHTTPServer(('127.0.0.1', port), handler)
except OSError:
    port = find_available_port(port + 1)
    server = ThreadingHTTPServer(('127.0.0.1', port), handler)

if port != 5500:
    print(f'Luu y: Cong 5500 dang duoc dung boi ung dung khac (nhu VS Code Live Server).')
print(f'UIT ConFinder: http://127.0.0.1:{port} - Ctrl+C to stop', flush=True)

try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
