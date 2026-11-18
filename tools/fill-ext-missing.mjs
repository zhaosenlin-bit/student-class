#!/usr/bin/env node
/*
 * 把镜像页面引用到、但本地没有的那些文件补回来。
 *
 * 有些课件把外面某个站点整页存了下来。那些页面会写图、样式表、脚本、
 * 兄弟页面，有的一半写在"站点根目录"上（"/css/pub.css"），一半按自己
 * 所在的文件夹写（"common/js6.js"、"../images/x.gif"）。
 *
 * 搬到本地以后这些地址有的落空，页面打开就是一片裂图。这个工具把每一
 * 个地址都算成它该在的位置，先看本地有没有，没有就去原站取；原站也没
 * 了的，就近找一张同名的图顶上，再没有就放一张空白的占位图——宁可空着，
 * 也不要一个裂开的叉。
 *
 * 有一件事得先想清楚：有的站点把自己的每一个条目都列在目录里，一个条
 * 目再链到下一个条目，链下去就是整个网站。所以这里不跟着链头一直走，
 * 只走两层：
 *
 *   第一层 —— 课件自己身边那些页面要的东西，全都要（图、样式、脚本、
 *             兄弟页面）；
 *   第二层 —— 第一层里那些兄弟页面要的东西，只要图和样式，不要它们
 *             再链出去的页面。
 *
 * 这样每一门课身边的东西都是齐的，又不会把别人的整个网站搬进来。
 *
 *   node tools/fill-ext-missing.mjs            # 取
 *   node tools/fill-ext-missing.mjs --scan     # 只看缺什么
 */
import fs from 'node:fs';
import path from 'node:path';

const SCAN = process.argv.includes('--scan');
const PRUNE = process.argv.includes('--prune');
const CW = 'mirror/leqixiang/courseware';
const SHARED = 'mirror/leqixiang/_shared-ext';

/* 页面里写的地址：标签上的属性，和样式里的 url()。 */
const TAG_ATTR =
  /(?:\bsrc|\bhref|\bposter|\bdata-src|\bdata-bg|\bdata-original|\bsrcset)\s*=\s*["']([^"']{1,400})["']/gi;
const CSS_URL = /url\(\s*["']?([^"')]{1,400})["']?\s*\)/gi;

const IMAGE_EXT = /\.(?:png|jpe?g|gif|svg|webp|bmp|ico|avif)$/i;
const PAGE_EXT = /\.html?$/i;
const STYLE_EXT = /\.(?:css|less|scss)$/i;
const SCRIPT_EXT = /\.(?:js|mjs)$/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/*
 * 有些页面从公共的库站点上取样式表和字体。服务器会把这些地址指到本地
 * 的那一份，所以本地也得有那一份，否则页面打开就是缺样式、缺图标。
 * 库站点的名单照着服务器上写的那一份来，两边始终是一套。
 */
function lqExtHosts() {
  const src = fs.readFileSync('server/server.mjs', 'utf8');
  const block = /const LQ_EXT_HOSTS = \[([\s\S]*?)\];/.exec(src);
  if (!block) return [];
  const hosts = [];
  for (const m of block[1].matchAll(/'([^']+)'/g)) {
    const url = m[1];
    const at = url.indexOf('://');
    if (at < 0) continue;
    hosts.push(url.slice(at + 3).replace(/\/$/, ''));
  }
  return hosts;
}

const EXT_HOSTS = lqExtHosts();

/* 是不是一个"别的网站"的地址。 */
function isRemote(u) {
  return (
    /^[a-z][a-z0-9+.-]*:/i.test(u) ||
    u.startsWith('//') ||
    u.startsWith('#') ||
    u.startsWith('data:') ||
    u.startsWith('blob:') ||
    u.startsWith('javascript:') ||
    u.startsWith('mailto:')
  );
}

function walk(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/\.html?$/i.test(e.name)) out.push(full);
  }
  return out;
}

/*
 * 页面里写的"基准地址"。
 *
 * 有些页面在开头写 <base href="../">，意思是"后面的地址都按上一级
 * 算"。不认这一条，就会把样式表算到错的地方去。
 */
