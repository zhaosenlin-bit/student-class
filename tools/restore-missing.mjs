#!/usr/bin/env node
/*
 * 把验收里报出来的「找不到的文件」放回课件自己的目录里。
 *
 * 重复的素材收进 shared/ 之后，个别课件会在运行的时候按名字去找文件——
 * 这种名字静态看不见，收走以后就找不到了。这种课件的处理办法很简单：
 * 在它自己的目录里再放一份它要的那一份，放的是 shared/ 里的同一个文件，
 * 一个字都不差。课件于是又能打开，下载清单里也补上这一份。
 *
 * 要处理的文件从验收记录里读：记着的是「哪个课件、少了哪个文件」。
 *
 *   node tools/restore-missing.mjs --root dist --receipts receipts/static-site.json
 *   node tools/restore-missing.mjs --root dist --receipts receipts/static-site.json --dry
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const ROOT = path.resolve(arg('root', path.join(HERE, '..', 'dist')));
const SHARED = path.resolve(arg('shared', path.join(ROOT, 'shared')));
const RECEIPTS = arg('receipts', path.join(HERE, '..', 'receipts', 'static-site.json'));
const DRY = args.includes('--dry');

if (!fs.existsSync(ROOT)) {
  console.error('没有找到课件的成品：' + ROOT);
  process.exit(1);
}
if (!fs.existsSync(RECEIPTS)) {
  console.error('没有找到验收记录：' + RECEIPTS);
  process.exit(1);
}

/* shared/ 里的东西按相对路径记下来，找的时候直接问它。 */
const shared = new Set();
(function walk(dir, rel = '') {
  for (const it of fs.readdirSync(dir, { withFileTypes: true })) {
    const r = rel ? rel + '/' + it.name : it.name;
    const abs = path.join(dir, it.name);
    if (it.isDirectory()) walk(abs, r);
    else shared.add(r);
  }
})(SHARED);

/* 验收记录里写的是「404 /courseware/xxx/assets/yyy」这样的一行。 */
const data = JSON.parse(fs.readFileSync(RECEIPTS, 'utf8'));
const wanted = new Map();
for (const course of data.failures || []) {
  for (const why of course.failed || []) {
    const m = /^(?:404|403|500)\s+\/courseware\/([^/]+)\/(.+)$/.exec(why);
    if (!m) continue;
    const [, id, rel] = m;
    if (!wanted.has(id)) wanted.set(id, new Set());
    wanted.get(id).add(rel);
  }
}

if (!wanted.size) {
  console.log('验收记录里没有缺文件的课件。');
  process.exit(0);
}

let restored = 0;
let notFound = 0;
const unresolved = [];

for (const [id, files] of wanted) {
  const dir = path.join(ROOT, 'courseware', id);
  const manifestPath = path.join(dir, 'download.json');
  let manifest = null;
  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch {
      manifest = null;
    }
  }
  for (const rel of files) {
    const target = path.join(dir, rel);
    if (fs.existsSync(target)) continue;
    const source = path.join(SHARED, rel);
    if (!fs.existsSync(source)) {
      notFound++;
      unresolved.push(`${id} ${rel}`);
      continue;
    }
    if (DRY) {
      console.log(`会放回 ${id} ${rel}`);
      restored++;
      continue;
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
    restored++;
    if (manifest && Array.isArray(manifest.entries)) {
      const clean = rel.replace(/\\/g, '/');
      const entry = [clean, clean];
      const known = manifest.entries.some(
        (e) => Array.isArray(e) && path.posix.normalize(String(e[1] || '')) === clean
      );
      if (!known) manifest.entries.push(entry);
    }
  }
  if (!DRY && manifest && Array.isArray(manifest.entries)) {
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  }
}

if (DRY) {
  console.log(`\n会放回 ${restored} 个文件，另有 ${notFound} 个找不到。`);
} else {
  console.log(`放回 ${restored} 个文件，另有 ${notFound} 个找不到。`);
  for (const u of unresolved.slice(0, 20)) console.log('  找不到：' + u);
  console.log('下载清单也一并补上了。');
}
