#!/usr/bin/env node
/*
 * 把一门课件里所有的页面（不止首页）引用到的本地文件都查一遍。
 *
 * 之前那套检查只看课件首页，于是章节页里那几张图漏掉了，浏览器里
 * 还是会裂。这里把该门课目录下所有 .html 都读一遍，按它自己的
 * <base href> 把相对地址还原成本地真实路径，再问一次服务器。
 *
 *   node tools/scan-course-missing.mjs afe-842
 *   node tools/scan-course-missing.mjs --all
 */
import fs from 'node:fs';
import path from 'node:path';

const PORT = Number(process.env.LQ_PORT || 4173);
const BASE = `http://127.0.0.1:${PORT}`;
const CW = 'mirror/leqixiang/courseware';

/*
 * 只认真标签里的属性。
 *
 * 早先的版本满页面找 "src=" ，结果把课件脚本里拼出来的地址也当成了
 * 缺文件：PhET 里那句 i.src="about:blank?" 会被算成 /blank ，还有
 * data-src="shared/screen/section.css" 这种只是留个记号的写法。
 * 现在改成先认出标签，再在标签里找属性，脚本里的话就不算了。
 */
const TAG = /<[a-zA-Z][^<>]*>/g;
const ATTR =
  /(?:src|poster|data-bg|data-image|xlink:href)\s*=\s*["']([^"'<>]{1,400})["']|<link[^>]+href\s*=\s*["']([^"'<>]{1,400})["']/g;
const STYLE_BLOCK = /<style[^>]*>([\s\S]*?)<\/style>/gi;
const STYLE_ATTR = /style\s*=\s*["']([^"']{1,4000})["']/gi;
const URLFN = /url\(\s*["']?([^"'()\s]{1,400})["']?\s*\)/g;
const COMMENTS = /<!--[\s\S]*?-->|\/\*[\s\S]*?\*\//g;
const PLACEHOLDER = /^(blank|\/|\.\.\.|\/t\.gif.*|\s*)$/i;

