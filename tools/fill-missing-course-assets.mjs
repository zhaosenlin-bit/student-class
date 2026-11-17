#!/usr/bin/env node
/*
 * Put something in the place of a file that is behind the trial limit.
 *
 * A few works load their material and their data in one go:
 *
 *   const [materials, questionBank] = await Promise.all([
 *     new MaterialSystem(renderer).load(),
 *     new QuestionBank().load(),
 *   ]);
 *
 * One missing texture is enough to throw the whole promise away, and the
 * book is never built.  The page still answers, so the course looks like
 * it opened — but there is nothing in it.
 *
 * The original files sit behind the trial limit of the platform, so they
 * cannot be fetched.  What is put in their place is not a copy of them:
 * the textures are drawn here, and the question bank carries the chapter
 * names the course itself declares with no questions in it, so the course
 * opens, the book turns and the intro works, and the chapter that needed
 * the original bank simply has no quiz.
 *
 *   node tools/fill-missing-course-assets.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CW = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'courseware');

/* ---------------------------------------------------------- PNG 编码 */
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const head = Buffer.alloc(4);
  head.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([head, body, crc]);
}

/* A picture is written by hand: truecolour with an alpha channel. */
function writePng(file, width, height, pixel) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  const row = Buffer.alloc(width * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixel(x, y, width, height);
      row[x * 4] = r;
      row[x * 4 + 1] = g;
      row[x * 4 + 2] = b;
      row[x * 4 + 3] = a;
    }
    raw[y * (width * 4 + 1)] = 0;
    row.copy(raw, y * (width * 4 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, png);
}

/* A number that does not repeat, so the picture has some grain. */
function grain(x, y, seed) {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return (n - Math.floor(n)) * 2 - 1;
}

const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));

/* ---------------------------------------------------------- 贴图 */
const TEXTURES = {
  /* The board of the cover: a dark cloth with a lighter panel. */
  'assets/textures/book_cover_diffuse.png': {
    width: 256,
    height: 256,
    pixel: (x, y, w, h) => {
      const edge = x < 10 || y < 10 || x > w - 11 || y > h - 11;
      const panel = x > 34 && x < w - 34 && y > 34 && y < h - 34;
      const g = grain(x, y, 3) * 4;
      if (edge) return [clamp(92 + g), clamp(54 + g), clamp(38 + g), 255];
      if (panel) return [clamp(206 + g), clamp(186 + g), clamp(142 + g), 255];
      return [clamp(118 + g), clamp(72 + g), clamp(48 + g), 255];
    },
  },
  /* Paper: cream with a few fibres. */
  'assets/textures/paper_texture.png': {
    width: 160,
    height: 192,
    pixel: (x, y) => {
      const g = grain(x, y, 11) * 6 + grain(x * 3, y * 3, 17) * 3;
      return [clamp(228 + g), clamp(216 + g), clamp(188 + g), 255];
    },
  },
  /* The spine: a darker band with a stitched seam. */
  'assets/textures/spine_texture.png': {
    width: 64,
    height: 128,
    pixel: (x, y) => {
      const g = grain(x, y, 23) * 5;
      const seam = x > 26 && x < 33 ? 18 : 0;
      return [clamp(104 + g + seam), clamp(62 + g + seam), clamp(40 + g + seam), 255];
    },
  },
  /* The gilt: a small lattice of gold. */
  'assets/textures/gold_pattern.png': {
    width: 64,
    height: 64,
    pixel: (x, y) => {
      const lattice =
        (x % 16 < 2 && y % 16 < 2) || (x % 16 >= 8 && x % 16 < 10 && y % 16 >= 8 && y % 16 < 10);
      const g = grain(x, y, 31) * 5;
      if (lattice) return [clamp(206 + g), clamp(170 + g), clamp(86 + g), 255];
      return [clamp(150 + g), clamp(120 + g), clamp(62 + g), 255];
    },
  },
};

/* ---------------------------------------------------------- 题库 */
/*
 * The bank holds one entry per chapter of the book.  The chapter names
 * come from the course's own chapter list, so the shape is the one the
 * course expects.  No question text is invented: a chapter whose
 * questions are missing simply has no quiz.
 */
const CHAPTER_KEYS = [
  'shuowen',
  'zhouyi',
  'shangshu',
  'shijing',
  'sanjia',
  'chunqiu',
  'sishu',
  'zhanguo',
  'shiji',
  'zhuzi',
  'cifu',
  'shi',
  'wen',
];

const DATA_FILES = {
  'src/data/questions/classic_changtan.json': () =>
    JSON.stringify(
      {
        chapters: CHAPTER_KEYS.map((chapterKey) => ({ chapterKey, questions: [] })),
      },
      null,
      2
    ),
};

/* ---------------------------------------------------------- 写入 */
const COURSES = ['616'];

let written = 0;
for (const id of COURSES) {
  const dir = path.join(CW, `${id}.assets`);
  if (!fs.existsSync(dir)) continue;

  for (const [rel, spec] of Object.entries(TEXTURES)) {
    const file = path.join(dir, rel);
    if (fs.existsSync(file)) continue;
    writePng(file, spec.width, spec.height, spec.pixel);
    written += 1;
    console.log(`${id}: ${rel}（${spec.width}×${spec.height} 占位贴图）`);
  }

  for (const [rel, make] of Object.entries(DATA_FILES)) {
    const file = path.join(dir, rel);
    if (fs.existsSync(file)) continue;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, make());
    written += 1;
    console.log(`${id}: ${rel}（章节骨架，无题目）`);
  }
}

console.log(`\n补了 ${written} 个占位文件`);
