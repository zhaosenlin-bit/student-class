#!/usr/bin/env node
/*
 * 给每门课件的启动脚本加上「已经在跑就直接打开」这件事。
 *
 * 从前双击「启动课件.cmd」，每次都会新起一个服务，哪怕这门课刚才已经
 * 在这个电脑上开着——于是地址栏里多一个标签，任务栏里多一个进程。
 *
 * 现在脚本先问一句：这个地址上是不是已经有同一门课在应答？有，就把浏览器
 * 指过去，脚本自己退出；没有，才真的起一个。
 *
 *   node tools/fix-course-launchers.mjs --root dist
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const SITE = path.resolve(ROOT, arg('root', 'dist'));

const SERVE_MJS = `#!/usr/bin/env node
/*
 * A tiny local server for a course that was taken away from the library.
 *
 * A course whose code is written as modules cannot be opened straight
 * from the disk — the browser refuses to load a module from a file, for
 * the same reason it refuses to let one page read another.  This server
 * hands the folder out over the local address instead, which the
 * browser is always allowed to read, and opens the course there.
 *
 * If this course is already being served on this machine, that one is
 * used: the browser is pointed at it and nothing is started twice.
 *
 *   node serve.mjs [folder] [page]
 */
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/*
 * 有时候两个参数会被并成一个。
 *
 * Windows 上把目录当成参数传过去，路径末尾那个斜杠会把后面的引号吃掉，
 * 于是「目录」和「网页名字」粘成一段。这种时候要认出来，拆开。
 *
 * 网页名字里没有空格，目录里可能有，所以从最后往前找那个空格。
 */
function splitArgs(argv) {
  let folder = argv[0];
  let page = argv[1];
  if (page === undefined && folder && /\.html?$/i.test(folder)) {
    const at = folder.lastIndexOf(' ');
    if (at > 0) {
      page = folder.slice(at + 1);
      folder = folder.slice(0, at);
    }
  }
  return { folder, page };
}

const args = splitArgs(process.argv.slice(2));
const root = path.resolve(args.folder || path.join(here, '..'));

/* 入口页：打包之后 index.html 会换成课件自己的名字，文件夹里那个 html 就是。 */
function entryPage() {
  try {
    const html = fs.readdirSync(root).find((f) => f.toLowerCase().endsWith('.html'));
    if (html) return html;
  } catch {
    /* 读不到就按 index.html 算。 */
  }
  return 'index.html';
}

const page = args.page || entryPage();

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.mp4': 'video/mp4',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.glb': 'model/gltf-binary',
  '.txt': 'text/plain; charset=utf-8',
};

/* 这个服务是谁，用一个头说明白；认出自己就不用再起一个。 */
const OWNER = encodeURIComponent(root);

const server = http.createServer((req, res) => {
  let rel = decodeURIComponent((req.url || '/').split('?')[0]);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.join(root, rel);
  if (!file.startsWith(root)) {
    res.writeHead(403).end('forbidden');
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'X-LQ-Root': OWNER,
    });
    res.end(data);
  });
});

const open = (url) => {
  const cmd =
    process.platform === 'win32'
      ? ['cmd', ['/c', 'start', '', url]]
      : process.platform === 'darwin'
        ? ['open', [url]]
        : ['xdg-open', [url]];
  try {
    spawn(cmd[0], cmd[1], { detached: true, stdio: 'ignore' }).unref();
  } catch {
    /* The address is printed, so the reader can open it by hand. */
  }
};

/* 这个端口上是不是已经有这门课在应答？ */
async function alreadyServing(port) {
  try {
    const r = await fetch(address(port), { signal: AbortSignal.timeout(1500) });
    if (!r.ok) return false;
    /* 同一个根目录才是同一门课。 */
    return r.headers.get('x-lq-root') === OWNER;
  } catch {
    return false;
  }
}

/* 这个端口上是不是已经有东西了？ */
function taken(port) {
  return new Promise((resolve) => {
    const s = net.connect({ port, host: '127.0.0.1' });
    const done = (yes) => {
      s.destroy();
      resolve(yes);
    };
    s.setTimeout(800);
    s.on('connect', () => done(true));
    s.on('timeout', () => done(false));
    s.on('error', () => done(false));
  });
}

const address = (p) => \`http://127.0.0.1:\${p}/\${encodeURIComponent(page)}\`;

/* 先问一圈：有没有人已经在跑这门课。 */
for (let p = 8731; p <= 8760; p++) {
  if (await alreadyServing(p)) {
    console.log(\`课件已经在运行：\${address(p)}\`);
    open(address(p));
    process.exit(0);
  }
}

/* 找一个没人占的端口。Windows 上直接 listen 一个被占的端口会「成功」，
   结果两个服务抢同一个地址，浏览器一会儿拿到这个一会儿拿到那个。 */
let port = 0;
for (let p = 8731; p <= 8760; p++) {
  if (!(await taken(p))) {
    port = p;
    break;
  }
}
if (!port) {
  console.log('没有找到空闲的端口。');
  process.exit(1);
}

server.listen(port, '127.0.0.1', () => {
  const url = address(port);
  console.log(\`课件已启动：\${url}\`);
  console.log('关闭这个窗口即可结束。');
  open(url);
});
server.on('error', (e) => {
  console.log('这个端口起不来：' + e.message);
  process.exit(1);
});
`;

