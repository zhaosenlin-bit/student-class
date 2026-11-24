#!/usr/bin/env node
/*
 * Put the values back into the lessons that show them as text.
 *
 * A lesson that writes its numbers into a template with "${value}"
 * shows the reader the name of the value instead of the value.  The
 * backslash in front of the dollar sign is taken away here, and the
 * cases where the dollar sign is meant to be shown are left alone.
 *
 *   node tools/lq-unhide-interpolation.mjs [file …]
 */
import fs from 'node:fs';
import path from 'node:path';
import { checkScripts, checkProgram } from './lq-script-check.mjs';

const args = process.argv.slice(2);

const roots = args.length
  ? args
  : [
      'mirror/leqixiang/courseware',
      'mirror/lab-course/courseware',
      'mirror/lab-virtual/courseware',
      'mirror/lab-reaction/courseware',
      'mirror/lab-explore/courseware',
      'mirror/studio/courseware',
      'mirror/lab-physics/courseware',
      'mirror/lab-process/courseware'
    ];

/* One backslash in front of the dollar sign, and no other before it. */
const HIDDEN = /(?<!\\)\\\$\{/g;

const CODE = /\.(?:js|mjs|cjs)$/i;

/* Every file under a folder, the folders included. */
function walk(dir, out) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

let files = 0;
let spots = 0;
const broken = [];

for (const root of roots) {
  if (!fs.existsSync(root)) continue;
  const stat = fs.statSync(root);
  const list = stat.isDirectory() ? walk(root, []) : [root];
  for (const file of list) {
    if (!/\.(?:html|js|mjs|cjs)$/i.test(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    const count = text.split('${').length - 1;
    if (!count) continue;
    HIDDEN.lastIndex = 0;
    const found = text.match(HIDDEN);
    if (!found || !found.length) continue;

    const after = text.replace(HIDDEN, '${');
    /* A lesson whose scripts no longer read well is left as it was. */
    const sound = CODE.test(file) ? checkProgram(after) : checkScripts(after);
    if (!sound.ok) {
      broken.push(`${file}  (${sound.error})`);
      continue;
    }
    fs.writeFileSync(file, after, 'utf8');
    files++;
    spots += found.length;
    console.log(`${file}: ${found.length} value${found.length > 1 ? 's' : ''}`);
  }
}

console.log(`\n${spots} values put back in ${files} lessons`);
if (broken.length) {
  console.error('\nleft as they were:');
  for (const b of broken) console.error('  ' + b);
  process.exit(1);
}
