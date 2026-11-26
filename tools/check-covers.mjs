#!/usr/bin/env node
/*
 * 查每一门课件的封面图在不在。
 *
 * 目录数据里每门课都写着一个封面图的地址。有的是品牌目录里的图，
 * 有的是当初用户自己传上去的图。成品里得一张不缺，多一张也不要。
 *
 * 少了，页面上就是一张裂图；多了，是旧东西，白占地方。
 *
 * 写这个检查是有原因的：目录数据里的地址是编码过的（中文和表情符号
 * 都写成 %xx），按明文去比对会漏掉一部分，曾经因此把 15 张封面图
 * 当成没人要的旧文件清掉了，页面上就裂了 15 张图。
 *
 *   node tools/check-covers.mjs --root dist
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};

const ROOT = path.resolve(arg('root', 'dist'));
const OUT = arg('out', 'receipts/covers.json');

const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog.json'), 'utf8'));

/*
 * 目录数据里的地址有三种写法：带 / 的、带 ./ 的、和编码过的。
 * 落到磁盘上的名字是明文的，比对之前先摆成同一个样子。
 */
const wanted = new Set();
for (const p of catalog.products || []) {
  const raw = String(p.cover || '').replace(/^\.?\//, '');
  if (!raw) continue;
  let plain = raw;
  try {
    plain = decodeURIComponent(raw);
  } catch {
    /* 本来就是明文 */
  }
  wanted.add(plain);
}

const walk = (dir, base = '') => {
  const out = [];
  for (const it of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${it.name}` : it.name;
    if (it.isDirectory()) out.push(...walk(path.join(dir, it.name), rel));
    else out.push(rel);
  }
  return out;
};

const onDisk = new Set(walk(ROOT));

const missing = [...wanted].filter((w) => !onDisk.has(w));

/*
 * 上传目录里放的全是课件的封面图，一张不多一张不少。
 * 品牌目录里还有站标、图标、积木素材这些，不是封面图，不在这里查。
 */
const uploadDir = 'prod/uploads';
const stray = fs.existsSync(path.join(ROOT, uploadDir))
  ? walk(path.join(ROOT, uploadDir)).filter((rel) => !wanted.has(`${uploadDir}/${rel}`))
  : [];

const report = {
  checkedAt: new Date().toISOString(),
  root: ROOT,
  courses: (catalog.products || []).length,
  covers: wanted.size,
  missing: missing.length,
  stray: stray.length,
  missingSample: missing.slice(0, 10),
  straySample: stray.slice(0, 10),
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);

console.log(`目录数据里的封面图：${wanted.size}`);
console.log(`成品里缺的：${missing.length}`);
for (const x of missing.slice(0, 10)) console.log('  缺', x);
console.log(`上传目录里没人指的：${stray.length}`);
for (const x of stray.slice(0, 10)) console.log('  多', `${uploadDir}/${x}`);

console.log('');
console.log(missing.length === 0 && stray.length === 0
  ? '封面图一个不缺、一个不多。'
  : '对不上。');
process.exitCode = missing.length === 0 && stray.length === 0 ? 0 : 1;
