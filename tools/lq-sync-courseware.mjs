#!/usr/bin/env node
/*
 * Put the lessons in the library back in step with the lessons they
 * were made from.
 *
 * Every lesson in the library is a copy of a lesson in one of the
 * mirrors, with a few marks of its own: the name of the house, the
 * address of the lesson, and the watcher that stops a lesson when a
 * developer tool is open.  This copies the lessons across again and
 * puts those marks back, so that a change made to a lesson reaches
 * the library as well.
 *
 *   node tools/lq-sync-courseware.mjs          # copy
 *   node tools/lq-sync-courseware.mjs --check  # only look
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');

const CW = path.join(ROOT, 'mirror', 'leqixiang', 'courseware');
const BRAND = '乐启享';

/* The watcher that stops a lesson when a developer tool is open. */
const DEBUGGER =
  /var\s+_cdt\s*=\s*function\s*\(\s*\)\s*\{[\s\S]*?setInterval\s*\(\s*_cdt\s*,\s*\d+\s*\)\s*;/;

/* The marks the library puts on its own copy of a lesson. */
function markUp(html) {
  return html
    .replace(DEBUGGER, '/* the debugger watcher was removed for the local copy */');
}

/* The lessons of the 3D laboratories, with the old addresses inside them. */
function labPaths(html) {
  return html
    .replace(/<!--\s*saved from url=\([^)]*\)[^>]*-->/gi, '');
}

/* Every lesson of the library, and the lesson it comes from. */
function pairs() {
  const out = [];
  const dir = (d) => path.join(ROOT, d);
  const readDir = (d) =>
    fs.existsSync(d) ? fs.readdirSync(d).filter((f) => f.endsWith('.html')) : [];
  const add = (id, file, transform = (x) => x) => {
    if (fs.existsSync(file)) out.push({ id, file, transform });
  };

  for (const name of readDir(dir('mirror/library/courseware'))) {
    add(
      name.replace(/\.html$/, ''),
      path.join(dir('mirror/library/courseware'), name)
    );
  }
  for (const name of readDir(dir('mirror/studio/courseware'))) {
    const n = name.replace(/\.html$/, '');
    add(`lq-${n}`, path.join(dir('mirror/studio/courseware'), name));
  }
  for (const name of readDir(dir('mirror/lab-explore/courseware'))) {
    const n = name.replace(/\.html$/, '');
    add(`lab-explore-${n}`, path.join(dir('mirror/lab-explore/courseware'), name));
  }
  for (const name of readDir(dir('mirror/lab-physics/courseware'))) {
    const n = name.replace(/\.html$/, '');
    add(`lab-physics-${n}`, path.join(dir('mirror/lab-physics/courseware'), name));
  }
  for (const name of readDir(dir('mirror/lab-process/courseware'))) {
    const n = name.replace(/\.html$/, '');
    add(`lab-process-${n}`, path.join(dir('mirror/lab-process/courseware'), name));
  }
  for (const name of readDir(dir('mirror/lab-reaction/courseware'))) {
    const n = name.replace(/\.html$/, '');
    add(`lab-reaction-${n}`, path.join(dir('mirror/lab-reaction/courseware'), name));
  }
  for (const name of readDir(dir('mirror/lab-virtual/courseware'))) {
    const n = name.replace(/\.html$/, '');
    add(`lab-virtual-${n}`, path.join(dir('mirror/lab-virtual/courseware'), name));
  }
  for (const name of readDir(dir('mirror/lab-course/courseware'))) {
    const n = name.replace(/\.html$/, '');
    add(
      `lab-course-${n}`,
      path.join(dir('mirror/lab-course/courseware'), name),
      labPaths
    );
  }
  const blockly = dir('mirror/game-block');
  if (fs.existsSync(blockly)) {
    for (const slug of fs.readdirSync(blockly)) {
      const page = path.join(blockly, slug, 'index.html');
      if (fs.existsSync(page)) out.push({ id: `game-block-${slug}`, file: page, transform: (x) => x });
    }
  }
  return out;
}

/* The lesson in the library, and the lesson it comes from. */
function build(pair) {
  const text = fs.readFileSync(pair.file, 'utf8');
  return markUp(pair.transform(text));
}

const list = pairs();
let same = 0;
const differ = [];
for (const pair of list) {
  const target = path.join(CW, `${pair.id}.html`);
  if (!fs.existsSync(target)) {
    differ.push(`${pair.id}  (not in the library)`);
    continue;
  }
  const want = build(pair);
  const have = fs.readFileSync(target, 'utf8');
  if (want === have) { same++; continue; }
  differ.push(pair.id);
  if (!CHECK) {
    fs.writeFileSync(target, want, 'utf8');
  }
}

const have = fs.readdirSync(CW).filter((f) => f.endsWith('.html')).length;
console.log(`lessons with a source ${list.length}`);
console.log(`already the same ${same}`);
console.log(`${CHECK ? 'would change' : 'changed'} ${differ.length}`);
console.log(`lessons in the library ${have}`);
if (CHECK) {
  for (const d of differ.slice(0, 40)) console.log('  ' + d);
}