function baseOf(raw, pageRel) {
  const m = /<base\b[^>]*\bhref\s*=\s*["']([^"']*)["']/i.exec(raw);
  if (!m) return null;
  const href = m[1].trim();
  if (!href || /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//')) return null;
  const dir = path.posix.dirname('/' + pageRel);
  let resolved = href.startsWith('/') ? href : path.posix.join(dir, href);
  resolved = path.posix.normalize(resolved);
  if (!resolved.endsWith('/')) resolved = path.posix.dirname(resolved);
  return resolved;
}

/* 一个地址在本地该落在哪里。 */
function localSpot(pageRel, ref, base) {
  const clean = ref.trim().split('#')[0].split('?')[0];
  if (!clean) return null;
  let rel;
  if (clean.startsWith('/')) {
    /* 站点根目录。 */
    rel = clean.replace(/^\/+/, '');
  } else {
    const dir = base || path.posix.dirname('/' + pageRel);
    rel = path.posix.normalize(path.posix.join(dir, clean)).replace(/^\/+/, '');
  }
  try {
    rel = decodeURIComponent(rel);
  } catch {
    /* 地址里有半个百分号，就按原样用。 */
  }
  if (!rel || rel.includes('..')) return null;
  return rel;
}

/* 一个页面引到的地址。 */
function refsOf(raw) {
  const refs = [];
  for (const m of raw.matchAll(TAG_ATTR)) {
    const value = m[1];
    /*
     * srcset 里一行有好几个地址，每个后面还跟着说明。拆开来，
     * 每一个都当普通地址看待。
     */
    if (/^\s*[\w.-]+\s+\d/.test(value) && value.includes(',')) {
      for (const part of value.split(',')) {
        const u = part.trim().split(/\s+/)[0];
        if (u) refs.push(u);
      }
    } else {
      refs.push(value);
    }
  }
  for (const block of raw.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    for (const u of block[1].matchAll(CSS_URL)) refs.push(u[1]);
  }
  for (const inline of raw.matchAll(/\sstyle\s*=\s*["']([^"']*)["']/gi)) {
    for (const u of inline[1].matchAll(CSS_URL)) refs.push(u[1]);
  }
  /*
 * 老页面用 MM_preloadImages 提前把图取来。那些图名也写在属性里，
 * 一样要算进去。
 */
  for (const m of raw.matchAll(/MM_preloadImages\(([^)]*)\)/gi)) {
    for (const q of m[1].matchAll(/['"]([^'"]+)['"]/g)) refs.push(q[1]);
  }
  return refs;
}

