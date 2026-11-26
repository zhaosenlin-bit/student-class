#!/usr/bin/env node
/*
 * 把成品里"一模一样却存了两遍"的文件合并成一份。
 *
 * 收拢素材的时候，同一份资源在 shared/ 里有一份，在用到它的课件
 * 目录下又有一份。字节完全一样，名字也占着两个位置，磁盘却白占
 * 了两倍。这里把后者变成前者的硬链接：两个路径都在，内容一模一样，
 * 可磁盘上只存一份。
 *
 * 这样做的好处是页面、样式表里写的地址一个字都不用改——路径还是
 * 原来那个路径，取到的还是原来那份字节。
 *
 * 只处理素材（图片、声音、视频、模型、数据这类二进制），不碰
 * html / js / css / json：那些文件是要改的，链接在一起会互相牵动。
 *
 *   node tools/link-duplicates.mjs --root dist --dry   # 只算，不动
 *   node tools/link-duplicates.mjs --root dist         # 真的合并
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const ROOT = path.resolve(arg('root', path.join(HERE, '..', 'dist')));
const DRY = args.includes('--dry');

/* 小于这个大小的不值得费事。 */
const MIN_SIZE = Number(arg('min', 64 * 1024));

/* 只碰素材，不碰要改的代码和清单。 */
const ASSET = /\.(png|jpe?g|gif|webp|avif|bmp|ico|mp3|wav|ogg|m4a|aac|mp4|webm|mov|glb|gltf|bin|wasm|tflite|task|ttf|otf|woff2?|pdf|ply|obj|stl|fbx|terrain|gz|zip|dta|dat)$/i;

const files = [];
(function walk(dir, rel = '') {
  for (const it of fs.readdirSync(dir, { withFileTypes: true })) {
    const r = rel ? rel + '/' + it.name : it.name;
    const abs = path.join(dir, it.name);
    if (it.isDirectory()) walk(abs, r);
    else files.push({ rel: r, abs, size: fs.statSync(abs).size });
  }
})(ROOT);

const byHash = new Map();
for (const f of files) {
  if (f.size < MIN_SIZE) continue;
  if (!ASSET.test(f.rel)) continue;
  const h = crypto.createHash('sha1').update(fs.readFileSync(f.abs)).digest('hex');
  if (!byHash.has(h)) byHash.set(h, []);
  byHash.get(h).push(f);
}

let linked = 0;
let bytes = 0;
const done = [];
const failed = [];

for (const [, list] of byHash) {
  if (list.length < 2) continue;
  /*
   * 留一份真的，其余的做成链接。
   * 留的那一份优先选共享目录里的——共享目录是收拢素材时放的地方，
   * 课件目录里改的多，让共享目录当"本体"更稳当。
   */
  const ordered = [...list].sort((a, b) =>
    a.rel.startsWith('shared/') === b.rel.startsWith('shared/')
      ? a.rel.localeCompare(b.rel)
      : a.rel.startsWith('shared/')
        ? -1
        : 1
  );
  const keep = ordered[0];
  for (const f of ordered.slice(1)) {
    try {
      if (!DRY) {
        const tmp = f.abs + '.link-tmp';
        if (fs.existsSync(tmp)) fs.rmSync(tmp, { force: true });
        fs.linkSync(keep.abs, tmp);
        fs.rmSync(f.abs, { force: true });
        fs.renameSync(tmp, f.abs);
      }
      linked++;
      bytes += f.size;
      done.push(f.rel);
    } catch (e) {
      failed.push(f.rel + '  ' + e.message);
    }
  }
}

console.log(
  (DRY ? '可以合并 ' : '合并了 ') +
    linked +
    ' 个文件，省下 ' +
    (bytes / 1048576).toFixed(1) +
    ' MB'
);
if (failed.length) {
  console.log('合并不了的：');
  for (const f of failed.slice(0, 20)) console.log('  ' + f);
}
if (DRY) {
  const byDir = new Map();
  for (const rel of done) {
    const top = rel.split('/').slice(0, 3).join('/');
    byDir.set(top, (byDir.get(top) || 0) + 1);
  }
  console.log('\n按去处分：');
  for (const [k, v] of [...byDir].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log('  ' + String(v).padStart(5) + '  ' + k);
}
