#!/usr/bin/env node
/*
 * 把成品打成一个部署包。
 *
 *   node tools/pack-static.mjs --root dist --out C:\kaifa\deploy-pkg
 *
 * 包里最外面一层是 leqixiang/，解开就是能直接挂到网站目录下的那一层。
 *
 * 打包用的是 tar（bsdtar）。有一处要讲究：
 *
 *   --options zip:hdrcharset=UTF-8
 *
 * 课件里有 15 门课的封面图，路径的目录名里带表情符号。不加这一句，
 * bsdtar 会按本机编码处理名字，解出来这些目录名里的表情符号会变成
 * 下划线，图片就取不到了。加了这一句，名字按 UTF-8 存，并且在 zip
 * 里置上 UTF-8 标志位，Linux 上用 unzip 解出来也是对的。
 *
 * 打完包会解开一遍，把里面的每一个文件和成品逐一对照，
 * 名字和内容都要一样。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};

const ROOT = path.resolve(arg('root', 'dist'));
const OUT_DIR = path.resolve(arg('out', path.join(process.cwd(), 'deploy-pkg')));
const NAME = arg('name', 'leqixiang');
const KEEP = args.includes('--keep');

if (!fs.existsSync(ROOT)) {
  console.error(`找不到成品目录：${ROOT}`);
  process.exit(2);
}
fs.mkdirSync(OUT_DIR, { recursive: true });

/* 按本地的日子算，跨时区的时候包名才和人对得上。 */
const now = new Date();
const day = [
  now.getFullYear(),
  String(now.getMonth() + 1).padStart(2, '0'),
  String(now.getDate()).padStart(2, '0'),
].join('-');
const ZIP = path.join(OUT_DIR, `${NAME}-${day}.zip`);

/* ---------------------------------------------------------------- */

const walk = (dir, base = '', acc = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) walk(path.join(dir, e.name), rel, acc);
    else acc.push(rel);
  }
  return acc;
};

const sha = (file) => {
  const h = crypto.createHash('sha256');
  const fd = fs.openSync(file, 'r');
  const buf = Buffer.alloc(1 << 20);
  let n;
  while ((n = fs.readSync(fd, buf, 0, buf.length, null)) > 0) h.update(buf.subarray(0, n));
  fs.closeSync(fd);
  return h.digest('hex');
};

const tar = (argv) => execFileSync('tar.exe', argv, { stdio: ['ignore', 'inherit', 'inherit'] });

/* ---------------------------------------------------------------- */
/*
 * 只核对一个已有的包，不重新打：
 *   node tools/pack-static.mjs --verify C:\path\to\leqixiang.zip
 */
const VERIFY_ONLY = arg('verify', '');

/* ---------------------------------------------------------------- */
/*
 * 包里最外面要有 leqixiang/ 这一层，而成品目录本身叫 dist。
 * 用一个目录联接把名字对上，tar 跟着它走（-h），内容原样收进去。
 */
let stage = null;
if (VERIFY_ONLY) {
  console.log(`只核对：${VERIFY_ONLY}`);
} else {
  stage = fs.mkdtempSync(path.join(os.tmpdir(), 'leqixiang-pack-'));
  const link = path.join(stage, NAME);
  try {
    fs.symlinkSync(ROOT, link, 'junction');
  } catch (e) {
    console.error('建不了目录联接：', e.message);
    console.error('可以自己建一个：', `mklink /J "${link}" "${ROOT}"`);
    process.exit(2);
  }

  if (fs.existsSync(ZIP)) fs.rmSync(ZIP, { force: true });

  console.log(`打包：${ROOT}`);
  console.log(`  → ${ZIP}`);
  const started = Date.now();
  tar(['-a', '-cf', ZIP, '--options', 'zip:hdrcharset=UTF-8', '-h', '-C', stage, NAME]);
  console.log(`打包用了 ${Math.round((Date.now() - started) / 1000)} 秒。`);
}

const PACK = VERIFY_ONLY || ZIP;

/* ---------------------------------------------------------------- */
/* 解开一遍，一个文件一个文件地对照。 */

const check = fs.mkdtempSync(path.join(os.tmpdir(), 'leqixiang-check-'));
console.log('');
console.log('解开核对…');
tar(['-xf', PACK, '-C', check]);

const unpacked = walk(path.join(check, NAME));
const original = walk(ROOT);

