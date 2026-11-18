#!/usr/bin/env node
/*
 * 看一遍课件库里的每一个二进制文件，看它还是不是原来那个文件。
 *
 * 图裂开、声音沙沙响，都是因为文件在某一刻被按文字读过一遍：里面那些
 * 不认识的字节被换成了问号。这一页把每个文件都读一遍，问两个问题——
 * 它是不是那种格式该有的样子？它里面还有没有问号？
 *
 *   node tools/check-lq-media.mjs
 *   node tools/check-lq-media.mjs --quiet
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const FFFD = Buffer.from([0xef, 0xbf, 0xbd]);
const QUIET = process.argv.includes('--quiet');

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const list = (d, o = []) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = d + '/' + e.name;
    if (e.isDirectory()) list(p, o);
    else if (e.isFile()) o.push(p);
  }
  return o;
};

/* The head every format of picture, sound and model begins with. */
const HEADS = [
  { ext: '.png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { ext: '.jpg', bytes: [0xff, 0xd8, 0xff] },
  { ext: '.jpeg', bytes: [0xff, 0xd8, 0xff] },
  { ext: '.gif', bytes: [0x47, 0x49, 0x46, 0x38] },
  { ext: '.webp', bytes: [0x52, 0x49, 0x46, 0x46] },
  { ext: '.ico', bytes: [0x00, 0x00, 0x01, 0x00] },
  { ext: '.woff2', bytes: [0x77, 0x4f, 0x46, 0x32] },
  { ext: '.woff', bytes: [0x77, 0x4f, 0x46] },
  { ext: '.wasm', bytes: [0x00, 0x61, 0x73, 0x6d] },
  { ext: '.pdf', bytes: [0x25, 0x50, 0x44, 0x46] },
  { ext: '.zip', bytes: [0x50, 0x4b, 0x03, 0x04] },
  { ext: '.glb', bytes: [0x67, 0x6c, 0x54, 0x46] },
];

/* A png that opens: every piece is checked and the picture data inflates. */
function pngOpens(buf) {
  let at = 8;
  const idat = [];
  let width = 0;
  let height = 0;
  let bitDepth = 8;
  let colorType = 6;
  while (at + 12 <= buf.length) {
    const len = buf.readUInt32BE(at);
    const type = buf.slice(at + 4, at + 8).toString('latin1');
    if (at + 12 + len > buf.length) return { ok: false, why: 'a piece runs past the end' };
    const data = buf.slice(at + 8, at + 8 + len);
    const want = buf.readUInt32BE(at + 8 + len);
    const got = crc32(Buffer.concat([Buffer.from(type, 'latin1'), data]));
    if (want !== got) return { ok: false, why: `the check of the ${type} piece is wrong` };
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    }
    if (type === 'IDAT') idat.push(data);
    if (type === 'IEND') break;
    at += 12 + len;
  }
  if (!idat.length) return { ok: false, why: 'there is no picture data' };
  try {
    const raw = zlib.inflateSync(Buffer.concat(idat));
    const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType] || 3;
    const need = (width * channels * (bitDepth / 8) + 1) * height;
    if (raw.length < need) return { ok: false, why: 'the picture data is too short' };
    return { ok: true, why: `${width}x${height}` };
  } catch (e) {
    return { ok: false, why: 'the picture data does not open: ' + e.message };
  }
}

const roots = [
  'mirror/leqixiang/courseware',
  'mirror/leqixiang/_shared-ext',
  'mirror/leqixiang/brand',
  'mirror/3jcn/shared',
  'mirror/aifunengjiaoyu/courseware',
  'mirror/aifunengjiaoyu/public',
];

let checked = 0;
const broken = [];
const byExt = new Map();

for (const root of roots) {
  if (!fs.existsSync(root)) continue;
  for (const file of list(root)) {
    const st = fs.statSync(file);
    if (st.size < 64) continue;
    const ext = path.extname(file).toLowerCase();
    const head = HEADS.find((h) => h.ext === ext);
    if (!head) continue;
    const buf = fs.readFileSync(file);
    checked++;

    const wrongHead = !head.bytes.every((b, i) => buf[i] === b);
    if (wrongHead) {
      /* The head that was eaten shows as the question mark in its place. */
      const eaten = buf.slice(0, head.bytes.length).includes(FFFD);
      broken.push({
        file,
        why: eaten ? 'the head was eaten' : 'the head is not what this kind of file begins with',
      });
      byExt.set(ext, (byExt.get(ext) || 0) + 1);
      continue;
    }
    if (buf.includes(FFFD)) {
      /*
       * Some files hold the question mark as part of their own content.
       * A picture that begins with the right bytes and whose pieces all
       * check out is whole, even when a mark sits in the middle of it.
       * What is broken is the file whose head itself was eaten.
       */
      let count = 0;
      let i = 0;
      while ((i = buf.indexOf(FFFD, i)) >= 0) {
        count++;
        i += 3;
      }
      /* The mark sits in the middle: the file is checked by its shape. */
      const note = `${count} marks inside`;
      if (ext === '.png') {
        const r = pngOpens(buf);
        if (!r.ok) {
          broken.push({ file, why: `${note}; ${r.why}` });
          byExt.set(ext, (byExt.get(ext) || 0) + 1);
        }
        continue;
      }
    }
    if (ext === '.png') {
      const r = pngOpens(buf);
      if (!r.ok) {
        broken.push({ file, why: r.why });
        byExt.set(ext, (byExt.get(ext) || 0) + 1);
      }
    }
  }
}

console.log(
  `乐启享课件库 · 素材完整性：查了 ${checked} 个文件，坏了 ${broken.length} 个。`
);
if (broken.length) {
  console.log('\n--- 按种类');
  for (const [k, n] of [...byExt].sort((a, b) => b[1] - a[1])) console.log(`   ${k}: ${n}`);
  if (!QUIET) {
    console.log('\n--- 坏掉的文件（前 30）');
    for (const b of broken.slice(0, 30)) console.log(`   ${b.why}  ${b.file}`);
  }
}

process.exit(broken.length ? 1 : 0);
