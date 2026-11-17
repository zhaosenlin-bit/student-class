#!/usr/bin/env node
/*
 * Puts the loading screen of 乐启享 into the simulations that are
 * already on the disk.
 *
 *   node tools/brand-phet-splash.mjs [--dir mirror/phet/courseware]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applySplash } from './phet-splash.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const DIR = path.resolve(ROOT, arg('dir', 'mirror/phet/courseware'));

let changed = 0;
let total = 0;
for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith('.html'))) {
  const full = path.join(DIR, file);
  const html = fs.readFileSync(full, 'utf8');
  const next = applySplash(html);
  total++;
  if (next === html) continue;
  fs.writeFileSync(full, next, 'utf8');
  changed++;
}
console.log(`加载画面已换成乐启享：${changed}/${total} 份模拟`);