const isLocal = (u) => {
  if (!u) return false;
  /* 带协议头的都不是本地文件。 */
  if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return false;
  if (/^(data:|blob:|javascript:|mailto:|tel:|about:|#)/i.test(u)) return false;
  if (/^https?:\/\//i.test(u)) return false;
  if (/^\/\//.test(u)) return false;
  if (/[${}<>*]/.test(u)) return false;
  /* MathJax 那种地址是运行时填进去的占位写法。 */
  if (u.includes('%%URL%%')) return false;
  /* url(#n) 这种是页内锚点，不是文件。 */
  if (/^#/.test(u) || /^%23/i.test(u)) return false;
  if (PLACEHOLDER.test(u.trim())) return false;
  return true;
};

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

function resolveRef(u, ctx, pageUrl) {
  if (u.startsWith('/')) return u;
  const keys = Object.keys(ctx.imports).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (u === k || u.startsWith(k)) {
      const target = ctx.imports[k];
      const mapped =
        target.endsWith('/') && u !== k ? target + u.slice(k.length) : target;
      return mapped.startsWith('/')
        ? mapped
        : new URL(mapped, new URL(ctx.base || '/', 'http://localhost/')).pathname;
    }
  }
  /* 课件自己写的绝对地址，服务器是从本门课的目录里找的。 */
  const base = ctx.base || '/';
  try {
    /* 有 base 就按 base 算；没有就按这一页自己的地址算。 */
    const root = ctx.base
      ? new URL(base, 'http://localhost/')
      : new URL(pageUrl, 'http://localhost/');
    return new URL(u, root).pathname;
  } catch {
    return u;
  }
}

/* 课件目录：id.html 旁边有 id.assets/ 就用那个。 */
function assetsDirOf(id) {
  const dir = path.join(CW, `${id}.assets`);
  return fs.existsSync(dir) ? dir : null;
}

function pagesOf(id) {
  const out = [];
  const main = path.join(CW, `${id}.html`);
  if (fs.existsSync(main)) out.push(main);
  const dir = assetsDirOf(id);
  if (!dir) return out;
  const walk = (d) => {
    for (const name of fs.readdirSync(d)) {
      if (name === '_ext' || name.startsWith('_')) continue;
      const full = path.join(d, name);
      const st = fs.statSync(full);
      if (st.isDirectory()) walk(full);
      else if (/\.html?$/i.test(name)) out.push(full);
    }
  };
  walk(dir);
  return out;
}

const ids =
  process.argv.includes('--all')
    ? fs
        .readdirSync(CW)
        .filter((n) => n.endsWith('.html'))
        .map((n) => n.replace(/\.html$/, ''))
    : process.argv.slice(2).filter((a) => !a.startsWith('--'));

/* 先把所有课件引到的地址收齐，去掉重复的，再一起问服务器。 */
const wanted = new Map();
for (const id of ids) {
  const pages = pagesOf(id);
  if (!pages.length) continue;
  const seen = new Map();
  for (const file of pages) {
    let body;
    try {
      body = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const ctx = contextOf(body);
    const pageUrl = file.endsWith(`${path.sep}${id}.html`)
      ? `/courseware/${id}`
      : `/api/program-assets/${id}/` +
        path.relative(assetsDirOf(id), file).split(path.sep).join('/');
    const scan = body
      .replace(/<script[^>]*type=["']importmap["'][^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(COMMENTS, ' ');

    /* 标签里的属性：图片、脚本、样式表、SVG 里的引用。 */
    const refs = [];
    for (const tag of scan.matchAll(TAG)) {
      for (const m of tag[0].matchAll(ATTR)) {
        refs.push(m[1] || m[2] || '');
      }
      for (const m of tag[0].matchAll(STYLE_ATTR)) {
        for (const u of m[1].matchAll(URLFN)) refs.push(u[1]);
      }
    }
    /* 样式块里的 url(...)：背景图、字体。 */
    for (const block of scan.matchAll(STYLE_BLOCK)) {
      for (const u of block[1].matchAll(URLFN)) refs.push(u[1]);
    }

    for (const raw of refs) {
      const u = raw.trim();
      if (!isLocal(u)) continue;
      const resolved = resolveRef(u, ctx, pageUrl);
      if (!seen.has(resolved)) seen.set(resolved, path.relative(CW, file));
    }
  }
  for (const [u, from] of seen) {
    if (!wanted.has(u)) wanted.set(u, []);
    wanted.get(u).push({ id, from });
  }
}

console.log(`引用了 ${wanted.size} 个不同的地址，开始逐个问服务器……`);

const CONC = Number(process.env.CONC || 16);
const urls = [...wanted.keys()];
const dead = [];
let index = 0;
await Promise.all(
  Array.from({ length: Math.min(CONC, urls.length) }, async () => {
    while (index < urls.length) {
      const u = urls[index++];
      try {
        const res = await fetch(BASE + u, { method: 'GET', redirect: 'follow' });
        await res.arrayBuffer();
        if (!res.ok) dead.push({ u, status: res.status });
      } catch (e) {
        dead.push({ u, status: e.message });
      }
    }
  })
);

const report = {};
for (const d of dead) {
  for (const who of wanted.get(d.u)) {
    if (!report[who.id]) report[who.id] = [];
    report[who.id].push({ u: d.u, from: who.from, status: d.status });
  }
}

for (const [id, list] of Object.entries(report)) {
  console.log(`! ${id}  缺 ${list.length} 个`);
  for (const d of list.slice(0, 60)) console.log(`    ${d.status}  ${d.u}   (${d.from})`);
  if (list.length > 60) console.log(`    …… 还有 ${list.length - 60} 个`);
}

const total = Object.values(report).reduce((n, l) => n + l.length, 0);
console.log(`\n合计：${Object.keys(report).length} 门课件，${total} 个取不回`);
if (process.env.LQ_REPORT) {
  fs.writeFileSync(process.env.LQ_REPORT, JSON.stringify(report, null, 1));
  console.log('报告写入 ' + process.env.LQ_REPORT);
}
