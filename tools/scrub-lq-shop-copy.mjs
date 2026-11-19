#!/usr/bin/env node
/*
 * Take the words of a shop out of the catalogue that is committed.
 *
 * The build does this every time it runs.  This tool does it to the
 * catalogue that is already on disk, so the file in the repository is
 * the same clean file the server serves — no shop sentence waits in
 * the middle of a public project.
 *
 *   node tools/scrub-lq-shop-copy.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scrubShopCopy } from '../server/lq-shop-copy.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'mirror', 'leqixiang', 'catalog.json');

const catalog = JSON.parse(fs.readFileSync(FILE, 'utf8'));
let changed = 0;

for (const product of catalog.products || []) {
  for (const key of ['description', 'tagline']) {
    if (typeof product[key] !== 'string') continue;
    const cleaned = scrubShopCopy(product[key]);
    if (cleaned !== product[key]) {
      console.log(`  ${product.id} · ${key}`);
      product[key] = cleaned;
      changed += 1;
    }
  }
}

if (!changed) {
  console.log('目录里没有商店的话，不用改。');
  process.exit(0);
}

fs.writeFileSync(FILE, JSON.stringify(catalog), 'utf8');
console.log(`改好了 ${changed} 处：${path.relative(ROOT, FILE)}`);

