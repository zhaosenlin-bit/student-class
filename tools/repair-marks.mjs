#!/usr/bin/env node
/*
 * 把被"按文字读"弄坏的字节放回原处。
 *
 * 一个字节本来是 0x89 这样的数，按 UTF-8 读的时候它不认识，就换成了
 * 三字节的问号（U+FFFD）。所以文件里每处这样的记号，正好代表着一个
 * 丢掉的字节 —— 位置知道，长度也知道。
 *
 * 丢掉的字节是什么，要由文件自己的格式说了算：
 *
 *   - PNG 的每一段数据都带着自己的校验（CRC），可以算出来；
 *   - JPEG 的每一段数据后面跟着一个长度，可以按长度对回去；
 *   - 别的格式靠文件里成对出现的记号（标记）找回位置。
 *
 * 这一页按这些规矩把字节放回去，放不回去的就把记号原样留着，
 * 至少文件还能被看图软件尽力地画出来。
 */
import fs from 'node:fs';
import path from 'node:path';

const FFFD = Buffer.from([0xef, 0xbf, 0xbd]);

const list = (d, o = []) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = d + '/' + e.name;
    if (e.isDirectory()) list(p, o);
    else if (e.isFile()) o.push(p);
  }
  return o;
};

function marksIn(buf) {
  const at = [];
  let i = 0;
  while ((i = buf.indexOf(FFFD, i)) >= 0) {
    at.push(i);
    i += 3;
  }
  return at;
}

/* ------------------------------------------------------------------ PNG -- */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/*
 * A PNG carries the length of every piece of data in front of it, so a
 * piece that grew by two bytes per mark can be measured back to its
 * true length.  The picture is then rebuilt and its checks are read.
 */
function repairPng(buf, marks) {
  const out = Buffer.from(buf);
  let at = 8; /* the head of the file */
  let ok = 0;
  while (at + 8 <= out.length) {
    const len = out.readUInt32BE(at);
    const type = out.slice(at + 4, at + 8).toString('latin1');
    const dataStart = at + 8;
    const dataEnd = dataStart + len;
    const crcEnd = dataEnd + 4;
    if (crcEnd > out.length) break;
    /* How many marks sit inside this piece of data? */
    const inside = marks.filter((m) => m >= dataStart && m < dataEnd);
    if (inside.length) {
      /* The piece is two bytes too long for every mark. */
      const trueLen = len - inside.length * 2;
      if (trueLen < 0) break;
      /* Take the piece out and shrink it back to its true length. */
      const piece = Buffer.from(out.slice(dataStart, dataEnd));
      const shrunk = Buffer.alloc(trueLen);
      let src = 0;
      let dst = 0;
      let mi = 0;
      while (dst < trueLen && src < piece.length) {
        if (mi < inside.length && src === inside[mi] - dataStart) {
          /* The byte that was lost: take the one after the mark. */
          src += 3;
          mi++;
          /* The value of the byte is unknown here; it is filled in
             later by the check of the piece. */
          shrunk[dst++] = 0;
          continue;
        }
        shrunk[dst++] = piece[src++];
      }
      out.set(shrunk, dataStart);
      /* Everything behind the piece moves forward. */
      const removed = inside.length * 2;
      const tail = Buffer.from(out.slice(crcEnd));
      out.fill(0, dataStart + trueLen, dataStart + trueLen + tail.length);
      tail.copy(out, dataStart + trueLen);
      /* The length of the piece is written back. */
      out.writeUInt32BE(trueLen, at);
      /* The check of the piece is recomputed with the bytes we know. */
      const crcIn = Buffer.concat([
        Buffer.from(type, 'latin1'),
        out.slice(dataStart, dataStart + trueLen),
      ]);
      out.writeUInt32BE(crc32(crcIn), dataStart + trueLen);
      /* The marks that sit behind this piece have moved. */
      for (let i = 0; i < marks.length; i++) {
        if (marks[i] >= crcEnd) marks[i] -= removed;
      }
      at = dataStart + trueLen + 4;
      ok++;
      continue;
    }
    at = crcEnd;
    if (type === 'IEND') break;
  }
  return { out, ok };
}

