#!/usr/bin/env node
/*
 * Take the shop out of the catalogue that is already on disk.
 *
 * The build does this every time it runs.  This tool does it to the
 * catalogue that is already there, so the file in the repository is
 * the same clean file the server hands to the browser — no price, no
 * paid course pack and no refund wording waits in a public file.
 *
 *   node tools/strip-lq-shop-data.mjs
 *   node tools/strip-lq-shop-data.mjs --check
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripShopData } from '../server/lq-shop-data.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'mirror', 'leqixiang', 'catalog.json');
const check = process.argv.includes('--check');

const raw = fs.readFileSync(FILE, 'utf8');
const cleaned = JSON.stringify(stripShopData(JSON.parse(raw)));

if (cleaned === JSON.stringify(JSON.parse(raw))) {
  console.log('目录里没有商店的数据，不用改。');
  process.exit(0);
}

if (check) {
  console.error('目录里还有商店的数据，先跑一次 node tools/strip-lq-shop-data.mjs');
  process.exit(1);
}

fs.writeFileSync(FILE, cleaned, 'utf8');
const before = raw.length;
const after = cleaned.length;
console.log(
  `清掉了商店数据：${before} -> ${after} 字节（少了 ${before - after}）`,
);
console.log(path.relative(ROOT, FILE));

