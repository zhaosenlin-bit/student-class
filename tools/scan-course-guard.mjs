#!/usr/bin/env node
/*
 * Reports what the guards in one course do, so a course that freezes can
 * be read instead of guessed at.
 *
 *   node tools/scan-course-guard.mjs afe-180
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith('--'));
const file = path.join(ROOT, 'mirror', 'leqixiang', 'courseware', `${id}.html`);
const text = fs.readFileSync(file, 'utf8');

const NEEDLES = [
  'location.reload',
  'location.href',
  'location.replace',
  'document.write',
  'console.clear',
  'outerWidth',
  'innerWidth',
  'debugger',
  'devtools',
  'devtoolsopen',
  'toString()',
  'captureStackTrace',
  'setInterval',
  'requestAnimationFrame',
  'while(!![])',
  'while (!![])',
];

for (const needle of NEEDLES) {
  const hits = [];
  let i = -1;
  while ((i = text.indexOf(needle, i + 1)) >= 0 && hits.length < 5) hits.push(i);
  if (hits.length) console.log(`${needle.padEnd(24)} ${hits.length}  ${hits.join(', ')}`);
}

/* The plain words inside the obfuscated table are worth a look too. */
for (const word of ['reload', 'devtool', 'debugger', 'disable', 'inspect', 'chrome']) {
  const n = (text.match(new RegExp(word, 'gi')) || []).length;
  if (n) console.log(`word ${word.padEnd(19)} ${n}`);
}
