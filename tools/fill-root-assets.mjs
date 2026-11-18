#!/usr/bin/env node
/*
 * 把镜像页面用"站点根目录"要的那些文件取回来。
 *
 * 有些页面是在脚本里现拼地址的，页面的文字里根本看不见那个地址，
 * 所以静态地找是找不到的。等页面在浏览器里打开过一遍，就知道它到底
 * 问了哪些文件 —— 那份记录在体检报告里。
 *
 * 这个工具读那份记录，把每一个"要不到的文件"照着它本来的样子取回来：
 * 原来在站点根目录的，就放在那个站点名下的同一个位置；原来指着别的
 * 站点的图片，也照原样收进来，好让页面改指到本地。
 *
 *   node tools/fill-root-assets.mjs --report recon/scratch/lq-ext-pages4.json
 *   node tools/fill-root-assets.mjs --report … --apply
 */
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 && argv[at + 1] ? argv[at + 1] : fallback;
};
const APPLY = argv.includes('--apply');
const REPORT = argOf('--report', 'recon/scratch/lq-ext-pages.json');
const PORT = Number(process.env.LQ_PORT || 4173);
const SHARED = 'mirror/leqixiang/_shared-ext';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/*
 * 统计用的计数器不收 —— 收回来也只是把别人的计数放在本机。
 */
const NOT_WANTED = [
  'amazingcounters.com',
  'clemson.edu/cgi-bin/Count.cgi',
  'hit-counter',
  'counter.php',
  'cookie-consent.js'
];
const unwanted = (host, rel) =>
  NOT_WANTED.some((w) => host.includes(w) || rel.includes(w));

/* 一个地址在那个站点上大概是怎么写的。 */
function upstreamForms(host, rel) {
  const forms = [];
  const push = (v) => {
    const clean = v.split('#')[0].split('?')[0].replace(/^\/+/, '');
    if (!clean || forms.includes(clean)) return;
    forms.push(clean);
  };
  push(rel);
  /*
   * The script of some sites puts the name of the site in front of the
   * address: "/mathsisfun/images/style/menu.svg".  That name is one of
   * the parts of the host, so it can be taken off.
   */
  const labels = host.toLowerCase().split('.');
  const parts = rel.replace(/^\/+/, '').split('/');
  for (let k = parts.length - 1; k >= 1; k--) {
    if (parts.slice(0, k).join('.').toLowerCase() === host.toLowerCase()) {
      push(parts.slice(k).join('/'));
      break;
    }
  }
  const first = parts[0].toLowerCase();
  if (first && labels.includes(first)) {
    push(parts.slice(1).join('/'));
  }
  /*
   * A page that was saved with its pictures sometimes names the folder
   * twice, or names it with the number the site gave it and the number
   * it kept for itself.  Both are tried.
   */
  if (/_files2\//.test(rel)) push(rel.replace(/_files2\//g, '_files/'));
  const doubled = /(^|\/)([a-z0-9_-]+)\/\2\//i.exec(rel);
  if (doubled) {
    push(rel.replace(doubled[0], `${doubled[1]}${doubled[2]}/`));
  }
  return forms;
}

async function grab(url, referer) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(20000),
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        Referer: referer,
        Accept: '*/*'
      },
      redirect: 'follow'
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf && buf.length ? buf : null;
  } catch {
    return null;
  }
}

function store(host, rel, buf) {
  const file = path.join(SHARED, host, rel);
  if (APPLY) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, buf);
  }
  return file;
}

/*
 * A style sheet names the files it uses — the fonts it draws with.  Those
 * are taken as well, so the page keeps its own look after the sheet is
 * handed over from here.
 */
async function fillStyleRefs(host, rel, buf) {
  if (!/\.css$/i.test(rel)) return;
  const text = buf.toString('utf8');
  const dir = path.posix.dirname('/' + rel);
  for (const m of text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
    const ref = m[1].trim();
    if (!ref || /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(ref) || ref.startsWith('data:')) continue;
    const local = ref.startsWith('/')
      ? ref.replace(/^\/+/, '')
      : path.posix.normalize(path.posix.join(dir, ref)).replace(/^\/+/, '');
    if (!local || local.includes('..')) continue;
    const target = path.join(SHARED, host, local);
    if (fs.existsSync(target)) continue;
    const url = `https://${host}/${local.split('/').map(encodeURIComponent).join('/')}`;
    const buf2 = await grab(url, `https://${host}/${rel}`);
    if (!buf2) continue;
    store(host, local, buf2);
    console.log(`  + ${host}/${local}  ${(buf2.length / 1024).toFixed(1)}KB`);
    await sleep(40);
  }
}

