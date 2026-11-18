#!/usr/bin/env node
/*
 * 修好"名字对不上"的引用。
 *
 * 有几处资源在原站是 .webp（或者 .gif、.jpg），搬进本地时换了写法，
 * 页面里还指着旧的名字，于是一张张裂开。这里照着同一个文件夹里真正
 * 存在的那个文件，把引用的名字改过来。
 *
 *   node tools/repair-missing-refs.mjs          # 查
 *   node tools/repair-missing-refs.mjs --fix    # 改
 */
import fs from 'node:fs';
import path from 'node:path';

const CW = 'mirror/leqixiang/courseware';
const MIRRORS = [CW, 'mirror/aifunengjiaoyu/courseware'];
const fix = process.argv.includes('--fix');

const ALT = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.avif', '.bmp'];
const MEDIA = ['.mp3', '.mp4', '.wav', '.ogg', '.webm', '.m4a'];

const listFiles = (dir, out = []) => {
  let es;
  try {
    es = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of es) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) listFiles(p, out);
    else out.push(p);
  }
  return out;
};

/* the ref, the file that holds it, and where the ref is relative to */
const REF =
  /(["'(])((?:\.{1,2}\/)*[A-Za-z0-9_.\-\/ %一-鿿]+\.(?:webp|gif|jpe?g|png|svg|avif|bmp|mp3|mp4|wav|ogg|webm|m4a))(\?[^"')\s]*)?\1/gi;

let changed = 0;
let fixed = 0;

function tryFix(file, text) {
  let out = text;
  let touched = 0;
  out = out.replace(REF, (m, q, rel, query, at) => {
    if (/^(?:https?:|data:|blob:)/i.test(rel)) return m;
    const abs = path.resolve(path.dirname(file), rel);
    if (fs.existsSync(abs)) return m;
    const base = rel.replace(/\.[A-Za-z0-9]{1,5}$/, '');
    const dir = path.dirname(abs);
    const stem = path.basename(base);
    const pool = /\.(mp3|mp4|wav|ogg|webm|m4a)$/i.test(rel) ? MEDIA : ALT;
    const found = [];
    for (const ext of pool) {
      const cand = path.join(dir, stem + ext);
      if (fs.existsSync(cand)) found.push(cand);
    }
    if (found.length !== 1) return m;
    const realExt = path.extname(found[0]);
    if (realExt.toLowerCase() === path.extname(rel).toLowerCase()) return m;
    const dirRel = path.dirname(rel);
    const newRel = (dirRel === '.' ? '' : dirRel + '/') + stem + realExt;
    touched++;
    console.log(
      `  ${path.relative(CW, file)}\n      ${rel}  ->  ${newRel}`
    );
    return q + newRel + (query || '') + q;
  });
  return { out, touched };
}

for (const dir of MIRRORS) {
  if (!fs.existsSync(dir)) continue;
  for (const file of listFiles(dir)) {
    if (!/\.(?:html?|css|js|mjs)$/i.test(file)) continue;
    let text;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const { out, touched } = tryFix(file, text);
    if (!touched) continue;
    changed++;
    fixed += touched;
    if (fix) fs.writeFileSync(file, out);
  }
}

console.log(`\n改了 ${changed} 个文件；修好 ${fixed} 处`);
