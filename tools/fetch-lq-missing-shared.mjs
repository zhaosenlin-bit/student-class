/*
 * 最后一批"所有课件共用"的外部文件。
 *
 * 这几样不是写在课件正文里的，而是运行时自己拼出来的地址，所以早先
 * 扫正文的那个脚本看不到它们：
 *
 *   - MathJax 的 chtml 字体（运行时按 `output/chtml/fonts/woff-v2/` 拼）
 *   - three.js DRACOLoader 的解码器（运行时按 `examples/jsm/libs/draco/` 拼）
 *
 * 放一份到共用的 `_shared-ext\` 目录，所有课件一起用。
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SHARED = path.join(ROOT, 'mirror', 'leqixiang', '_shared-ext');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

/* jsDelivr 在这边经常被重置连接，换几个镜像源再试。 */
const MIRRORS = [
  'https://cdn.jsdelivr.net/npm/',
  'https://fastly.jsdelivr.net/npm/',
  'https://gcore.jsdelivr.net/npm/',
  'https://testingcf.jsdelivr.net/npm/',
];

async function grab(url, dest) {
  for (const base of MIRRORS) {
    const full = base + url;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(full, {
          headers: { 'User-Agent': UA, Referer: 'https://aifunengjiaoyu.com/' },
          signal: AbortSignal.timeout(60000),
        });
        if (!res.ok) continue;
        const buf = Buffer.from(await res.arrayBuffer());
        if (!buf.length) continue;
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, buf);
        return { ok: true, bytes: buf.length, from: full };
      } catch {
        /* 换下一个源 */
      }
    }
  }
  return { ok: false };
}

/* MathJax 的字体清单从 jsDelivr 自己的索引里取，别手写。 */
async function mathjaxFonts() {
  /* 版本号不带具体数字时索引接口给的不是同一份结构，所以逐个试。 */
  for (const version of ['3.2.2', '3.2.1', '3']) {
    try {
      const res = await fetch(`https://data.jsdelivr.com/v1/package/npm/mathjax@${version}/flat`, {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) continue;
      const index = await res.json();
      if (!Array.isArray(index.files)) continue;
      const files = index.files
    .map((f) => f.name)
        .filter((n) => /^\/es5\/output\/chtml\/fonts\/woff-v2\/.*\.woff$/.test(n))
        .map((n) => n.replace(/^\//, ''));
      if (files.length) return files;
    } catch {
      /* 换下一个版本 */
    }
  }
  return [];
}

const DRACO = [
  'three@0.160.0/examples/jsm/libs/draco/draco_decoder.wasm',
  'three@0.160.0/examples/jsm/libs/draco/draco_wasm_wrapper.js',
  'three@0.160.0/examples/jsm/libs/draco/draco_encoder.js',
];

let ok = 0;
let missing = 0;

for (const rel of DRACO) {
  const dest = path.join(SHARED, 'unpkg.com', rel);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
    console.log('skip   unpkg.com/' + rel);
    ok++;
    continue;
  }
  const r = await grab(rel, dest);
  if (r.ok) {
    console.log('saved ', String(r.bytes).padStart(8), 'unpkg.com/' + rel);
    ok++;
  } else {
    console.log('MISS   unpkg.com/' + rel);
    missing++;
  }
}

let fonts = [];
try {
  fonts = await mathjaxFonts();
} catch (e) {
  console.log('拿不到 MathJax 字体清单：', e.message);
}
for (const rel of fonts) {
  const dest = path.join(SHARED, 'cdn.jsdelivr.net', 'npm', 'mathjax@3', rel);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
    ok++;
    continue;
  }
  const r = await grab('mathjax@3/' + rel, dest);
  if (r.ok) {
    console.log('saved ', String(r.bytes).padStart(8), 'cdn.jsdelivr.net/npm/mathjax@3/' + rel);
    ok++;
  } else {
    console.log('MISS   cdn.jsdelivr.net/npm/mathjax@3/' + rel);
    missing++;
  }
}

console.log(`\n补齐 ${ok} 个，线上没有 ${missing} 个`);