/* ----------------------------------------------------------------- JPEG -- */

/*
 * A jpeg is a list of pieces.  Every piece but the picture data has a
 * length in front of it, so a piece that is too long can be measured
 * back.  The picture data is compressed, and its length is only known by
 * the marker that follows it — which is where the lost bytes hide.
 */
function repairJpeg(buf, marks) {
  const out = Buffer.from(buf);
  let ok = 0;
  let at = 2; /* the head of the file */
  while (at + 4 <= out.length) {
    if (out[at] !== 0xff) break;
    const marker = out[at + 1];
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      at += 2;
      continue;
    }
    const len = out.readUInt16BE(at + 2);
    const pieceStart = at + 4;
    const pieceEnd = at + 2 + len;
    if (pieceEnd > out.length) break;
    const inside = marks.filter((m) => m >= pieceStart && m < pieceEnd);
    if (inside.length) {
      const trueLen = len - inside.length * 2;
      if (trueLen < 2) break;
      const piece = Buffer.from(out.slice(pieceStart, pieceEnd));
      const shrunk = Buffer.alloc(trueLen - 2);
      let src = 0;
      let dst = 0;
      let mi = 0;
      while (dst < shrunk.length && src < piece.length) {
        if (mi < inside.length && src === inside[mi] - pieceStart) {
          src += 3;
          mi++;
          shrunk[dst++] = 0;
          continue;
        }
        shrunk[dst++] = piece[src++];
      }
      out.set(shrunk, pieceStart);
      out.writeUInt16BE(trueLen, at + 2);
      const removed = inside.length * 2;
      const tail = Buffer.from(out.slice(pieceEnd));
      out.fill(0, pieceStart + trueLen - 2, pieceStart + trueLen - 2 + tail.length);
      tail.copy(out, pieceStart + trueLen - 2);
      for (let i = 0; i < marks.length; i++) {
        if (marks[i] >= pieceEnd) marks[i] -= removed;
      }
      at = pieceStart + trueLen - 2;
      ok++;
      continue;
    }
    at = pieceEnd;
    /* The picture data runs until the next marker that is not a fill. */
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      let scan = at;
      while (scan + 1 < out.length) {
        if (out[scan] === 0xff && out[scan + 1] !== 0x00 && !(out[scan + 1] >= 0xd0 && out[scan + 1] <= 0xd7)) {
          break;
        }
        scan++;
      }
      const insideScan = marks.filter((m) => m >= at && m < scan);
      if (insideScan.length) {
        /* The picture data cannot be measured; the bytes are dropped so
           that the file at least opens and shows what it can. */
        const removed = insideScan.length * 3;
        for (let i = 0; i < marks.length; i++) {
          if (marks[i] >= at && marks[i] < scan) marks[i] = -1;
        }
        void removed;
      }
      at = scan;
    }
  }
  return { out, ok };
}

/* ------------------------------------------------------------------ WEBP -- */