/* 把所有页面引用到的地址收齐。 */
function wanted() {
  const out = new Map();
  /*
   * 起点只有一处：每门课自己身边的那一份。共用的那一份是从这里长出来
   * 的，等第一层看完再回来收它的图。
   */
  const trees = [];
  for (const file of fs.readdirSync(CW).filter((n) => n.endsWith('.html'))) {
    const lesson = file.replace(/\.html$/, '');
    const extDir = path.join(CW, file.replace(/\.html$/, '.assets'), '_ext');
    if (!fs.existsSync(extDir)) continue;
    for (const host of fs.readdirSync(extDir)) {
      const hostDir = path.join(extDir, host);
      try {
        if (!fs.statSync(hostDir).isDirectory()) continue;
      } catch {
        continue;
      }
      trees.push({ host, hostDir, lesson });
    }
  }

  /* 第一层：课件身边那些页面要的东西，全都要。 */
  const second = new Map();
  for (const { host, hostDir, lesson } of trees) {
      for (const page of walk(hostDir)) {
        const pageRel = path.relative(hostDir, page).split(path.sep).join('/');
        let raw;
        try {
          raw = fs.readFileSync(page, 'utf8');
        } catch {
          continue;
        }
        const base = baseOf(raw, pageRel);
        for (const ref of refsOf(raw)) {
          if (!ref) continue;
          /*
           * 库站点上的东西：地址留在原样，服务器会指到本地，所以这里要
           * 把同一份文件准备好。
           */
          const cdn = /^https?:\/\/([^/]+)\/(.+)$/.exec(ref);
          if (cdn && EXT_HOSTS.includes(cdn[1])) {
            /* 这两个地址是服务器现写出来的，用不着从原站取。 */
            if (cdn[1] === 'fonts.googleapis.com' && cdn[2].startsWith('css2')) continue;
            if (cdn[1] === 'miaoda.feishu.cn' && cdn[2].startsWith('fonts/css2')) continue;
            const rel = decodeURIComponent(cdn[2].split('#')[0].split('?')[0]);
            const key = cdn[1] + '/' + rel;
            if (!out.has(key)) {
              out.set(key, {
                host: cdn[1],
                rel,
                lesson,
                upstream: 'https://' + cdn[1] + '/' + cdn[2].split('#')[0].split('?')[0]
              });
            }
            continue;
          }
          if (isRemote(ref)) continue;
          if (ref.startsWith('/api/') || ref.startsWith('/courseware/')) continue;
          const rel = localSpot(pageRel, ref, base);
          if (!rel) continue;
          const key = host + '/' + rel;
          const isPage = PAGE_EXT.test(rel);
          if (isPage) {
            /* 兄弟页面记下来，第二层再看它要什么。 */
            const k = host + '/' + rel;
            if (!second.has(k)) second.set(k, { host, rel, lesson });
          }
          if (out.has(key)) continue;
          out.set(key, {
            host,
            rel,
            lesson,
            page: isPage,
            /* 原站上这个地址大概在哪儿。 */
            upstream: 'https://' + host + '/' + rel.split('/').map(encodeURIComponent).join('/')
          });
        }
      }
    }

  /*
   * 第二层：兄弟页面要的东西，只要图和样式。它们的链接再往外的页面
   * 就不取了 —— 那样会变成把整个网站搬进来。
   */
  for (const { host, rel } of second.values()) {
    const file = path.join(SHARED, host, rel);
    let raw;
    try {
      raw = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const pageRel = rel;
    const base = baseOf(raw, pageRel);
    for (const ref of refsOf(raw)) {
      if (!ref || isRemote(ref)) continue;
      if (ref.startsWith('/api/') || ref.startsWith('/courseware/')) continue;
      const cdn = /^https?:\/\/([^/]+)\/(.+)$/.exec(ref);
      if (cdn && EXT_HOSTS.includes(cdn[1])) continue;
      const local = localSpot(pageRel, ref, base);
      if (!local) continue;
      if (PAGE_EXT.test(local)) continue;
      const key = host + '/' + local;
      if (out.has(key)) continue;
      out.set(key, {
        host,
        rel: local,
        lesson: 'shared',
        page: false,
        upstream: 'https://' + host + '/' + local.split('/').map(encodeURIComponent).join('/')
      });
    }
  }
  return [...out.values()];
}

/* 空白的占位图。 */
const PLACEHOLDER = {
  '.png': Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  ),
  '.gif': Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
};

