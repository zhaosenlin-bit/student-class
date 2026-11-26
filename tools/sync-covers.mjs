#!/usr/bin/env node
/*
 * The covers of the lessons.
 *
 * A lesson that was given a picture of its own keeps that picture
 * under a folder of uploads.  The catalogue names those pictures from
 * the root of a site, and a name that travels with Chinese words in
 * it travels as codes (%E5...).  On disk the picture is under its
 * plain name, so this copies every picture the catalogue asks for
 * into the written-out site, under the plain name, and leaves the
 * rest of the uploads behind.
 *
 *   node tools/sync-covers.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const DIST = path.join(ROOT, 'dist');
const PUBLIC = path.join(ROOT, 'mirror', 'studio', 'public');
const CATALOG = path.join(DIST, 'catalog.json');

if (!fs.existsSync(CATALOG)) {
  console.error('没有找到 dist/catalog.json，先写出站点');
  process.exit(1);
}

const catalog = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
const wanted = new Map();
for (const product of catalog.products || []) {
  const raw = String(product.cover || '').replace(/^\.?\//, '');
  if (!raw.startsWith('prod/uploads/')) continue;
  let plain = raw;
  try {
    plain = decodeURIComponent(raw);
  } catch {
    /* a name that is not a code is already plain */
  }
  wanted.set(plain, raw);
}

let copied = 0;
let bytes = 0;
let missing = 0;
for (const [plain] of wanted) {
  const src = path.join(PUBLIC, plain);
  const dst = path.join(DIST, plain);
  if (!fs.existsSync(src) || !fs.statSync(src).isFile()) {
    missing += 1;
    console.log('源文件缺失', plain);
    continue;
  }
  if (fs.existsSync(dst) && fs.statSync(dst).size === fs.statSync(src).size) continue;
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  copied += 1;
  bytes += fs.statSync(dst).size;
}

console.log(
  `封面 ${wanted.size} 张，补齐 ${copied} 张（${(bytes / 1048576).toFixed(1)} MB），缺失 ${missing} 张`
);
