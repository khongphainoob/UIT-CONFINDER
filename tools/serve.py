"""Chạy từ bất kỳ thư mục nào: python tools/serve.py"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

site = Path(__file__).resolve().parents[1] / 'site'
handler = partial(SimpleHTTPRequestHandler, directory=str(site))
server = ThreadingHTTPServer(('127.0.0.1', 5500), handler)
print('UIT ConFinder: http://127.0.0.1:5500 — Ctrl+C để dừng', flush=True)
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
