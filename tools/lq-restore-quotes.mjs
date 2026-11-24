#!/usr/bin/env node
/*
 * Put the strings back where they were lost.
 *
 * A lesson holds two kinds of English: the wording a reader sees, and
 * the names the program uses for its own parts.  When a name of the
 * program was given a Chinese by mistake it had to go back to the
 * name the program uses, and on the way the quotation marks around
 * it were lost, and once in a while the wrong name went into the
 * place.  A program that says `size` where it means `'size'` no
 * longer knows what `size` is.
 *
 * Take the wording out of both lessons and leave a mark where each
 * string stood, and the two shapes are the same, for the wording a
 * reader sees was given a Chinese but the shape of the program was
 * not touched.  Read the two shapes side by side and the places they
 * differ are the places where a string was lost.  The older lesson
 * says what the string there was, and it goes back.
 *
 * A lesson is only kept when the shapes agree once the strings are
 * back, when the number of strings is the one of the older lesson,
 * and when the program still reads well.
 *
 *   node tools/lq-restore-quotes.mjs --check --base <commit> --roots <dirs>
 *   node tools/lq-restore-quotes.mjs --fix   --base <commit> --roots <dirs>
 */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { stringsOf } from './lq-js-strings.mjs';
import { skeletonOf } from './lq-skeleton.mjs';
import { checkProgram, checkScripts } from './lq-script-check.mjs';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf('--' + name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const has = (name) => args.includes('--' + name);

const BASE = arg('base', 'c597fb9d');
const ROOTS = arg('roots', 'mirror/leqixiang/courseware').split(',');

/* The parts of a lesson that stand between its strings. */
const partsOf = (shape) => {
  const marks = [];
  for (let i = 0; i < shape.lit.length; i++) {
    if (shape.lit[i]) marks.push(i);
  }
  const parts = [];
  let pos = 0;
  for (const at of marks) {
    parts.push(shape.shape.slice(pos, at));
    pos = at + 1;
  }
  parts.push(shape.shape.slice(pos));
  /* Where each part begins in the lesson. */
  const starts = [];
  let at = 0;
  for (const m of marks) {
    starts.push(shape.where[at]);
    at = m + 1;
  }
  starts.push(shape.where[at]);
  return { parts, starts, marks };
};

const files = execFileSync(
  'git',
  ['diff', '--name-only', BASE, '--', ...ROOTS],
  { encoding: 'utf8', maxBuffer: 1 << 28 }
)
  .split(/\r?\n/)
  .filter(Boolean);

let repaired = 0;
let changed = 0;
const left = [];

for (const file of files) {
  let oldText;
  try {
    oldText = execFileSync('git', ['show', `${BASE}:${file}`], {
      encoding: 'utf8',
      maxBuffer: 1 << 28,
      stdio: ['ignore', 'pipe', 'ignore']
    });
  } catch {
    continue;
  }
  const newText = fs.readFileSync(file, 'utf8');
  const kind = file.endsWith('.js') ? 'js' : 'html';

  let oldShape;
  let newShape;
  let before;
  let now;
  try {
    before = stringsOf(oldText, kind);
    now = stringsOf(newText, kind);
    oldShape = skeletonOf(oldText, kind);
    newShape = skeletonOf(newText, kind);
  } catch (e) {
    left.push(`${file}  (the program does not read: ${String(e.message).split('\n')[0]})`);
    continue;
  }
  if (before.length === now.length) continue;
  if (before.length < now.length) {
    left.push(`${file}  (there are more strings than before)`);
    continue;
  }

  const oldParts = partsOf(oldShape);
  const newParts = partsOf(newShape);
  const oldLits = oldParts.marks.map((at) => oldShape.lit[at]);

  /* Read the two lessons side by side. */
  const mends = [];
  let k = 0;
  let j = 0;
  let good = true;
  while (k < oldLits.length && j < newParts.marks.length) {
    const beforeCode = oldParts.parts[k];
    const hereCode = newParts.parts[j];
    if (hereCode === beforeCode) {
      k++;
      j++;
      continue;
    }
    /* A string was lost: the word it held stands bare in the lesson. */
    const afterCode = oldParts.parts[k + 1] ?? '';
    const fits =
      hereCode.startsWith(beforeCode) &&
      hereCode.endsWith(afterCode) &&
      hereCode.length >= beforeCode.length + afterCode.length;
    if (fits) {
      const bare = hereCode.slice(
        beforeCode.length,
        hereCode.length - afterCode.length
      );
      const at = newParts.starts[j] + beforeCode.length;
      if (newText.slice(at, at + bare.length) !== bare) {
        good = false;
        break;
      }
      mends.push({ at, bare, raw: oldLits[k].raw });
      k += 2;
      j += 1;
      continue;
    }
    good = false;
    break;
  }
  if (!good || k !== oldLits.length || j !== newParts.marks.length) {
    left.push(`${file}  (the shapes do not agree)`);
    continue;
  }
  if (mends.length !== before.length - now.length) {
    left.push(
      `${file}  (${mends.length} words to mend, ${before.length - now.length} wanted)`
    );
    continue;
  }

  /* The strings go back from the last to the first. */
  let out = newText;
  for (const m of mends.sort((x, y) => y.at - x.at)) {
    out = out.slice(0, m.at) + m.raw + out.slice(m.at + m.bare.length);
  }

  /* The lesson is only kept when it reads like the older lesson. */
  let check;
  let shape;
  try {
    check = stringsOf(out, kind);
    shape = skeletonOf(out, kind);
  } catch {
    left.push(`${file}  (the program does not read after the strings went back)`);
    continue;
  }
  if (check.length !== before.length) {
    left.push(`${file}  (${check.length} strings, ${before.length} wanted)`);
    continue;
  }
  if (shape.shape !== oldShape.shape) {
    left.push(`${file}  (the shape is not the one of the older lesson)`);
    continue;
  }
  const sound = kind === 'js' ? checkProgram(out) : checkScripts(out);
  if (!sound.ok) {
    left.push(`${file}  (${sound.error})`);
    continue;
  }

  repaired += mends.length;
  changed++;
  console.log(
    `${has('fix') ? 'repaired' : 'would repair'} ${file}  (${mends.length} strings)`
  );
  if (has('fix')) fs.writeFileSync(file, out, 'utf8');
}

console.log(`\n${repaired} strings ${has('fix') ? 'repaired' : 'to repair'}, ${changed} files`);
if (left.length) {
  console.log('\nleft alone:');
  for (const l of left) console.log('  ' + l);
}