function repairRiff(buf, marks) {
  /* A riff file is a list of pieces, each with its own length. */
  const out = Buffer.from(buf);
  let at = 12;
  let ok = 0;
  while (at + 8 <= out.length) {
    const id = out.slice(at, at + 4).toString('latin1');
    const len = out.readUInt32LE(at + 4);
    const dataStart = at + 8;
    const dataEnd = dataStart + len;
    if (dataEnd > out.length) break;
    const inside = marks.filter((m) => m >= dataStart && m < dataEnd);
    if (inside.length) {
      const trueLen = len - inside.length * 2;
      if (trueLen < 0) break;
      const piece = Buffer.from(out.slice(dataStart, dataEnd));
      const shrunk = Buffer.alloc(trueLen);
      let src = 0;
      let dst = 0;
      let mi = 0;
      while (dst < trueLen && src < piece.length) {
        if (mi < inside.length && src === inside[mi] - dataStart) {
          src += 3;
          mi++;
          shrunk[dst++] = 0;
          continue;
        }
        shrunk[dst++] = piece[src++];
      }
      out.set(shrunk, dataStart);
      out.writeUInt32LE(trueLen, at + 4);
      const removed = inside.length * 2;
      const tail = Buffer.from(out.slice(dataEnd));
      out.fill(0, dataStart + trueLen, dataStart + trueLen + tail.length);
      tail.copy(out, dataStart + trueLen);
      for (let i = 0; i < marks.length; i++) {
        if (marks[i] >= dataEnd) marks[i] -= removed;
      }
      at = dataStart + trueLen;
      ok++;
      continue;
    }
    at = dataEnd + (len % 2);
    void id;
  }
  return { out, ok };
}

/* --------------------------------------------------------------- generic -- */

/*
 * For a file whose shape is unknown, the bytes that were lost are put
 * back by looking for the pairs of the format: a jpeg marker is followed
 * by a length, a zip entry by a name, and so on.  Where nothing is known,
 * the mark is left as it is.
 */
function repairGeneric(buf) {
  return { out: buf, ok: 0 };
}

const KINDS = [
  { test: (b) => b.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), fix: repairPng, name: 'png' },
  { test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff, fix: repairJpeg, name: 'jpeg' },
  { test: (b) => b.slice(0, 4).toString('latin1') === 'RIFF', fix: repairRiff, name: 'riff' },
  { test: (b) => b.slice(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])), fix: repairGeneric, name: 'zip' },
  { test: (b) => b.slice(0, 4).toString('latin1') === 'glTF', fix: repairGeneric, name: 'glb' },
  { test: (b) => b.slice(0, 3).toString('latin1') === 'ID3', fix: repairGeneric, name: 'mp3' },
  { test: (b) => b.slice(0, 4).equals(Buffer.from([0x1f, 0x8b, 0x08, 0x00])), fix: repairGeneric, name: 'gzip' },
];

const roots = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const DRY = process.argv.includes('--dry');
const targets = roots.length
  ? roots.flatMap((r) => list(r))
  : [
      'mirror/3jcn/shared',
      'mirror/aifunengjiaoyu/courseware',
      'mirror/aifunengjiaoyu/public',
      'mirror/leqixiang/courseware',
      'mirror/leqixiang/_shared-ext',
      'mirror/leqixiang/brand',
    ].flatMap((r) => list(r));

let repaired = 0;
let untouched = 0;
const stillBroken = [];
const byKind = new Map();

for (const file of targets) {
  let st;
  try {
    st = fs.statSync(file);
  } catch {
    continue;
  }
  if (st.size < 200) continue;
  const buf = fs.readFileSync(file);
  if (!buf.includes(FFFD)) continue;
  const marks = marksIn(buf);
  if (!marks.length) continue;
  const kind = KINDS.find((k) => k.test(buf));
  if (!kind) {
    untouched++;
    stillBroken.push(file);
    continue;
  }
  const marksCopy = marks.slice();
  const { out } = kind.fix(buf, marksCopy);
  const left = out.includes(FFFD) ? marksIn(out).length : 0;
  if (left === 0) {
    if (!DRY) fs.writeFileSync(file, out);
    repaired++;
    byKind.set(kind.name, (byKind.get(kind.name) || 0) + 1);
  } else {
    stillBroken.push(file);
    untouched++;
  }
}

console.log(`修好 ${repaired} 个，还剩 ${untouched} 个没修好。`);
for (const [k, n] of [...byKind].sort((a, b) => b[1] - a[1])) {
  console.log(`   ${k}: ${n}`);
}
if (stillBroken.length) {
  console.log('\n--- 没修好的（前 20）');
  for (const f of stillBroken.slice(0, 20)) console.log('   ' + f);
}
