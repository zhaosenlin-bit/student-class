#!/usr/bin/env node
/*
 * 把镜像页面里指向站点根目录的文件补回来。
 *
 * 有些课件把外面某个站点整站存了下来。存下来的页面里，有的图、有的
 * 样式表、有的兄弟页面是按"网站根目录"写的地址（"/css/pub.css"、
 * "/circle.html"）。搬到本地以后，这些地址落空了：页面打开了，图却是
 * 裂的，链接一点就没了。
 *
 * 原站上这些文件大多还在，一趟取回来放进共享库，本机再有人问同一个
 * 地址就答得上。
 *
 *   node tools/fill-ext-root-assets.mjs          # 取
 *   node tools/fill-ext-root-assets.mjs --scan   # 只看缺什么
 */
import fs from 'node:fs';
import path from 'node:path';

const SCAN = process.argv.includes('--scan');
const CW = 'mirror/leqixiang/courseware';
const SHARED = 'mirror/leqixiang/_shared-ext';

/* 只认页面里真正写着的根地址。 */
const REF = /(?:src|href)\s*=\s*["'](\/[^"'#?]{1,200})["']/g;

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

/* 找出一门课镜像里指向"站点根"的那些地址。 */
function wanted() {
  const out = new Map();
  for (const id of fs.readdirSync(CW).filter((n) => n.endsWith('.html'))) {
    const ext = path.join(CW, id.replace(/\.html$/, '.assets'), '_ext');
    if (!fs.existsSync(ext)) continue;
    for (const host of fs.readdirSync(ext)) {
      const hostDir = path.join(ext, host);
      try {
        if (!fs.statSync(hostDir).isDirectory()) continue;
      } catch {
        continue;
      }
      for (const page of walk(hostDir)) {
        let raw;
        try {
          raw = fs.readFileSync(page, 'utf8');
        } catch {
          continue;
        }
        /*
         * 脚本的"内容"先拿掉，但开头那个标签要留着。
         * 不少页面把样式表、脚本按站点根目录写（"/js/xxx.js"），
         * 整块删掉的话，这些地址就没人去取，页面打开图是裂的。
         */
        const body = raw
          .replace(/<!--[\s\S]*?-->/g, ' ')
          .replace(/(<script\b[^>]*>)[\s\S]*?(<\/script>)/gi, (m, open) => open + ' ');
        for (const m of body.matchAll(REF)) {
          const u = m[1];
          if (u.startsWith('//') || u.startsWith('/api/')) continue;
          /* 页面自己目录里已经有的不算缺。 */
          const local = path.join(hostDir, u.replace(/^\/+/, ''));
          if (fs.existsSync(local)) continue;
          const key = host + u;
          if (!out.has(key)) out.set(key, { host, rel: u.replace(/^\/+/, '') });
        }
      }
    }
  }
  return [...out.values()];
}

const list = wanted();
console.log(`镜像页面指向站点根的文件 ${list.length} 个`);

let got = 0;
let had = 0;
let missed = 0;

if (SCAN) {
  let n = 0;
  for (const item of list) {
    const dest = path.join(SHARED, item.host, item.rel);
    if (fs.existsSync(dest)) {
      had++;
      continue;
    }
    n++;
    console.log('? 缺 ' + item.host + '/' + item.rel);
  }
  console.log('\n缺 ' + n + ' 个，已经有 ' + had + ' 个');
  process.exit(0);
}

/* 原站不快，一个一个取要等很久，这里几个一起取。 */
const CONC = Number(process.env.CONC || 6);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function take(item) {
  const dest = path.join(SHARED, item.host, item.rel);
  if (fs.existsSync(dest) && fs.statSync(dest).isFile()) {
    return 'had';
  }
  const url = 'https://' + item.host + '/' + item.rel.split('/').map(encodeURIComponent).join('/');
  let ok = false;
  for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(45000),
        headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://' + item.host + '/' },
        redirect: 'follow'
      });
      if (!res.ok) {
        await new Promise((r) => setTimeout(r, 1500 * attempt));
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      if (!buf.length) continue;
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, buf);
      console.log('+ ' + item.host + '/' + item.rel + '  ' + Math.round(buf.length / 1024) + 'KB');
      ok = true;
    } catch {
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
  if (!ok) {
    console.log('- 取不到 ' + item.host + '/' + item.rel);
    return 'fail';
  }
  return 'got';
}

let cursor = 0;
await Promise.all(
  Array.from({ length: Math.min(CONC, list.length) }, async () => {
    for (;;) {
      const at = cursor++;
      if (at >= list.length) return;
      const what = await take(list[at]);
      if (what === 'got') got++;
      else if (what === 'had') had++;
      else if (what === 'fail') missed++;
    }
  })
);

console.log('\n取回 ' + got + '，本来就有 ' + had + '，取不到 ' + missed);
