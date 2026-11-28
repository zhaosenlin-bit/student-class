#!/usr/bin/env node
/*
 * 把样式表里指不到地方的图补齐。
 *
 * 有几门课，样式表是从别处搬来的，样式表里写着
 *
 *     background: url(pictures/winter0.jpg);
 *
 * 那张图在别的课件的目录里有一份一模一样的，却没有跟着一起搬过来。
 * 样式表于是指着一个不存在的文件——页面还在，只是背景是空的。
 *
 * 这里按文件名在全成品里找同一份图，找到就放到样式表旁边，
 * 找不到就说一声，不猜。
 *
 *   node tools/fix-missing-css-assets.mjs --root dist --check
 *   node tools/fix-missing-css-assets.mjs --root dist --fix
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const arg = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const ROOT = path.resolve(arg('root', 'dist'));
const FIX = args.includes('--fix');

/* 全成品里所有文件，按文件名记住它在哪儿。 */
const byName = new Map();
const cssFiles = [];

const walk = (dir) => {
  let names = [];
  try {
    names = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const n of names) {
    const full = path.join(dir, n.name);
    if (n.isDirectory()) {
      walk(full);
      continue;
    }
    if (/\.css$/i.test(n.name)) cssFiles.push(full);
    if (!byName.has(n.name)) byName.set(n.name, []);
    byName.get(n.name).push(full);
  }
};
walk(ROOT);

const REF = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g;

const copied = [];
const missing = [];

for (const file of cssFiles) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  const dir = path.dirname(file);
  const seen = new Set();
  for (const m of text.matchAll(REF)) {
    const raw = m[2];
    if (!raw || raw.startsWith('data:')) continue;
    if (/^https?:/i.test(raw) || raw.startsWith('//')) {
      missing.push({ file, raw, why: '站外' });
      continue;
    }
    if (raw.startsWith('#')) continue;
    const clean = raw.split('#')[0].split('?')[0];
    if (!clean) continue;
    const target = path.resolve(dir, clean);
    if (fs.existsSync(target)) continue;
    if (seen.has(target)) continue;
    seen.add(target);

    const name = path.basename(clean);
    const donors = (byName.get(name) || []).filter(
      (p) => !p.startsWith(path.dirname(target) + path.sep),
    );
    if (!donors.length) {
      missing.push({ file, raw, why: '全库都没有' });
      continue;
    }
    copied.push({ file, raw, from: donors[0], to: target });
    if (FIX) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(donors[0], target);
    }
  }
}

for (const c of copied) {
  console.log(
    `${FIX ? '补上' : '可以补'}  ${path.relative(ROOT, c.to)}  ←  ${path.relative(ROOT, c.from)}`,
  );
}
for (const m of missing) {
  console.log(`  补不了  ${path.relative(ROOT, m.file)}  ${m.raw}  （${m.why}）`);
}
console.log('');
console.log(
  `${copied.length} 张图${FIX ? '已补' : '待补'}，${missing.length} 处补不了。`,
);