/* 原站已经下线的页面：留一句人话，别留一个空白。 */
const NOTICE_PAGE = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>这一页原站已经下线了</title>
<style>
body { margin: 0; min-height: 100vh; display: grid; place-items: center;
  font-family: system-ui, -apple-system, "Microsoft YaHei", sans-serif;
  color: #26367f; background: #f7f9fd; text-align: center; padding: 2rem; }
p { margin: 0.4rem 0; }
.small { color: #6b7aa8; font-size: 0.9rem; }
</style>
</head>
<body>
<div>
<p>这一页在原站已经找不到了。</p>
<p class="small">它没有随课件一起存下来。</p>
</div>
</body>
</html>
`;

function placeholderFor(rel) {
  const ext = path.extname(rel).toLowerCase();
  if (ext === '.png') return PLACEHOLDER['.png'];
  if (ext === '.gif') return PLACEHOLDER['.gif'];
  if (ext === '.jpg' || ext === '.jpeg') return PLACEHOLDER['.png'];
  if (ext === '.svg')
    return Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"></svg>',
      'utf8'
    );
  if (STYLE_EXT.test(rel)) return Buffer.from('/* 原来的文件已经找不到了。 */\n', 'utf8');
  if (SCRIPT_EXT.test(rel)) return Buffer.from('/* 原来的文件已经找不到了。 */\n', 'utf8');
  if (PAGE_EXT.test(rel)) return Buffer.from(NOTICE_PAGE, 'utf8');
  return Buffer.alloc(0);
}

/* 就近找一张同名的图顶上。 */
function siblingFallback(host, rel) {
  const dir = path.posix.dirname('/' + rel);
  const base = path.posix.basename(rel);
  const stem = base.replace(/\.[^.]+$/, '');
  const dirs = [path.join(SHARED, host, dir), path.join(SHARED, host)];
  for (const d of dirs) {
    let entries;
    try {
      entries = fs.readdirSync(d);
    } catch {
      continue;
    }
    for (const e of entries) {
      if (!e.toLowerCase().startsWith(stem.toLowerCase())) continue;
      if (e === base) continue;
      if (!IMAGE_EXT.test(e)) continue;
      try {
        return fs.readFileSync(path.join(d, e));
      } catch {
        /* 换下一张。 */
      }
    }
  }
  return null;
}

async function fetchBuf(url, referer) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(20000),
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', Referer: referer },
      redirect: 'follow'
    });
    /* 404 是确定的答复，再问一次也是 404。 */
    if (res.status === 404 || res.status === 410) return { gone: true };
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf && buf.length ? { buf } : null;
  } catch {
    return null;
  }
}

const list = wanted();
console.log(`镜像页面引用到的本地文件 ${list.length} 个`);

/*
 * 收拾干净：共享库里那些再往深处才够得着的页面，留下来的只是半截 ——
 * 文字在，图没有。与其留半截，不如不留。
 *
 * 只删课件身边两层够不着的页面；课件自己身边的那一份、它们直接链到的
 * 兄弟页面，都留着。
 */
if (PRUNE) {
  const reachable = new Set();
  const coursePages = [];
  for (const file of fs.readdirSync(CW).filter((n) => n.endsWith('.html'))) {
    const extDir = path.join(CW, file.replace(/\.html$/, '.assets'), '_ext');
    if (!fs.existsSync(extDir)) continue;
    for (const host of fs.readdirSync(extDir)) {
      const hostDir = path.join(extDir, host);
      try {
        if (!fs.statSync(hostDir).isDirectory()) continue;
      } catch {
        continue;
      }
      for (const page of walk(hostDir)) {
        coursePages.push({ host, hostDir, page });
      }
    }
  }

  /* 第一层：课件身边的页面自己，和它们直接链到的兄弟页面。 */
  for (const { host, hostDir, page } of coursePages) {
    reachable.add(path.join(hostDir, path.relative(hostDir, page)).toLowerCase());
    let raw;
    try {
      raw = fs.readFileSync(page, 'utf8');
    } catch {
      continue;
    }
    const pageRel = path.relative(hostDir, page).split(path.sep).join('/');
    const base = baseOf(raw, pageRel);
    for (const ref of refsOf(raw)) {
      if (!ref || isRemote(ref)) continue;
      const rel = localSpot(pageRel, ref, base);
      if (!rel || !PAGE_EXT.test(rel)) continue;
      reachable.add(path.join(SHARED, host, rel).toLowerCase());
    }
  }

  let removed = 0;
  let kept = 0;
  for (const host of fs.readdirSync(SHARED)) {
    const hostDir = path.join(SHARED, host);
    const sweep = (d) => {
      let entries;
      try {
        entries = fs.readdirSync(d, { withFileTypes: true });
      } catch {
        return;
      }
      for (const e of entries) {
        const full = path.join(d, e.name);
        if (e.isDirectory()) {
          sweep(full);
          continue;
        }
        if (!PAGE_EXT.test(e.name)) continue;
        if (reachable.has(full.toLowerCase())) {
          kept++;
          continue;
        }
        fs.unlinkSync(full);
        removed++;
      }
    };
    sweep(hostDir);
  }
  console.log(`共享库里的页面：留下 ${kept} 个，删掉 ${removed} 个半截的`);
  process.exit(0);
}

/*
 * 本地已有的文件先收成一张表：每门课自己的那一份，和各课共用的一份，
 * 都在表里。这样问一次"在不在"就不用再把整个目录翻一遍。
 */
const have = new Set();
for (const lesson of fs.readdirSync(CW).filter((n) => n.endsWith('.html'))) {
  const extDir = path.join(CW, lesson.replace(/\.html$/, '.assets'), '_ext');
  if (!fs.existsSync(extDir)) continue;
  for (const host of fs.readdirSync(extDir)) {
    const hostDir = path.join(extDir, host);
    const add = (d, rel) => have.add(host + '/' + rel);
    const addTree = (d, rel) => {
      let entries;
      try {
        entries = fs.readdirSync(d, { withFileTypes: true });
      } catch {
        return;
      }
      for (const e of entries) {
        const r = rel ? rel + '/' + e.name : e.name;
        if (e.isDirectory()) addTree(path.join(d, e.name), r);
        else add(d, r);
      }
    };
    try {
      if (!fs.statSync(hostDir).isDirectory()) continue;
    } catch {
      continue;
    }
    addTree(hostDir, '');
  }
}
for (const host of fs.readdirSync(SHARED)) {
  const hostDir = path.join(SHARED, host);
  const addTree = (d, rel) => {
    let entries;
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const r = rel ? rel + '/' + e.name : e.name;
      if (e.isDirectory()) addTree(path.join(d, e.name), r);
      else have.add(host + '/' + r);
    }
  };
  try {
    if (!fs.statSync(hostDir).isDirectory()) continue;
  } catch {
    continue;
  }
  addTree(hostDir, '');
}

/* 本地已经有了的，不算缺。 */
const missing = list.filter((it) => !have.has(it.host + '/' + it.rel));

console.log(`本地没有的 ${missing.length} 个`);

if (SCAN) {
  const byHost = new Map();
  for (const it of missing) byHost.set(it.host, (byHost.get(it.host) || 0) + 1);
  console.log('缺的地方按站点分：');
  for (const [h, n] of [...byHost].sort((a, b) => b[1] - a[1])) {
    console.log(`   ${h}: ${n}`);
  }
  console.log('');
  for (const it of missing) console.log('? ' + it.host + '/' + it.rel);
  process.exit(0);
}

const CONC = Number(process.env.CONC || 8);
let got = 0;
let topped = 0;
let blank = 0;
let missed = 0;

async function take(it) {
  const dest = path.join(SHARED, it.host, it.rel);
  if (fs.existsSync(dest)) return 'had';

  const referer = 'https://' + it.host + '/';
  let buf = null;
  for (let attempt = 1; attempt <= 2 && !buf; attempt++) {
    const got = await fetchBuf(it.upstream, referer);
    if (got?.gone) break;
    if (got?.buf) {
      buf = got.buf;
      break;
    }
    await sleep(600 * attempt);
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (buf) {
    fs.writeFileSync(dest, buf);
    return 'got';
  }
  /* 原站也没了：就近拿一张同名的图顶上。 */
  const sib = siblingFallback(it.host, it.rel);
  if (sib) {
    fs.writeFileSync(dest, sib);
    return 'top';
  }
  /* 再没有就放一张空白的，别让页面上出现裂图。 */
  const ph = placeholderFor(it.rel);
  if (ph.length) {
    fs.writeFileSync(dest, ph);
    return 'blank';
  }
  return 'miss';
}

let cursor = 0;
let done = 0;
await Promise.all(
  Array.from({ length: Math.min(CONC, missing.length) }, async () => {
    for (;;) {
      const at = cursor++;
      if (at >= missing.length) return;
      const what = await take(missing[at]);
      done++;
      if (done % 100 === 0) {
        console.log(`  走了 ${done}/${missing.length}`);
      }
      if (what === 'got') got++;
      else if (what === 'top') topped++;
      else if (what === 'blank') blank++;
      else if (what === 'miss') missed++;
    }
  })
);

console.log(`\n取回 ${got}，就近顶上 ${topped}，空白占位 ${blank}，还是没有 ${missed}`);
