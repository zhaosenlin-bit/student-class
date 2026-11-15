#!/usr/bin/env node
/*
 * 每张封面都问一次本地服务器，看是不是真的能拿回来一张图。
 *
 * 只看状态码和字节数不够 —— 服务器可能回一张占位的空白图。所以这里
 * 顺带看一眼内容是不是真的图片（PNG / JPEG / WebP / SVG 的文件头）。
 */
import fs from 'node:fs';

const PORT = Number(process.env.LQ_PORT || 4173);
const ORIGIN = `http://localhost:${PORT}`;
const catalog = JSON.parse(fs.readFileSync('mirror/leqixiang/catalog.json', 'utf8'));

const isImage = (buf, type) => {
  if (type.includes('svg')) return buf.includes('<svg');
  if (buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50) return true;
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8) return true;
  if (buf.length > 12 && buf.slice(0, 4).toString('latin1') === 'RIFF') return true;
  if (buf.length > 4 && buf.slice(1, 4).toString('latin1') === 'PNG') return true;
  return false;
};

const bad = [];
let ok = 0;
const seen = new Map();

for (const p of catalog.products) {
  const url = p.cover;
  if (!url) {
    bad.push({ id: p.id, why: '没有封面地址' });
    continue;
  }
  if (seen.has(url)) continue;
  seen.set(url, p.id);
  try {
    const res = await fetch(ORIGIN + url);
    const buf = Buffer.from(await res.arrayBuffer());
    const type = res.headers.get('content-type') || '';
    if (!res.ok) {
      bad.push({ id: p.id, url, why: `HTTP ${res.status}` });
      continue;
    }
    if (!buf.length) {
      bad.push({ id: p.id, url, why: '空文件' });
      continue;
    }
    if (!isImage(buf, type)) {
      bad.push({ id: p.id, url, why: `不是图片 (${type}) ${buf.length}B` });
      continue;
    }
    ok++;
  } catch (e) {
    bad.push({ id: p.id, url, why: e.message });
  }
}

console.log(`封面 ${seen.size} 张（目录 ${catalog.products.length} 条，去重后请求 ${seen.size} 次）`);
console.log(`能正常取回图片：${ok}`);
console.log(`有问题：${bad.length}`);
for (const b of bad.slice(0, 30)) console.log(`   ! ${b.id} ${b.url} — ${b.why}`);
