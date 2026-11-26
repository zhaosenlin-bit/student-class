#!/usr/bin/env node
/*
 * How much room a folder really takes.
 *
 * The sum of the sizes of the files in a folder says how much the
 * files would take if each one of them were kept by itself.  It does
 * not say how much the disk gives up: a file that is linked to
 * another one is only written down once.
 *
 * This walks the folder, counts every file that is written down once
 * only, and adds those up.
 *
 *   node tools/measure-disk.mjs --root dist
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const ROOT = path.resolve(arg('root', 'dist'));

const walk = (dir) => {
  const out = [];
  let items = [];
  try {
    items = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const it of items) {
    const full = path.join(dir, it.name);
    if (it.isDirectory()) out.push(...walk(full));
    else if (it.isFile()) out.push(full);
  }
  return out;
};

const files = walk(ROOT);
const seen = new Map();
let logical = 0;
let physical = 0;
let linked = 0;

for (const file of files) {
  const st = fs.statSync(file);
  logical += st.size;
  if (seen.has(st.ino)) {
    linked++;
    continue;
  }
  seen.set(st.ino, file);
  physical += st.size;
}

const mb = (n) => (n / 1024 / 1024).toFixed(1);
console.log(`${ROOT}`);
console.log(`  文件        ${files.length} 个`);
console.log(`  累加起来    ${mb(logical)} MB（每个文件各算一份）`);
console.log(`  实际占用    ${mb(physical)} MB（磁盘上只写了一份的）`);
console.log(`  重复的文件  ${linked} 个，省下 ${mb(logical - physical)} MB`);
