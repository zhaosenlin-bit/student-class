#!/usr/bin/env node
/*
 * 课件正文里引用的每一个本地文件，都问一次服务器。
 *
 * 之前只验过"课件页面打得开"和"下载得到"，可页面里写着的图片、
 * 样式表、脚本没人问过 —— 少一个文件，页面照样 200，图片却是裂的。
 *
 * 页面里的地址由两样东西决定：自己的 <base href>，以及 importmap 里
 * 写的模块名。两样都要算进去，否则会把"写对了的"报成缺失。
 *
 *   node tools/check-lq-course-assets.mjs
 *   node tools/check-lq-course-assets.mjs --only afe-10,phet-beers-law-lab
 */
import fs from 'node:fs';

const PORT = Number(process.env.LQ_PORT || 4173);
const BASE = `http://127.0.0.1:${PORT}`;

const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 && argv[at + 1] ? argv[at + 1] : fallback;
};
const ONLY = argOf('--only', '');
const CONC = Number(argOf('--conc', '12'));

/* 页面里写的地址。 */
const REF =
  /(?:src|poster|data-src|data-bg|xlink:href)\s*=\s*["']([^"'<>]{1,400})["']|<link[^>]+href\s*=\s*["']([^"'<>]{1,400})["']|url\(\s*["']?([^"'()\s]{1,400})["']?\s*\)|import\s+[^;]*?from\s+["']([^"']{1,400})["']/g;

/* 注释里的话不是引用。 */
const COMMENTS = /<!--[\s\S]*?-->|\/\*[\s\S]*?\*\//g;

/* 写在页面里当例子、或者本来就是占位符的地址，不算缺的文件。 */
const PLACEHOLDER = /^(blank|\/|\.\.\.|\/t\.gif|\/%%URL%%\/.*|\s*)$/i;

