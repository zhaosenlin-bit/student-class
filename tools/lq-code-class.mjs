#!/usr/bin/env node
/*
 * Put back the words of a program that were given a Chinese by mistake.
 *
 * A lesson is a program with words in it.  Some of those words are
 * what a reader sees, and some of them are the names the program uses
 * for its own parts: the name of a piece of a body, the name of a
 * subject, the mark that says a program is strict.  A name that gives
 * a Chinese breaks the program that looks the name up.
 *
 * The older lesson says what every word was, so a word can be read
 * against the older lesson.  But one word alone does not tell whether
 * it is a name or wording, because the same word can be both in two
 * places of one lesson.
 *
 * So the words are read as a class.  Take every place of one lesson
 * where the same word stands.  If the word was given a Chinese in
 * every one of those places, the lesson means the same thing in all of
 * them, and the Chinese is fine.  If it was given a Chinese in some of
 * them and left alone in others, the lesson now says two different
 * things about the same word, and the program that looks the word up
 * will find one place and not the other.  Then the Chinese goes back
 * to the English of the older lesson, in every place of the class, so
 * that the lesson says one thing again.
 *
 * A word that a program cannot do without always goes back: the kind
 * of value a program asks about, the end of a line a drawing draws,
 * the way a page is laid out, the name of something that happened, and
 * the mark that says a program is strict.
 *
 *   node tools/lq-code-class.mjs --check --base <commit> --roots <dirs>
 *   node tools/lq-code-class.mjs --fix   --base <commit> --roots <dirs>
 *   node tools/lq-code-class.mjs --list  --base <commit> --roots <dirs>
 */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { alignLiterals } from './lq-align.mjs';
