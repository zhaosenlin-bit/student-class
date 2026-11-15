#!/usr/bin/env node
/*
 * Google Fonts 的样式表单独取：查询串从课件正文里原样抄下来，
 * 不依赖验收报告（报告里的地址被截断过）。取回后合并成一份，
 * 字体地址指向本地的 /_shared/fonts.gstatic.com/...
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CW = path.join(ROOT, 'mirror', 'leqixiang', 'courseware');
const SHARED = path.join(ROOT, 'mirror', 'leqixiang', '_shared-ext');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const queries = new Set();
for (const f of fs.readdirSync(CW).filter((x) => x.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(CW, f), 'utf8');
  for (const m of html.matchAll(/https:\/\/fonts\.googleapis\.com\/(?:css2|css)\?[^"'\s)<>]+/g)) {
    queries.add(m[0].slice('https://fonts.googleapis.com/'.length));
  }
  /*
   * 有几份课件把空格直接写进了字体地址，地址本身要照原样取到，
   * 所以这里放宽到引号为止，再把转义标签后面的杂质剪掉。
   */
  for (const m of html.matchAll(/https:\/\/fonts\.googleapis\.com\/(?:css2|css)\?[^"']+/g)) {
    let q = m[0].slice('https://fonts.googleapis.com/'.length);
    const cut = q.search(/&(?:quot|lt|gt);/);
    if (cut >= 0) q = q.slice(0, cut);
    queries.add(q.trim());
  }
}
/* 有的课件把 & 写成了 &amp;，也有把空格直接写进地址里，两种都补一份 */
for (const q of [...queries]) {
  if (q.includes('&amp;')) queries.add(q.replace(/&amp;/g, '&'));
  if (q.includes(' ')) queries.add(q.replace(/ /g, '%20'));
}
console.log('字体样式查询：', queries.size);

async function grab(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(15000),
      });
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
        continue;
      }
      if (!res.ok) return null;
      return await res.text();
    } catch {
      await new Promise((r) => setTimeout(r, 1200));
    }
  }
  return null;
}

/* 一次并发十个，别把 Google 打到限流 */
const list = [...queries];
const faces = [];
const seen = new Set();
let cursor = 0;
let failed = 0;
async function worker() {
  while (cursor < list.length) {
    const query = list[cursor++];
    const css = await grab('https://fonts.googleapis.com/' + query);
    if (!css) {
      failed++;
      console.log('  取不到', query.slice(0, 60));
      continue;
    }
    for (const block of css.split('}').filter(Boolean)) {
      const face = block.trim() + '}';
      const key = face.replace(/\s+/g, ' ');
      if (seen.has(key)) continue;
      seen.add(key);
      faces.push(face);
    }
  }
}
await Promise.all(Array.from({ length: 10 }, worker));
console.log('@font-face 规则：', faces.length, '失败查询：', failed);

const fontFiles = new Set();
for (const face of faces) {
  for (const m of face.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)) fontFiles.add(m[1]);
}
let ok = 0;
for (const url of fontFiles) {
  /* 字体地址带一串签名参数，本地按路径存，参数留在样式表里。 */
  const parsed = new URL(url);
  const rel = parsed.hostname + parsed.pathname;
  const target = path.join(SHARED, rel);
  if (fs.existsSync(target) && fs.statSync(target).size > 0) continue;
  const buf = await grab(url, 3);
  if (!buf) continue;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, Buffer.from(buf, 'binary'));
  ok++;
}
console.log('新增字体文件', ok, '/', fontFiles.size);

const merged = faces
  .join('\n')
  .replace(/url\(https:\/\/fonts\.gstatic\.com\//g, 'url(/_shared/fonts.gstatic.com/')
  .replace(/url\('https:\/\/fonts\.gstatic\.com\//g, "url('/_shared/fonts.gstatic.com/")
  .replace(/url\("https:\/\/fonts\.gstatic\.com\//g, 'url("/_shared/fonts.gstatic.com/');
fs.mkdirSync(path.join(SHARED, 'fonts.googleapis.com'), { recursive: true });
fs.writeFileSync(path.join(SHARED, 'fonts.googleapis.com', 'css2'), merged);
console.log('合并样式表', merged.length, '字节');
