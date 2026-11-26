#!/usr/bin/env node
/*
 * Merges the materials that are held twice.
 *
 * The material for the lessons is collected from more than one place,
 * and a good deal of it turns up again — the same bytes, under
 * another name, in another folder.  Every one of those copies takes
 * room on the disk.
 *
 * Here the copies are turned into links: the path stays, the bytes
 * stay, and the disk keeps one copy.  Nothing that points at a file
 * has to change, and the folder still holds everything it held.
 *
 * The files that are written by hand — pages, scripts, stylesheets,
 * data — are left alone: linking those would make an edit in one
 * place show up in another.
 *
 *   node tools/link-materials.mjs --from mirror/studio/courseware \
 *        --against mirror/leqixiang/courseware,mirror/leqixiang/_shared-ext --dry
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const FROM = path.resolve(arg('from', ''));
const AGAINST = (arg('against', '') || '')
  .split(',')
  .map((p) => path.resolve(p.trim()))
  .filter(Boolean);
const DRY = args.includes('--dry');
/* The material that is collected from elsewhere can be linked as well. */
const INCLUDE_HAND = args.includes('--include-hand');

/* The files that are written by hand. */
const HAND = /\.(html?|json|js|mjs|css|map)$/i;

const walk = (dir) => {
  const out = [];
  let items = [];
  try {
    items = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const it of items) {
    const full = path.join(dir, it.name);
    if (it.isDirectory()) out.push(...walk(full));
    else if (it.isFile()) out.push(full);
  }
  return out;
};

const hash = (file) =>
  new Promise((resolve, reject) => {
    const h = crypto.createHash('sha1');
    const s = fs.createReadStream(file);
    s.on('data', (c) => h.update(c));
    s.on('end', () => resolve(h.digest('hex')));
    s.on('error', reject);
  });

if (!FROM || !AGAINST.length) {
  console.error('Give --from and --against.');
  process.exit(1);
}

/* The content that is already held somewhere else. */
const held = new Map();
for (const root of AGAINST) {
  for (const file of walk(root)) {
    if (HAND.test(file)) continue;
    const digest = await hash(file);
    if (!held.has(digest)) held.set(digest, file);
  }
  console.log(`已读 ${root}`);
}

let linked = 0;
let bytes = 0;
let skipped = 0;

for (const file of walk(FROM)) {
  if (HAND.test(file) && !INCLUDE_HAND) {
    skipped++;
    continue;
  }
  const digest = await hash(file);
  const keep = held.get(digest);
  if (!keep) continue;
  const size = fs.statSync(file).size;
  if (DRY) {
    linked++;
    bytes += size;
    continue;
  }
  const tmp = file + '.link-tmp';
  try {
    if (fs.existsSync(tmp)) fs.rmSync(tmp, { force: true });
    fs.linkSync(keep, tmp);
    fs.rmSync(file, { force: true });
    fs.renameSync(tmp, file);
    linked++;
    bytes += size;
  } catch (e) {
    if (fs.existsSync(tmp)) fs.rmSync(tmp, { force: true });
    console.error('合并不了：', file, e.message);
  }
}

console.log(
  `${DRY ? '可以合并' : '已合并'} ${linked} 个文件，省下 ${(bytes / 1024 / 1024).toFixed(1)} MB；手写的文件跳过 ${skipped} 个`
);