const isLocal = (u) => {
  if (!u) return false;
  if (/^(data:|blob:|javascript:|mailto:|tel:|#)/i.test(u)) return false;
  if (/^https?:\/\//i.test(u)) return false;
  if (/^\/\//.test(u)) return false;
  /* 运行时才拼出来的地址，不是文件。 */
  if (/[${}<>*]/.test(u)) return false;
  if (PLACEHOLDER.test(u.trim())) return false;
  return true;
};

/* 链接到另一门课件的地址，不是缺的文件，单独记。 */
const isPageLink = (u) => /^\/courseware\//.test(u) || /\.html($|\?)/.test(u);

/* 页面自己的 base 和 importmap 决定了相对地址和裸模块名指向哪里。 */
function contextOf(body) {
  const base = (body.match(/<base[^>]+href=["']([^"']+)/i) || [])[1] || '';
  let imports = {};
  const im = body.match(/<script[^>]*type=["']importmap["'][^>]*>([\s\S]*?)<\/script>/i);
  if (im) {
    try {
      imports = JSON.parse(im[1]).imports || {};
    } catch {}
  }
  return { base, imports };
}

/* 把页面里写的一个地址，变成服务器上真实的那条路径。 */
function resolveRef(u, ctx) {
  if (u.startsWith('/')) return u;
  /* 裸模块名（three、three/addons/…）由 importmap 决定。 */
  const keys = Object.keys(ctx.imports).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (u === k || u.startsWith(k)) {
      const target = ctx.imports[k];
      const mapped =
        target.endsWith('/') && u !== k ? target + u.slice(k.length) : target;
      /* importmap 里写的也可能是相对地址。 */
      return mapped.startsWith('/')
        ? mapped
        : new URL(mapped, new URL(ctx.base || '/', 'http://localhost/')).pathname;
    }
  }
  const base = ctx.base || '/';
  try {
    return new URL(u, new URL(base, 'http://localhost/')).pathname;
  } catch {
    return u;
  }
}

async function pool(items, size, worker) {
  const out = new Array(items.length);
  let next = 0;
  const runners = [];
  for (let i = 0; i < Math.min(size, items.length); i++) {
    runners.push(
      (async () => {
        while (next < items.length) {
          const i = next++;
          out[i] = await worker(items[i], i);
        }
      })()
    );
  }
  await Promise.all(runners);
  return out;
}

const catalogue = await (await fetch(BASE + '/api/catalog')).json();
let ids = catalogue.products.map((p) => p.id);
if (ONLY) {
  const wanted = new Set(ONLY.split(',').map((s) => s.trim()).filter(Boolean));
  ids = ids.filter((id) => wanted.has(id));
}
console.log(`乐启享课件库 · 正文素材检查：${ids.length} 门（并发 ${CONC}）`);

const started = Date.now();
const pages = await pool(ids, CONC, async (id) => {
  let body = '';
  try {
    const res = await fetch(`${BASE}/courseware/${encodeURIComponent(id)}?local=1`);
    body = await res.text();
    if (!res.ok) return { id, refs: [], note: `页面 ${res.status}` };
  } catch (e) {
    return { id, refs: [], note: `页面失败 ${e.message}` };
  }
  const ctx = contextOf(body);
  /* importmap 里写的是模块名，不是浏览器去要的地址。 */
  const scan = body.replace(
    /<script[^>]*type=["']importmap["'][^>]*>[\s\S]*?<\/script>/gi,
    ''
  );
  const refs = new Set();
  for (const m of scan.replace(COMMENTS, ' ').matchAll(REF)) {
    const u = m[1] || m[2] || m[3] || m[4];
    if (isLocal(u)) refs.add(resolveRef(u.trim(), ctx));
  }
  return { id, refs: [...refs] };
});

/* 所有课件引到的本地地址合并起来，一个一个问，问一次就够。 */
const all = new Map();
for (const p of pages) for (const u of p.refs) {
  if (!all.has(u)) all.set(u, []);
  all.get(u).push(p.id);
}
console.log(`页面引用了 ${all.size} 个不同的本地地址，开始逐个问服务器……`);

const urls = [...all.keys()];
const dead = [];
const deadLinks = [];
let alive = 0;
await pool(urls, CONC, async (u) => {
  const target = BASE + u;
  try {
    const res = await fetch(target, { method: 'GET', redirect: 'follow' });
    if (!res.ok) {
      (isPageLink(u) ? deadLinks : dead).push({ u, status: res.status, ids: all.get(u) });
      await res.arrayBuffer();
      return;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length) dead.push({ u, status: '空文件', ids: all.get(u) });
    else alive++;
  } catch (e) {
    (isPageLink(u) ? deadLinks : dead).push({ u, status: e.message, ids: all.get(u) });
  }
});

const byCourse = new Map();
for (const d of dead) for (const id of d.ids) {
  if (!byCourse.has(id)) byCourse.set(id, []);
  byCourse.get(id).push(d);
}

const elapsed = ((Date.now() - started) / 1000).toFixed(1);
console.log('');
console.log(`能取回：${alive}   取不回：${dead.length}   受影响的课件：${byCourse.size}`);
if (dead.length) {
  const byFile = new Map();
  for (const d of dead) byFile.set(d.u, (byFile.get(d.u) || 0) + d.ids.length);
  console.log('\n--- 同一个文件被多少门课件共用');
  for (const [u, n] of [...byFile].sort((a, b) => b[1] - a[1]).slice(0, 20)) {
    console.log(`   ${String(n).padStart(4)} 门  ${u}`);
  }
  console.log('\n--- 受影响的课件（前 40 门）');
  for (const [id, list] of [...byCourse].slice(0, 40)) {
    console.log(`   ! ${id}  缺 ${list.length} 个：${list.slice(0, 3).map((d) => d.u).join('  ')}`);
  }
}
if (deadLinks.length) {
  console.log('\n--- 指向别的课件页面的失效链接（前 20 条）');
  for (const d of deadLinks.slice(0, 20)) {
    console.log(`   ! ${d.u}  (${d.status})  出现在 ${d.ids.slice(0, 4).join(' ')}`);
  }
}
console.log(`\n用时 ${elapsed}s。`);

if (process.env.LQ_REPORT) {
  fs.writeFileSync(
    process.env.LQ_REPORT,
    JSON.stringify({ checkedAt: new Date().toISOString(), alive, dead, byCourse: [...byCourse] }, null, 1)
  );
  console.log(`报告写入 ${process.env.LQ_REPORT}`);
}

process.exit(dead.length ? 1 : 0);
