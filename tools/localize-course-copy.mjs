#!/usr/bin/env node
/*
 * Take the wording of a course out of the shop it was written for.
 *
 * A course that keeps its progress on the platform talks about "this
 * account and this browser".  Here there is no account: the progress
 * goes into the browser of the machine that opens the course.  The
 * sentence keeps its meaning, it just stops pointing at a login that
 * does not exist here.
 *
 *   node tools/localize-course-copy.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CW = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'courseware');

const RULES = [
  ['已自动保存到当前账号及浏览器', '已自动保存到本机浏览器'],
  ['记录保存在当前账号及浏览器', '记录保存在本机浏览器'],
  ['小曲谱已自动保存到当前账号及浏览器。', '小曲谱已自动保存到本机浏览器。'],
  ['小容量记录保存在当前账号、当前浏览器。', '小容量记录保存在本机浏览器。'],
  ['Small score saved in this account and browser.', 'Small score saved in this browser.'],
  ['Small records are stored in this account and browser.', 'Small records are stored in this browser.'],
  ['Small scores autosave in this account and browser.', 'Small scores autosave in this browser.'],
];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

let files = 0;
let hits = 0;

for (const dir of fs.readdirSync(CW)) {
  if (!dir.endsWith('.assets')) continue;
  for (const file of walk(path.join(CW, dir))) {
    if (!/\.(html?|mjs|js|css)$/i.test(file)) continue;
    const before = fs.readFileSync(file, 'utf8');
    if (!before.includes('当前账号') && !before.includes('this account and browser')) continue;
    let after = before;
    for (const [from, to] of RULES) after = after.split(from).join(to);
    if (after !== before) {
      fs.writeFileSync(file, after);
      files += 1;
      const n = RULES.reduce(
        (sum, [from]) => sum + before.split(from).length - 1,
        0
      );
      hits += n;
      console.log(`${path.relative(ROOT, file)}: ${n} 处`);
    }
  }
}

console.log(`\n改了 ${files} 个文件，${hits} 处文案`);
