#!/usr/bin/env python3
# A tiny local server for a course that was taken away from the library.
#
# The same job as serve.mjs, for the machines that have Python but no
# Node.  Only the standard library is used.
#
#   python serve.py [folder] [page]
import http.server
import os
import socket
import sys
import threading
import webbrowser

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.abspath(
    os.path.join(HERE, "..")
)
PAGE = sys.argv[2] if len(sys.argv) > 2 else "index.html"

TYPES = {
    ".html": "text/html; charset=utf-8",
    ".htm": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".mp4": "video/mp4",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".glb": "model/gltf-binary",
    ".gltf": "model/gltf+json",
    ".txt": "text/plain; charset=utf-8",
}


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def guess_type(self, path):
        ext = os.path.splitext(path)[1].lower()
        return TYPES.get(ext, super().guess_type(path))

    def log_message(self, *args):
        pass


def free_port(start):
    for port in range(start, start + 30):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(("127.0.0.1", port)) != 0:
                return port
    return None


port = free_port(8731)
if port is None:
    print("没有找到空闲的端口。")
    sys.exit(1)

url = "http://127.0.0.1:%d/%s" % (port, PAGE)
server = http.server.ThreadingHTTPServer(("127.0.0.1", port), Handler)
print("课件已启动：%s" % url)
print("关闭这个窗口即可结束。")
threading.Timer(0.6, lambda: webbrowser.open(url)).start()
server.serve_forever()
