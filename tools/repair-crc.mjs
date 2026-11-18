#!/usr/bin/env node
/*
 * Put the lost bytes back by using the check that the file carries.
 *
 * A png gives every piece of its data a check of its own: the number
 * that says "these bytes are the ones I meant".  When a byte was eaten,
 * the check does not match any more — but the check is enough to say
 * what the byte was, because the rest of the piece is known.
 *
 * For every byte that was lost, the value that makes the check come out
 * right is found by trying the 256 possible values and keeping the one
 * that matches.  The file is then put back together, and the check of
 * every piece is read once more to be sure.
 *
 *   node tools/repair-crc.mjs
 *   node tools/repair-crc.mjs --dry
 */
import fs from 'node:fs';
import path from 'node:path';

const FFFD = Buffer.from([0xef, 0xbf, 0xbd]);
const DRY = process.argv.includes('--dry');

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

/*
 * The pieces of a png.
 *
 * The bytes that were eaten sit in the data of a piece.  The piece says
 * how long its data is, and the check at its end says what the data
 * should be.  When the data is short by one byte, the piece is put
 * back together and the missing byte is looked for.
 */
function repairPng(buf) {
  const marks = marksIn(buf);
  if (!marks.length) return { out: buf, fixed: 0, why: 'no marks' };

  /* The head must be whole, or the file cannot be read at all. */
  if (!buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { out: buf, fixed: 0, why: 'the head of the file was eaten' };
  }

  let out = Buffer.from(buf);
  let at = 8;
  let fixed = 0;

  while (at + 12 <= out.length) {
    const len = out.readUInt32BE(at);
    const type = out.slice(at + 4, at + 8).toString('latin1');
    const dataStart = at + 8;
    /*
     * The length that the piece carries is the length it was written
     * with.  A piece that holds a mark is longer on the disk by two
     * bytes for every mark, because a mark is three bytes long where a
     * byte was.
     */
    const marksHere = marks.filter((m) => m >= dataStart && m < dataStart + len + 3 * 64);
    const grown = marksHere.filter((m) => m < dataStart + len + marksHere.length * 2);
    const dataEnd = dataStart + len + grown.length * 2;
    if (dataEnd + 4 > out.length) break;

    const inside = marks.filter((m) => m >= dataStart && m < dataEnd);
    if (!inside.length) {
      at = dataEnd + 4;
      if (type === 'IEND') break;
      continue;
    }

    /* The piece is two bytes too long for every mark that is in it. */
    const trueLen = len - inside.length * 2;
    if (trueLen < 0) break;

    /* The data of the piece, with the lost bytes taken out. */
    const data = Buffer.alloc(trueLen);
    const holes = [];
    let src = dataStart;
    let dst = 0;
    for (const m of inside) {
      const hole = dst;
      out.copy(data, dst, src, m);
      dst += m - src;
      src = m + 3;
      holes.push(hole);
    }
    out.copy(data, dst, src, dataEnd);

    /*
     * The check at the end of the piece says what the data should be.
     * One byte at a time, the value that makes the check come out right
     * is looked for.
     */
    const want = out.readUInt32BE(dataEnd);
    const typeBytes = Buffer.from(type, 'latin1');
    let ok = true;
    for (const hole of holes) {
      let found = false;
      for (let v = 0; v < 256; v++) {
        data[hole] = v;
        if (crc32(Buffer.concat([typeBytes, data])) === want) {
          found = true;
          break;
        }
      }
      if (!found) {
        ok = false;
        break;
      }
    }
    if (!ok) {
      /* The piece cannot be read back; the file is left as it was. */
      return { out: buf, fixed, why: 'the check of the ' + type + ' piece does not fit' };
    }

    /* The piece is put back, and everything behind it moves forward. */
    out.fill(0, dataStart, dataEnd + 4);
    data.copy(out, dataStart);
    out.writeUInt32BE(trueLen, at);
    out.writeUInt32BE(want, dataStart + trueLen);

    const removed = inside.length * 2;
    for (let i = 0; i < marks.length; i++) {
      if (marks[i] >= dataEnd) marks[i] -= removed;
    }
    fixed += inside.length;
    at = dataStart + trueLen + 4;
    if (type === 'IEND') break;
  }

  /* The file is read back once more to be sure it is whole. */
  const check = pngWhole(out);
  if (!check.ok) return { out: buf, fixed, why: check.why };
  return { out, fixed, why: 'good' };
}

/* Every piece of a png, and the check of each, is read once more. */
function pngWhole(buf) {
  let at = 8;
  while (at + 12 <= buf.length) {
    const len = buf.readUInt32BE(at);
    const type = buf.slice(at + 4, at + 8).toString('latin1');
    if (at + 12 + len > buf.length) return { ok: false, why: 'a piece runs past the end' };
    const data = buf.slice(at + 8, at + 8 + len);
    const want = buf.readUInt32BE(at + 8 + len);
    const got = crc32(Buffer.concat([Buffer.from(type, 'latin1'), data]));
    if (want !== got) return { ok: false, why: 'the check of the ' + type + ' piece is wrong' };
    if (type === 'IEND') return { ok: true, why: 'good' };
    at += 12 + len;
  }
  return { ok: false, why: 'the file ends in the middle' };
}

const roots = [
  'mirror/leqixiang/courseware',
  'mirror/leqixiang/_shared-ext',
  'mirror/leqixiang/brand',
  'mirror/3jcn/shared',
  'mirror/aifunengjiaoyu/courseware',
  'mirror/aifunengjiaoyu/public',
];

const targets = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const files = targets.length
  ? targets.flatMap((r) => list(r))
  : roots.flatMap((r) => (fs.existsSync(r) ? list(r) : []));

let fixed = 0;
let failed = 0;
const failedFiles = [];
const before = new Map();

for (const file of files) {
  let st;
  try {
    st = fs.statSync(file);
  } catch {
    continue;
  }
  if (st.size < 200) continue;
  const buf = fs.readFileSync(file);
  if (!buf.includes(FFFD)) continue;
  /* Only a picture that begins with the bytes of a png can be read. */
  if (!buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    continue;
  }
  const r = repairPng(buf);
  if (r.why === 'good') {
    before.set(file, st.size);
    if (!DRY) fs.writeFileSync(file, r.out);
    fixed++;
  } else {
    failed++;
    failedFiles.push({ file, why: r.why });
  }
}

console.log(`修好 ${fixed} 个，修不好 ${failed} 个。`);
if (failedFiles.length) {
  console.log('\n--- 修不好的（前 20）');
  for (const f of failedFiles.slice(0, 20)) console.log(`   ${f.why}  ${f.file}`);
}