let wrongName = 0;
let wrongBody = 0;
for (const rel of original) {
  const a = path.join(check, NAME, rel);
  const b = path.join(ROOT, rel);
  if (!fs.existsSync(a)) { wrongName += 1; continue; }
  if (sha(a) !== sha(b)) wrongBody += 1;
}
const extra = unpacked.length - original.length;

console.log(`  成品 ${original.length} 个文件，包里 ${unpacked.length} 个`);
console.log(`  名字对不上：${wrongName}`);
console.log(`  内容对不上：${wrongBody}`);

/* 名字里带非 ASCII 的条目，都要置 UTF-8 标志位。 */
const { nonAscii, flagged, samples } = scanZipNames(PACK);
console.log(`  名字带非 ASCII 的条目：${nonAscii}，置了 UTF-8 标志位的：${flagged}`);
for (const s of samples) console.log(`    ${s.ok ? '好' : '差'}  ${s.name}`);

fs.rmSync(check, { recursive: true, force: true });
if (stage && !KEEP) fs.rmSync(stage, { recursive: true, force: true });

const ok = wrongName === 0 && wrongBody === 0 && extra === 0 && nonAscii === flagged;
console.log('');
console.log(ok
  ? '打包完成，包里的东西和成品一模一样。'
  : '有问题，包和成品对不上。');
process.exitCode = ok ? 0 : 1;

/* ---------------------------------------------------------------- */
/*
 * 读 zip 末尾的中央目录，把文件名字和标志位拿出来。
 *
 * 包有两三个 G，整包读进内存读不动。中央目录只有几兆，
 * 而且它记着每一个文件的名字和标志位——要找的就是这两样。
 * 包超过 4 G 的时候用的是 zip64，头和尾各多一段记录，一并认。
 */
function scanZipNames(file) {
  const fd = fs.openSync(file, 'r');
  const size = fs.fstatSync(fd).size;

  const readAt = (offset, length) => {
    const buf = Buffer.alloc(length);
    fs.readSync(fd, buf, 0, length, offset);
    return buf;
  };

  /* 末尾记录：在文件尾巴上往回找。 */
  const tailLen = Math.min(size, 65557 + 22);
  const tail = readAt(size - tailLen, tailLen);
  let eocd = -1;
  for (let i = tail.length - 22; i >= 0; i -= 1) {
    if (tail.readUInt32LE(i) === 0x06054b50) {
      const comment = tail.readUInt16LE(i + 20);
      if (i + 22 + comment === tail.length) { eocd = i; break; }
    }
  }
  if (eocd < 0) throw new Error('zip 末尾记录找不到了');

  let cdSize = tail.readUInt32LE(eocd + 12);
  let cdOffset = tail.readUInt32LE(eocd + 16);

  /* zip64：偏移和大小在另一段记录里。 */
  if (cdSize === 0xffffffff || cdOffset === 0xffffffff) {
    const locPos = size - tailLen + eocd - 20;
    const loc = readAt(locPos, 20);
    if (loc.readUInt32LE(0) !== 0x07064b50) throw new Error('zip64 定位记录不对');
    const rec = readAt(Number(loc.readBigUInt64LE(8)), 56);
    if (rec.readUInt32LE(0) !== 0x06064b50) throw new Error('zip64 末尾记录不对');
    cdSize = Number(rec.readBigUInt64LE(40));
    cdOffset = Number(rec.readBigUInt64LE(48));
  }

  const cd = readAt(cdOffset, cdSize);
  let nonAscii = 0;
  let flagged = 0;
  const samples = [];
  let p = 0;
  while (p + 46 <= cd.length && cd.readUInt32LE(p) === 0x02014b50) {
    const flags = cd.readUInt16LE(p + 8);
    const nameLen = cd.readUInt16LE(p + 28);
    const extraLen = cd.readUInt16LE(p + 30);
    const commentLen = cd.readUInt16LE(p + 32);
    const name = cd.toString('utf8', p + 46, p + 46 + nameLen);
    if (/[\u0080-\uFFFF]/.test(name)) {
      nonAscii += 1;
      const ok = Boolean(flags & 0x800);
      if (ok) flagged += 1;
      if (samples.length < 4) samples.push({ name, ok });
    }
    p += 46 + nameLen + extraLen + commentLen;
  }

  fs.closeSync(fd);
  return { nonAscii, flagged, samples };
}
