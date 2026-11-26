#!/usr/bin/env node
/*
 * 把收拢时弄坏的课件放回原样。
 *
 * 收拢把重复的副本收进 shared/ 之后，个别课件会在运行的时候按名字
 * 去找文件——这种名字静态看不见，收走以后就找不到了。验收会把这样的
 * 课件挑出来；这个工具照着验收记录，把这些课件整个放回没收拢之前的
 * 样子。
 *
 * 放回去的课件自己留着全部文件，一样能打开、能下载；别的课件继续用
 * shared/ 里的那一份，不受影响。
 *
 *   node tools/repair-hoisted.mjs --root dist --backup work/dist-backup \
 *        --receipts receipts/hoist-2026-11-26.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const ROOT = path.resolve(arg('root', path.join(HERE, '..', 'dist')));
const BACKUP = path.resolve(arg('backup', path.join(HERE, '..', 'work', 'dist-backup')));
const RECEIPTS = arg('receipts', '');
const DRY = args.includes('--dry');

if (!fs.existsSync(BACKUP)) {
  console.error('没有找到收拢之前的备份：' + BACKUP);
  process.exit(1);
}

const files = (dir) => {
  const out = [];
  const walk = (d, rel) => {
    for (const it of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, it.name);
      const r = rel ? rel + '/' + it.name : it.name;
      if (it.isDirectory()) walk(p, r);
      else out.push(r);
    }
  };
  walk(dir, '');
  return out;
};

const ids = new Set();
if (RECEIPTS) {
  const data = JSON.parse(fs.readFileSync(RECEIPTS, 'utf8'));
  for (const f of data.failures || []) if (f.id) ids.add(f.id);
}
for (const id of String(arg('only', '')).split(',').map((s) => s.trim()).filter(Boolean)) {
  ids.add(id);
}

if (!ids.size) {
  console.log('没有要放回的课件。');
  process.exit(0);
}

let restored = 0;
let bytes = 0;
for (const id of ids) {
  const from = path.join(BACKUP, 'courseware', id);
  const to = path.join(ROOT, 'courseware', id);
  if (!fs.existsSync(from)) {
    console.log('  跳过（备份里没有）：' + id);
    continue;
  }
  /* 整门课放回原样：先把这门课现在的东西清掉，再照原件铺回去。 */
  if (!DRY) {
    fs.rmSync(to, { recursive: true, force: true });
    fs.mkdirSync(to, { recursive: true });
  }
  for (const rel of files(from)) {
    const src = path.join(from, rel);
    const dst = path.join(to, rel);
    if (!fs.existsSync(src)) {
      console.log('  备份里没有：' + id + '/' + rel);
      continue;
    }
    bytes += fs.statSync(src).size;
    if (DRY) continue;
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
  }
  restored += 1;
}

console.log(
  `放回 ${restored} 门课件，共 ${(bytes / 1048576).toFixed(0)} MB` + (DRY ? '（只算不动）' : '')
);
