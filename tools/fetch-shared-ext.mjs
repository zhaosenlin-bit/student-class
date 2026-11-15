#!/usr/bin/env node
/*
 * 把课件引用到的公共 CDN 资源补到 _shared-ext/。
 *
 * 课件正文里的 Google Fonts、tailwind、font-awesome、mathjax、three.js
 * 这些公共资源，原来的抓取只收下了 fonts.gstatic.com 的字形，样式表和
 * 脚本本身没落地，于是每门课都会报一串 404。
 *
 * 资源清单直接从本地课件正文里扫出来（比验收报告全，报告里的地址被截断
 * 过），逐个回源取回：
 *   - fonts.googleapis.com 的 css2 逐个查询取回，合并成一份，
 *     里面的字体地址改指向本地的 /_shared/fonts.gstatic.com/...
 *   - 其余公共资源按原路径存进 _shared-ext/<host>/<path>
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SHARED = path.join(ROOT, 'mirror', 'leqixiang', '_shared-ext');
const CW = path.join(ROOT, 'mirror', 'leqixiang', 'courseware');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

/* 站点自己托管的地址不需要镜像 */
const SITE_HOSTS = new Set([
  'aifunengjiaoyu.com',
  'www.aifunengjiaoyu.com',
  'static.aifunengjiaoyu.com',
  'xbjiaoyu.com',
  'www.xbjiaoyu.com',
  'localhost',
  '127.0.0.1',
]);

/* 这些是命名空间地址，不是可以取回的文件 */
const NOT_A_FILE = new Set([
  'www.w3.org/1999/xhtml',
  'www.w3.org/2000/svg',
  'www.w3.org/1999/xlink',
]);

function collectExternal() {
  const urls = new Set();
  const files = fs.readdirSync(CW).filter((f) => f.endsWith('.html'));
  for (const f of files) {
    const html = fs.readFileSync(path.join(CW, f), 'utf8');
    for (const m of html.matchAll(/https?:\/\/([A-Za-z0-9._-]+)(?::\d+)?(\/[^\s"'`)<>]*)?/g)) {
      const host = m[1];
      if (SITE_HOSTS.has(host)) continue;
      const rest = m[2] || '';
      if (NOT_A_FILE.has(host + rest)) continue;
      /*
       * A bare host is almost always a preconnect hint or a link the
       * teacher clicks. Only tailwind's script really lives on a host
       * root, and it is handled below.
       */
      if (!rest || rest === '/') {
        if (host === 'cdn.tailwindcss.com') urls.add(host);
        continue;
      }
      const whole = `${host}${rest}`;
      /* A path that ends in a slash is a prefix, the file behind it is
         named separately. */
      if (whole.endsWith('/')) continue;
      urls.add(whole);
    }
  }
  return urls;
}

const external = collectExternal();
console.log('课件正文里引用的外部地址：', external.size);

const fontQueries = new Set();
const plain = new Set();
for (const u of external) {
  if (u.startsWith('fonts.googleapis.com/css2')) {
    fontQueries.add(u.slice('fonts.googleapis.com/css2'.length));
    continue;
  }
  if (u.startsWith('fonts.googleapis.com/css')) {
    fontQueries.add(u.slice('fonts.googleapis.com/css'.length));
    continue;
  }
  plain.add(u);
}

const GAP = 220;
let lastCall = 0;
async function pace() {
  const wait = lastCall + GAP - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
}
async function grab(url, asText = false) {
  for (let attempt = 0; attempt < 6; attempt++) {
    await pace();
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Referer: 'https://aifunengjiaoyu.com/' },
      });
      if (res.status === 429 || res.status === 403) {
        await new Promise((r) => setTimeout(r, 2500 * (attempt + 1)));
        continue;
      }
      if (!res.ok) return { status: res.status };
      return { status: 200, data: asText ? await res.text() : Buffer.from(await res.arrayBuffer()) };
    } catch {
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  return { status: 0 };
}

/*
 * tailwind 的脚本挂在站点根上：正文写的是 https://cdn.tailwindcss.com，
 * 本地改写后落在 _ext/cdn.tailwindcss.com/tailwind.js，所以取回时要按
 * 站点根取，落到本地时补上 tailwind.js 这个文件名。
 */
function sourceUrl(rel) {
  if (rel === 'cdn.tailwindcss.com' || rel === 'cdn.tailwindcss.com/tailwind.js') {
    return 'https://cdn.tailwindcss.com';
  }
  return 'https://' + rel;
}

function localPath(rel) {
  if (rel === 'cdn.tailwindcss.com') return 'cdn.tailwindcss.com/tailwind.js';
  return rel.split('?')[0];
}

let ok = 0;
const missed = [];
for (const rel of plain) {
  const target = path.join(SHARED, localPath(rel));
  if (fs.existsSync(target) && fs.statSync(target).size > 0) continue;
  const res = await grab(sourceUrl(rel));
  if (res.status !== 200) {
    missed.push(`${res.status} ${rel}`);
    continue;
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, res.data);
  ok++;
  console.log('  +', rel, res.data.length);
}

const faces = [];
const seenFace = new Set();
for (const query of fontQueries) {
  const res = await grab('https://fonts.googleapis.com/css2' + query, true);
  if (res.status !== 200) {
    console.log('  字体样式取不到', query, res.status);
    continue;
  }
  for (const block of res.data.split('}').filter(Boolean)) {
    const face = block.trim() + '}';
    const key = face.replace(/\s+/g, ' ');
    if (seenFace.has(key)) continue;
    seenFace.add(key);
    faces.push(face);
  }
}
console.log('字体 @font-face 规则：', faces.length);

const fontFiles = new Set();
for (const face of faces) {
  for (const m of face.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)) {
    fontFiles.add(m[1]);
  }
}
let fontOk = 0;
for (const url of fontFiles) {
  const rel = url.replace(/^https:\/\//, '');
  const target = path.join(SHARED, rel);
  if (fs.existsSync(target) && fs.statSync(target).size > 0) continue;
  const res = await grab(url);
  if (res.status !== 200) continue;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, res.data);
  fontOk++;
}
console.log('新增字体文件', fontOk, '（字库合计', fontFiles.size, '）');

const merged = faces
  .join('\n')
  .replace(/url\(https:\/\/fonts\.gstatic\.com\//g, 'url(/_shared/fonts.gstatic.com/')
  .replace(/url\('https:\/\/fonts\.gstatic\.com\//g, "url('/_shared/fonts.gstatic.com/")
  .replace(/url\("https:\/\/fonts\.gstatic\.com\//g, 'url("/_shared/fonts.gstatic.com/');
fs.mkdirSync(path.join(SHARED, 'fonts.googleapis.com'), { recursive: true });
fs.writeFileSync(path.join(SHARED, 'fonts.googleapis.com', 'css2'), merged);
console.log('合并样式表', merged.length, '字节 -> _shared-ext/fonts.googleapis.com/css2');
console.log('公共资源补齐', ok, '个，仍取不到', missed.length, '个');
for (const m of missed) console.log('   -', m);