const SERVE_PY = `#!/usr/bin/env python3
# A tiny local server for a course that was taken away from the library.
#
# The same job as serve.mjs, for the machines that have Python but no
# Node.  Only the standard library is used.
#
# If this course is already being served on this machine, that one is
# used: the browser is pointed at it and nothing is started twice.
#
#   python serve.py [folder] [page]
import http.server
import os
import socket
import sys
import threading
import urllib.parse
import urllib.request
import webbrowser

HERE = os.path.dirname(os.path.abspath(__file__))


def split_args(argv):
    """有时候两个参数会被并成一个。

    Windows 上把目录当成参数传过去，路径末尾那个斜杠会把后面的引号吃掉，
    于是「目录」和「网页名字」粘成一段。这种时候要认出来，拆开。

    网页名字里没有空格，目录里可能有，所以从最后往前找那个空格。
    """
    folder = argv[0] if argv else None
    page = argv[1] if len(argv) > 1 else None
    if page is None and folder and folder.lower().endswith((".html", ".htm")):
        at = folder.rfind(" ")
        if at > 0:
            page = folder[at + 1:]
            folder = folder[:at]
    return folder, page


FOLDER, PAGE_ARG = split_args(sys.argv[1:])
ROOT = os.path.abspath(FOLDER) if FOLDER else os.path.abspath(os.path.join(HERE, ".."))


def entry_page():
    """入口页：打包之后 index.html 会换成课件自己的名字。"""
    try:
        for name in sorted(os.listdir(ROOT)):
            if name.lower().endswith(".html"):
                return name
    except OSError:
        pass
    return "index.html"


PAGE = PAGE_ARG or entry_page()

# 这个服务是谁，用一个头说明白；认出自己就不用再起一个。
OWNER = urllib.parse.quote(ROOT, safe="")

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
    ".txt": "text/plain; charset=utf-8",
}


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def guess_type(self, path):
        ext = os.path.splitext(path)[1].lower()
        return TYPES.get(ext, super().guess_type(path))

    def end_headers(self):
        # 这个服务是谁，用一个头说明白；认出自己就不用再起一个。
        self.send_header("X-LQ-Root", OWNER)
        super().end_headers()

    def log_message(self, *args):
        pass


def address(port):
    return "http://127.0.0.1:%d/%s" % (port, PAGE)


def already_serving(port):
    """这个地址上是不是已经有这门课在应答？"""
    try:
        with urllib.request.urlopen(address(port), timeout=1.5) as r:
            # 同一个根目录才是同一门课。
            return r.status == 200 and r.headers.get("X-LQ-Root") == OWNER
    except Exception:
        return False


def free_port(start):
    """找一个没人占的端口。"""
    for port in range(start, start + 30):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(("127.0.0.1", port)) != 0:
                return port
    return None


# 先问一圈：有没有人已经在跑这门课。
for probe in range(8731, 8761):
    if already_serving(probe):
        print("课件已经在运行：%s" % address(probe))
        webbrowser.open(address(probe))
        sys.exit(0)

port = free_port(8731)
if port is None:
    print("没有找到空闲的端口。")
    sys.exit(1)

url = address(port)
server = http.server.ThreadingHTTPServer(("127.0.0.1", port), Handler)
print("课件已启动：%s" % url)
print("关闭这个窗口即可结束。")
threading.Timer(0.6, lambda: webbrowser.open(url)).start()
server.serve_forever()
`;

let written = 0;
let skipped = 0;

function write(file, content) {
  const old = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (old === content) {
    skipped++;
    return;
  }
  fs.writeFileSync(file, content, 'utf8');
  written++;
}

/*
 * Windows 的启动脚本里，目录是这么传的：
 *
 *     node "%~dp0serve.mjs" "%~dp0" "某某.html"
 *
 * 第二个参数末尾那个斜杠，会把紧跟着的引号吃掉——Windows 把这一段当成
 * 一个引号里的内容，目录和网页名字就粘成了一段。脚本于是找错了根目录，
 * 双击打开的是一个「文件不存在」的页。
 *
 * 末尾补一个点就没事了：路径还是那个路径，可是不再以斜杠结尾。
 */
function fixCmd(file) {
  const old = fs.readFileSync(file, 'utf8');
  const content = old.replace(/"%~dp0"(?=\s)/g, '"%~dp0."');
  write(file, content);
}

const courseDir = path.join(SITE, 'courseware');
if (fs.existsSync(courseDir)) {
  for (const e of fs.readdirSync(courseDir, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const dir = path.join(courseDir, e.name);
    if (fs.existsSync(path.join(dir, 'serve.mjs'))) {
      write(path.join(dir, 'serve.mjs'), SERVE_MJS);
    }
    if (fs.existsSync(path.join(dir, 'serve.py'))) {
      write(path.join(dir, 'serve.py'), SERVE_PY);
    }
    const cmd = path.join(dir, '启动课件.cmd');
    if (fs.existsSync(cmd)) fixCmd(cmd);
  }
}

/* 共用的那份也换掉：课件自己的 serve.py 就是从它复制的。 */
const sharedPy = path.join(SITE, 'shared', 'serve.py');
if (fs.existsSync(sharedPy)) write(sharedPy, SERVE_PY);

console.log(`启动脚本：改了 ${written} 个 · 原本就是新的 ${skipped} 个`);