let report;
try {
  report = JSON.parse(fs.readFileSync(REPORT, 'utf8'));
} catch {
  console.log(`读不到报告 ${REPORT}`);
  process.exit(1);
}

const results = Array.isArray(report) ? report : report.results || [];

/*
 * 收集两样东西：
 *   1. 页面用站点根目录要的文件（要不到的那些）；
 *   2. 页面指着别家站点的图片。
 */
const wants = new Map();
for (const r of results) {
  const host = r.host;
  if (!host) continue;
  for (const f of r.failed || []) {
    const url = f.url || '';
    if (!url.startsWith(`http://localhost:${PORT}/`)) continue;
    const p = decodeURIComponent(url.slice(`http://localhost:${PORT}/`.length));
    /*
     * A file of a mirrored page that is not on this machine.  The name
     * says which site it belongs to.
     */
    const ext = /^api\/program-assets\/[^/]+\/_ext\/([^/]+)\/(.*)$/.exec(p);
    if (ext) {
      const key = ext[1] + '/' + ext[2];
      if (!wants.has(key)) wants.set(key, { host: ext[1], rel: ext[2], page: host, external: false });
      continue;
    }
    if (p.startsWith('api/') || p.startsWith('courseware/')) continue;
    const key = host + '/' + p;
    if (!wants.has(key)) wants.set(key, { host, rel: p, page: host, external: false });
  }
  for (const b of r.broken || []) {
    let u = b;
    if (u.startsWith(`http://localhost:${PORT}/`)) {
      const p = decodeURIComponent(u.slice(`http://localhost:${PORT}/`.length));
      const m = /^api\/program-assets\/[^/]+\/_ext\/([^/]+)\/(.*)$/.exec(p);
      if (!m) continue;
      const key = m[1] + '/' + m[2];
      if (!wants.has(key)) wants.set(key, { host: m[1], rel: m[2], page: host, external: false });
      continue;
    }
    let parsed;
    try {
      parsed = new URL(u);
    } catch {
      continue;
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') continue;
    const key = parsed.host + parsed.pathname.replace(/^\/+/, '');
    if (!wants.has(key))
      wants.set(key, {
        host: parsed.host,
        rel: parsed.pathname.replace(/^\/+/, ''),
        page: host,
        external: true
      });
  }
  /*
   * 内容策略挡下来的东西，地址写在它的话里。这些多半是字体和样式表，
   * 页面没有它们就不好看，所以也收回来。
   */
  for (const c of r.csp || []) {
    const m = /'((?:https?:)?\/\/[^']+)'/.exec(c);
    if (!m) continue;
    let u = m[1];
    if (u.startsWith('//')) u = 'https:' + u;
    let parsed;
    try {
      parsed = new URL(u);
    } catch {
      continue;
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') continue;
    const key = parsed.host + parsed.pathname.replace(/^\/+/, '');
    if (!wants.has(key))
      wants.set(key, {
        host: parsed.host,
        rel: parsed.pathname.replace(/^\/+/, ''),
        page: host,
        external: true
      });
  }
}

console.log(`报告里要不到的文件 ${wants.size} 个，开始照原样取回……`);

let got = 0;
let had = 0;
let gone = 0;
const missed = [];
for (const w of wants.values()) {
  if (unwanted(w.host, w.rel)) continue;
  const forms = upstreamForms(w.host, w.rel);
  const target = path.join(SHARED, w.host, forms[0] || w.rel);
  if (fs.existsSync(target)) {
    had++;
    continue;
  }
  let done = false;
  for (const form of forms) {
    const url = `https://${w.host}/${form.split('/').map(encodeURIComponent).join('/')}`;
    const buf = await grab(url, `https://${w.page}/`);
    if (!buf) continue;
    store(w.host, form, buf);
    console.log(`+ ${w.host}/${form}  ${(buf.length / 1024).toFixed(1)}KB`);
    await fillStyleRefs(w.host, form, buf);
    got++;
    done = true;
    break;
  }
  if (!done) {
    gone++;
    missed.push(`${w.host}/${w.rel}`);
  }
  await sleep(60);
}

console.log(`取回 ${got}，本来就有 ${had}，原站也没有 ${gone}`);
if (missed.length) {
  console.log('\n原站已经没有了：');
  for (const m of missed.slice(0, 40)) console.log('  ' + m);
  if (missed.length > 40) console.log(`  …… 还有 ${missed.length - 40} 个`);
}
if (!APPLY && got) console.log('\n加 --apply 可以把它们写进共享库。');
