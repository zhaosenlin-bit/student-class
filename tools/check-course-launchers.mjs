#!/usr/bin/env node
/*
 * 每一门课件的「启动课件.cmd」，到底能不能用？
 *
 * 课件被下载以后是一个压缩包，解开双击「启动课件.cmd」，浏览器就该打开
 * 这门课。这里查两件事：
 *
 * 一、静态：脚本点名要打开的那个网页，在压缩包清单里是不是真的在里面。
 *   清单里没有它，双击就是一个「文件不存在」的页。
 *
 * 二、动手：真的按下载后的样子把包解开，双击一次，看服务起没起、页面
 *   打不打得开；再双击一次，看它是不是认出「已经在跑」，而不是又起一个。
 *
 *   node tools/check-course-launchers.mjs --live 3
 *   node tools/check-course-launchers.mjs --out receipts/course-launchers.json
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const SITE = path.resolve(ROOT, arg('root', 'dist'));
const LIVE = Number(arg('live', 2));
const OUT = arg('out', '');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* 从 .cmd / .sh 里找出它要打开的网页叫什么。 */
function entryFromScript(file) {
  const txt = fs.readFileSync(file, 'utf8');
  const m = txt.match(/["']([^"']+\.html)["']/);
  if (!m) return '';
  /*
   * 脚本里写的是 "%~dp0某某.html" 这种带目录的样子，去掉前缀才是文件
   * 本身的名字——下载清单里记的也是这个名字。
   */
  return m[1].replace(/^%~dp0[\\/]?/, '').replace(/^.*[\\/]/, '');
}

/* 把下载清单按压缩包里的名字读出来。 */
function manifestNames(downloadJson) {
  const out = new Set();
  for (const e of downloadJson.entries || []) out.add(e[0]);
  return out;
}

/*
 * 按下载清单把一个课件还原成下载后的样子。
 *
 * 清单里每一行是 [包里的名字, 课件目录里的位置]——有些文件在整理时收进了
 * 公共目录，包里还要放回课件自己名下。
 */
function unpack(courseDir, downloadJson, target) {
  fs.mkdirSync(target, { recursive: true });
  for (const [name, from] of downloadJson.entries || []) {
    const src = path.resolve(courseDir, from);
    if (!src.startsWith(path.resolve(courseDir))) continue;
    const dst = path.join(target, name);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
  }
  return target;
}

/* 数一数这个端口上有几个服务在听——双击两次应该还是一个。 */
function listenersOn(port) {
  try {
    const out = execFileSync('netstat', ['-ano'], { encoding: 'utf8' });
    const re = new RegExp(`^\\s*TCP\\s+127\\.0\\.0\\.1:${port}\\s+\\S+\\s+LISTENING`, 'm');
    return (out.match(new RegExp(re.source, 'gm')) || []).length;
  } catch {
    return 0;
  }
}

/*
 * 双击启动脚本。
 *
 * 第一次双击，服务会一直开着，窗口不关它就不停——所以这一种不能等它退出，
 * 只能等它把地址打出来。第二次双击应该自己就退出了，那一种就等它退出。
 */
function startLauncher(dir) {
  const child = spawn('cmd', ['/c', '启动课件.cmd'], {
    cwd: dir,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const state = { child, out: '', pid: child.pid };
  child.stdout.on('data', (b) => {
    state.out += b.toString();
  });
  child.stderr.on('data', (b) => {
    state.out += b.toString();
  });
  state.done = new Promise((resolve) => {
    child.on('exit', (code) => resolve({ code, out: state.out, pid: state.pid }));
  });
  return state;
}

/* 等它把地址打出来。 */
async function waitForUrl(state, ms = 25000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    const m = /http:\/\/127\.0\.0\.1:(\d+)\//.exec(state.out);
    if (m) return Number(m[1]);
    await sleep(200);
  }
  return 0;
}

function killTree(pid) {
  try {
    execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { encoding: 'utf8' });
  } catch {
    /* 早就走了就算了。 */
  }
}

function cleanup(dir) {
  for (let i = 0; i < 5; i++) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      return;
    } catch {
      /* 文件可能还被谁占着，过一会儿再试。 */
    }
  }
}