import { scriptBlocksOf, textRunsOf } from './lq-skeleton.mjs';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf('--' + name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const has = (name) => args.includes('--' + name);

const BASE = arg('base', 'c597fb9d');
const ROOTS = arg('roots', 'mirror').split(',').filter(Boolean);

/* The mark that says a program is strict. */
const STRICT = 'use strict';

/*
 * The words a program cannot do without.
 *
 * These are not wording but names: the name of a kind of value a
 * program asks about, the name of a kind of line a drawing draws, the
 * name of a way a page is laid out, the name of something that
 * happened.  A program that is given a Chinese in place of one of
 * these stops working, for it will never find the thing it is
 * looking for.
 */
const KEYWORDS = new Set(
  (
    'string number boolean object function undefined symbol bigint ' +
    'butt round square miter bevel nonzero evenodd thin medium thick ' +
    'absolute relative fixed static sticky block inline inline-block flex grid ' +
    'none hidden visible collapse separate inherit initial unset revert ' +
    'left right top bottom center middle justify nowrap pre-wrap break-word ' +
    'solid dashed dotted bold italic pointer default cover contain ' +
    'border-box content-box padding-box currentcolor transparent scroll ' +
    'always ease linear horizontal vertical ' +
    'click dblclick mousedown mouseup mousemove mouseover mouseout wheel ' +
    'contextmenu keydown keyup keypress input change submit focus focusin ' +
    'focusout blur touchstart touchmove touchend animationstart ' +
    'animationend transitionend dragstart drag dragenter dragover ' +
    'dragleave drop resize'
  ).split(/\s+/)
);

/* The kind of lesson a file holds. */
const kindOf = (file) => {
  if (file.endsWith('.html')) return 'html';
  if (file.endsWith('.json')) return 'json';
  return 'js';
};

/*
 * The attributes of a page that name a part of the program.
 *
 * The name of a class of style, the name of a piece of a page, the
 * place a link goes to: a Chinese in place of one of these breaks
 * the thing that looks it up.
 */
const STRUCTURAL = /^(class|id|for|type|href|src|rel|target|data-[a-z-]+)$/;

/* The lesson a file belongs to. */
const courseOf = (file) => {
  const at = file.indexOf('courseware/');
  if (at < 0) return null;
  const rest = file.slice(at + 'courseware/'.length);
  const slash = rest.indexOf('/');
  const head = slash < 0 ? rest : rest.slice(0, slash);
  return head.replace(/\.assets$/, '').replace(/\.html$/, '');
};

/* Line two pieces of program up with one another. */
const align = (oldText, newText) => {
  for (const kind of ['js', 'json']) {
    try {
      const pairs = alignLiterals(oldText, newText, kind);
      if (pairs) return pairs;
    } catch {
      /* a program that does not read well holds no strings we can trust */
    }
  }
  return null;
};

/* The values of the attributes of a page, and where they stand. */
const attributeStrings = (text) => {
  const out = [];
  const lower = text.toLowerCase();
  let i = 0;
  while (i < text.length) {
    if (text[i] !== '<') {
      i++;
      continue;
    }
    if (text.startsWith('<!--', i)) {
      const close = text.indexOf('-->', i + 4);
      i = close < 0 ? text.length : close + 3;
      continue;
    }
    if (lower.startsWith('<script', i) || lower.startsWith('<style', i)) {
      const open = text.indexOf('>', i);
      const tag = lower.startsWith('<script', i) ? 'script' : 'style';
      const close = lower.indexOf('</' + tag, open);
      i = close < 0 ? text.length : close;
      continue;
    }
    const open = text.indexOf('>', i);
    if (open < 0) break;
    let k = i + 1;
    let name = null;
    while (k < open) {
      const c = text[k];
      if (c === '"' || c === "'") {
        const quote = c;
        let e = k + 1;
        while (e < open && text[e] !== quote) e++;
        out.push({
          value: text.slice(k + 1, e),
          raw: text.slice(k, e + 1),
          start: k,
          end: e + 1,
          name
        });
        k = e + 1;
        continue;
      }
      if (!name && /[A-Za-z-]/.test(c)) {
        let e = k;
        while (e < open && /[A-Za-z0-9:_-]/.test(text[e])) e++;
        name = text.slice(k, e).toLowerCase();
        k = e;
        continue;
      }
      k++;
    }
    i = open + 1;
  }
  return out;
};

/* The words of a page that stand between its tags. */
const markupWords = (text) =>
  textRunsOf(text)
    .filter((run) => text.slice(run.start, run.end).trim())
    .map((run) => ({
      value: text.slice(run.start, run.end),
      raw: text.slice(run.start, run.end),
      start: run.start,
      end: run.end,
      name: null
    }));

const baseText = (file) => {
  try {
    return execFileSync('git', ['show', `${BASE}:${file}`], {
      encoding: 'utf8',
      maxBuffer: 1 << 28,
      stdio: ['ignore', 'pipe', 'ignore']
    });
  } catch {
    return null;
  }
};

const files = execFileSync(
  'git',
  ['diff', '--name-only', BASE, '--', ...ROOTS],
  { encoding: 'utf8', maxBuffer: 1 << 28 }
)
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((f) => courseOf(f));

const classes = new Map();
const unaligned = [];
const texts = new Map();

const addPlace = (course, from, to, raw, file, start, end, force) => {
  if (from === to) {
    /* a word left alone is part of its class too */
    if (!/[A-Za-z]/.test(from)) return;
  }
  const key = course + '\u0000' + from;
  if (!classes.has(key)) classes.set(key, { course, from, places: [] });
  classes.get(key).places.push({ file, start, end, to, raw, force: !!force });
};

for (const file of files) {
  const oldText = baseText(file);
  if (oldText === null) continue;
  let newText;
  try {
    newText = fs.readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  const kind = kindOf(file);
  const course = courseOf(file);
  texts.set(file, newText);
  let paired = 0;

  if (kind === 'html') {
    /* The program of a page is read part by part. */
    const oldBlocks = scriptBlocksOf(oldText);
    const newBlocks = scriptBlocksOf(newText);
    if (oldBlocks.length === newBlocks.length) {
      for (let i = 0; i < oldBlocks.length; i++) {
        const o = oldBlocks[i];
        const n = newBlocks[i];
        const tag = newText.slice(Math.max(0, n.start - 200), n.start);
        if (/ld\+json/i.test(tag)) continue;
        const oldBody = oldText.slice(o.start, o.end);
        const newBody = newText.slice(n.start, n.end);
        const pairs = align(oldBody, newBody);
        if (!pairs) continue;
        for (const pair of pairs) {
          if (pair.old.template || pair.now.template) continue;
          addPlace(
            course,
            pair.old.value,
            pair.now.value,
            pair.old.raw,
            file,
            n.start + pair.now.start,
            n.start + pair.now.end
          );
          paired++;
        }
      }
    }
    /* The words of a page are read in the order they stand. */
    const oldAttrs = attributeStrings(oldText);
    const newAttrs = attributeStrings(newText);
    if (oldAttrs.length === newAttrs.length) {
      for (let i = 0; i < oldAttrs.length; i++) {
        if (oldAttrs[i].name !== newAttrs[i].name) continue;
        /*
         * The name of a part of the program cannot be given a
         * Chinese, and the rest of the page can.
         */
        if (STRUCTURAL.test(oldAttrs[i].name || '')) {
          if (oldAttrs[i].value !== newAttrs[i].value && /[\u3400-\u9fff]/.test(newAttrs[i].value)) {
            addPlace(
              course,
              oldAttrs[i].value,
              newAttrs[i].value,
              oldAttrs[i].raw,
              file,
              newAttrs[i].start,
              newAttrs[i].end,
              true
            );
            paired++;
          }
        }
      }
    }
  } else {
    const pairs = align(oldText, newText);
    if (pairs) {
      for (const pair of pairs) {
        if (pair.old.template || pair.now.template) continue;
        addPlace(
          course,
          pair.old.value,
          pair.now.value,
          pair.old.raw,
          file,
          pair.now.start,
          pair.now.end
        );
        paired++;
      }
    }
  }
  if (!paired) unaligned.push(file);
}

/* The places that have to go back to the word of the older lesson. */
const mends = [];
const kept = [];
for (const info of classes.values()) {
  const to = new Set(info.places.map((p) => p.to));
  const strict = info.from === STRICT;
  const named = KEYWORDS.has(info.from);
  const forced = info.places.some((p) => p.force);
  if (!strict && !named && !forced && to.size < 2) {
    kept.push(info);
    continue;
  }
  for (const place of info.places) {
    if (place.to === info.from) continue;
    mends.push({ ...place, from: info.from, course: info.course });
  }
}

const byFile = new Map();
for (const m of mends) {
  if (!byFile.has(m.file)) byFile.set(m.file, []);
  byFile.get(m.file).push(m);
}

let changedFiles = 0;
for (const [file, list] of byFile) {
  const text = texts.get(file);
  if (text === undefined) continue;
  let out = text;
  for (const m of list.sort((a, b) => b.start - a.start)) {
    out = out.slice(0, m.start) + m.raw + out.slice(m.end);
  }
  if (out !== text) changedFiles++;
  if (has('fix')) {
    fs.writeFileSync(file, out, 'utf8');
  }
}

console.log(
  `${has('fix') ? 'put back' : 'would put back'} ${mends.length} words in ${changedFiles} files`
);
console.log(
  `${kept.length} classes were given a Chinese in every place and are left alone`
);
if (unaligned.length) {
  console.log(`${unaligned.length} files could not be lined up:`);
  for (const f of unaligned.slice(0, 40)) console.log(`  ${f}`);
  if (unaligned.length > 40) console.log(`  …… and ${unaligned.length - 40} more`);
}

if (has('list')) {
  const courses = new Map();
  for (const m of mends) {
    if (!courses.has(m.course)) courses.set(m.course, []);
    courses.get(m.course).push(m);
  }
  for (const [course, list] of courses) {
    const words = new Set(list.map((m) => m.from + ' -> ' + m.to));
    console.log(`\n${course}  (${list.length} places)`);
    for (const w of [...words].sort()) console.log(`  ${w}`);
  }
}

