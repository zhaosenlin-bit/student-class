#!/usr/bin/env node
/*
 * Looks through the courseware for the guards that stop a page when a
 * developer tool is attached, and says which files carry them.
 *
 *   node tools/scan-courseware-guard.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CW = path.join(ROOT, 'mirror', 'leqixiang', 'courseware');

const PATTERNS = [
  ['debugger 字面量', /debugger/g],
  ['constructor 构造', /constructor\s*\(/g],
  ['Function 构造', /Function\s*\(\s*['"]/g],
  ['setInterval', /setInterval/g],
  ['while(true)', /while\s*\(\s*!!\[\]\s*\)/g],
  ['while(true) 变体', /while\s*\(\s*true\s*\)/g],
];

const hits = [];
for (const file of fs.readdirSync(CW)) {
  if (!file.endsWith('.html')) continue;
  const text = fs.readFileSync(path.join(CW, file), 'utf8');
  const found = [];
  for (const [name, re] of PATTERNS) {
    const n = (text.match(re) || []).length;
    if (n) found.push(`${name}×${n}`);
  }
  if (found.length) hits.push({ file, found });
}

for (const h of hits) console.log(h.file.padEnd(28), h.found.join('  '));
console.log(`\n${hits.length} files carry a guard`);