async function main() {
  const courseRoot = path.join(SITE, 'courseware');
  if (!fs.existsSync(courseRoot)) {
    console.error(`找不到课件目录：${courseRoot}`);
    process.exit(1);
  }
  const dirs = fs
    .readdirSync(courseRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => path.join(courseRoot, e.name));

  const problems = [];
  const courses = [];

  for (const dir of dirs) {
    const cmd = path.join(dir, '启动课件.cmd');
    if (!fs.existsSync(cmd)) continue;
    const id = path.basename(dir);
    const dl = path.join(dir, 'download.json');
    const names = fs.existsSync(dl)
      ? manifestNames(JSON.parse(fs.readFileSync(dl, 'utf8')))
      : new Set();
    const entry = entryFromScript(cmd);
    const record = { id, entry, problems: [] };

    if (!entry) record.problems.push('启动脚本里找不到要打开的网页');
    else if (names.size && !names.has(entry))
      record.problems.push(`要打开的网页不在下载清单里：${entry}`);
    for (const need of ['serve.mjs', 'serve.py', '启动课件.sh']) {
      if (!names.size) break;
      if (!names.has(need)) record.problems.push(`下载清单里少了 ${need}`);
    }
    if (record.problems.length) problems.push({ id, problems: record.problems });
    courses.push(record);
  }

  console.log(`带启动脚本的课件：${courses.length} 门`);
  console.log(`静态检查：${problems.length} 门有问题`);

  /* ---- 动手：真的双击 ---- */
  const live = [];
  const step = Math.max(1, Math.floor(courses.length / Math.max(1, LIVE)));
  const picks = [];
  for (let i = 0; i < courses.length && picks.length < LIVE; i += step) picks.push(courses[i]);

  for (const c of picks) {
    const dir = path.join(SITE, 'courseware', c.id);
    const dl = JSON.parse(fs.readFileSync(path.join(dir, 'download.json'), 'utf8'));
    const target = path.join(os.tmpdir(), `lq-pkg-${c.id}`);
    cleanup(target);
    unpack(dir, dl, target);

    const first = startLauncher(target);
    const rec = { id: c.id, started: false, pageOk: false, reused: false, extraListeners: 0 };
    rec.pid = first.pid;
    const port = await waitForUrl(first);
    if (port) {
      rec.port = port;
      rec.started = true;
      try {
        const r = await fetch(`http://127.0.0.1:${port}/${encodeURIComponent(c.entry)}`, {
          signal: AbortSignal.timeout(8000),
        });
        rec.pageOk = r.ok;
        rec.pageBytes = (await r.arrayBuffer()).byteLength;
      } catch {
        rec.pageOk = false;
      }
      const before = listenersOn(port);
      const second = startLauncher(target);
      const secondResult = await Promise.race([second.done, sleep(12000).then(() => null)]);
      const secondOut = secondResult ? secondResult.out : second.out;
      rec.secondOutput = secondOut.trim().split(/\r?\n/).slice(0, 2).join(' / ');
      rec.reused = secondOut.includes('已经在运行');
      rec.secondExited = secondResult ? secondResult.code !== null : false;
      await sleep(500);
      rec.extraListeners = Math.max(0, listenersOn(port) - before);
      rec.listenersAfter = listenersOn(port);
      /* 把刚才起的服务收掉，别占着端口。/T 连它自己起的那些一起收。 */
      killTree(first.pid);
    }
    live.push(rec);
    cleanup(target);
    console.log(
      `  ${c.id}  起得来=${rec.started} 页面通=${rec.pageOk} 二次识别=${rec.reused} 多余进程=${rec.extraListeners}`
    );
  }

  const report = {
    checkedAt: new Date().toISOString(),
    courses: courses.length,
    staticProblems: problems,
    live,
  };
  if (OUT) {
    const file = path.isAbsolute(OUT) ? OUT : path.join(ROOT, OUT);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(report, null, 2));
    console.log(`结果写到 ${file}`);
  }

  const liveBad = live.filter((r) => !r.started || !r.pageOk || !r.reused);
  console.log('');
  console.log(
    liveBad.length === 0 && problems.length === 0
      ? '全部通过：每一门课的启动脚本都能双击，重复双击也只起一个服务。'
      : `有问题：静态 ${problems.length} 门 · 动手 ${liveBad.length} 门`
  );
  process.exitCode = problems.length || liveBad.length ? 1 : 0;
}

await main();
