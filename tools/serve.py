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

site = Path(__file__).resolve().parents[1] / 'site'
handler = partial(SimpleHTTPRequestHandler, directory=str(site))

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
