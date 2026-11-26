#!/usr/bin/env node
/*
 * Puts the shell of the site where the packager expects to find it.
 *
 * The shell itself is kept in site/ — it belongs to the project and
 * travels with it.  The packager reads it from mirror/leqixiang/site/,
 * so the two have to be the same file.  This copies it over.
 *
 *   node tools/sync-shell.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(ROOT, 'site');
const SITE = path.join(ROOT, 'mirror', 'leqixiang', 'site');

const walk = (dir, rel = '') => {
  const out = [];
  for (const it of fs.readdirSync(dir, { withFileTypes: true })) {
    const r = rel ? rel + '/' + it.name : it.name;
    const abs = path.join(dir, it.name);
    if (it.isDirectory()) out.push(...walk(abs, r));
    else out.push({ rel: r, abs });
  }
  return out;
};

if (!fs.existsSync(SOURCE)) {
  console.error('外壳目录不在：', SOURCE);
  process.exit(1);
}

let changed = 0;
for (const file of walk(SOURCE)) {
  const target = path.join(SITE, file.rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const body = fs.readFileSync(file.abs);
  const before = fs.existsSync(target) ? fs.readFileSync(target) : null;
  if (before && before.equals(body)) {
    continue;
  }
  fs.writeFileSync(target, body);
  changed++;
  console.log('已更新', file.rel);
}

console.log(`外壳已同步（${changed} 个文件有变化）-> ${SITE}`);
