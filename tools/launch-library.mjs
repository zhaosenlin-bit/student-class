#!/usr/bin/env node
/*
 * 双击启动乐启享课件库的本地预览。
 *
 * 已经在跑，就把浏览器直接打开过去；没有在跑，就把它叫起来，等它真的
 * 能应答了，再把浏览器打开过去。两种情况都用同一个地址，不给人添乱。
 *
 *   node tools/launch-library.mjs            启动（或者直接打开已有的）
 *   node tools/launch-library.mjs --stop     把本地预览关掉
 *   node tools/launch-library.mjs --port 4190 换一个端口
 */
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const args = process.argv.slice(2);
const arg = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const has = (n) => args.includes(`--${n}`);

const PORT = Number(arg('port', 4180));
const LAST_PORT = PORT + 10;
const SITE = path.resolve(ROOT, arg('root', path.join(ROOT, 'dist')));
const OPEN = !has('no-open');
let URL = `http://127.0.0.1:${PORT}/`;
const PID_FILE = path.join(os.tmpdir(), 'leqixiang-local-preview.pid');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function openBrowser(url) {
  const cmd =
    process.platform === 'win32'
      ? ['cmd', ['/c', 'start', '', url]]
      : process.platform === 'darwin'
        ? ['open', [url]]
        : ['xdg-open', [url]];
  try {
    spawn(cmd[0], cmd[1], { detached: true, stdio: 'ignore' }).unref();
  } catch {
    /* 地址已经打印出来了，人自己敲进去也行。 */
  }
}

/*
 * 看看这个地址上是不是已经有一个课件库在应答。
 *
 * 只看端口通不通是不够的——别的程序也可能占着这个端口。要确认拿到的是
 * 课件库自己的首页，才算是「已经在跑」。
 *
 * 探的是首页而不是目录清单：清单有一兆多，传一遍太慢，慢到会以为
 * 没人应答。
 */
async function probe(port) {
  try {
    const r = await fetch(`http://127.0.0.1:${port}/index.html`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    });
    if (!r.ok) return false;
    /* 服务会报出自己的根目录；对得上就是同一个课件库。 */
    return r.headers.get('x-lq-root') === encodeURIComponent(SITE);
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

async function stop() {
  let pid = 0;
  let port = 0;
  try {
    const parts = fs.readFileSync(PID_FILE, 'utf8').trim().split(/\s+/);
    pid = Number(parts[0]);
    port = Number(parts[1]);
  } catch {
    pid = 0;
  }
  if (pid) {
    try {
      process.kill(pid);
      console.log(`本地预览已停止（进程 ${pid}${port ? ` · 端口 ${port}` : ''}）。`);
    } catch {
      console.log('本地预览已经不在运行了。');
    }
    try {
      fs.unlinkSync(PID_FILE);
    } catch {
      /* 记录本来就不在了，无所谓。 */
    }
    return;
  }
  console.log('没有记着本地预览的进程号。');
}

async function main() {
  if (has('stop')) {
    await stop();
    return;
  }

  if (!fs.existsSync(path.join(SITE, 'catalog.json'))) {
    console.error(`这个地址上还没有课件库：${SITE}`);
    console.error('先把成品导出来（node tools/export-static.mjs），再双击启动。');
    process.exitCode = 1;
    return;
  }

  /* ---- 已经在跑？直接打开就好 ---- */
  for (let p = PORT; p <= LAST_PORT; p++) {
    if (await probe(p)) {
      URL = `http://127.0.0.1:${p}/`;
      console.log(`课件库已经在运行：${URL}`);
      if (OPEN) openBrowser(URL);
      return;
    }
  }

  /* ---- 没在跑：叫起来，等它准备好 ---- */
  let port = 0;
  for (let p = PORT; p <= LAST_PORT; p++) {
    if (!(await taken(p))) {
      port = p;
      break;
    }
  }
  if (!port) {
    console.error(`${PORT}-${LAST_PORT} 这些端口都被别的程序占着了。`);
    console.error('换一个端口再试：node tools/launch-library.mjs --port 4200');
    process.exitCode = 1;
    return;
  }
  URL = `http://127.0.0.1:${port}/`;

  const server = path.join(HERE, 'static', 'serve-static.mjs');
  const child = spawn(process.execPath, [server, '--root', SITE, '--port', String(port)], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  child.unref();

  try {
    fs.writeFileSync(PID_FILE, `${child.pid} ${port}`, 'utf8');
  } catch {
    /* 记不住进程号也不影响用。 */
  }

  let gone = false;
  child.on('exit', () => {
    gone = true;
  });

  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    await sleep(300);
    if (await probe(port)) {
      console.log(`课件库已启动：${URL}`);
      if (OPEN) openBrowser(URL);
      console.log('要关掉它：node tools/launch-library.mjs --stop');
      return;
    }
    /* 端口被别的东西占着的时候，新起的这个会自己退掉。 */
    if (gone) break;
  }

  console.error('本地预览没有在规定的时间里准备好。');
  console.error(`自己看看这个地址：${URL}`);
  process.exitCode = 1;
}

await main();
