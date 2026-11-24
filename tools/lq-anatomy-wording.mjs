#!/usr/bin/env node
/*
 * Repairs the wording of the anatomy lessons.
 *
 * Two things go wrong when the anatomy lessons are translated.
 *
 * The first is a name that is put together from pieces:
 *
 *     const lungMid = side => centroid('Superior lobe of ' + side + ' lung');
 *
 * The program looks the part up by that name, and the packing only knows
 * the name in English.  When the piece is turned into Chinese the name
 * no longer belongs to any part, and the lesson stops with
 *
 *     the packed anatomy has no "上叶 right lung" at part
 *
 * A piece like that is given back from the mirror that was taken before
 * any wording was changed.
 *
 * The second is text that has nothing to do with the lesson at all — a
 * sentence about how to write a reply, standing where a sentence about
 * the stomach should be.  Those are written again, in Chinese, from
 * what the lesson said before.
 *
 *   node tools/lq-anatomy-wording.mjs --pristine <the folder> --roots mirror
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const PRISTINE = arg('pristine', '');
const ROOTS = arg('roots', 'mirror').split(',').map((s) => s.trim());

if (!PRISTINE || !fs.existsSync(PRISTINE)) {
  console.error(
    'the mirror taken before the wording was changed is needed;\n' +
      '  node tools/lq-anatomy-wording.mjs --pristine <the folder>'
  );
  process.exit(1);
}

const CN = /[㐀-鿿]/;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.name.endsWith('.html')) out.push(p);
  }
  return out;
}

/* Every text between two marks, in the order they stand. */
function texts(source) {
  const out = [];
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    if (c === '/' && source[i + 1] === '*') {
      const end = source.indexOf('*/', i + 2);
      i = end < 0 ? source.length : end + 2;
      continue;
    }
    if (c === '/' && source[i + 1] === '/') {
      const end = source.indexOf('\n', i);
      i = end < 0 ? source.length : end;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      const quote = c;
      const start = i;
      let value = '';
      i += 1;
      while (i < source.length) {
        const d = source[i];
        if (d === '\\') {
          value += source[i] + source[i + 1];
          i += 2;
          continue;
        }
        if (d === quote) {
          i += 1;
          break;
        }
        value += d;
        i += 1;
      }
      out.push({ at: start, end: i, quote, value });
      continue;
    }
    i += 1;
  }
  return out;
}

const PACK = /const ANATOMY = (\{[\s\S]*?\});/;

/*
 * The sentences that do not belong to the lesson.  Each is written again
 * from the sentence the lesson had before.
 */
const REWRITTEN = [
  {
    was: 'stored as fat, or in membranes',
    now: '储存为脂肪，或存在于细胞膜中',
  },
  {
    was: 'the products of digestion are used to build the body’s own molecules',
    now: '消化产物被用来构建身体自身的分子',
  },
  {
    was: 'The digestive system',
    now: '消化系统',
  },
];

let fixed = 0;
let rewritten = 0;
let lessons = 0;

for (const root of ROOTS) {
  if (!fs.existsSync(root)) continue;
  for (const file of walk(root)) {
    const text = fs.readFileSync(file, 'utf8');
    const packed = text.match(PACK);
    if (!packed) continue;

    const old = path.relative(root, file);
    const mirror = [
      path.join(PRISTINE, old),
      path.join(PRISTINE, path.basename(root), old),
    ].find((p) => fs.existsSync(p));
    if (!mirror) continue;

    const reference = fs.readFileSync(mirror, 'utf8');
    const before = reference.match(PACK);
    if (!before) continue;

    const names = JSON.parse(before[1]).parts.map((p) => p.name);

    const codeStart = text.indexOf(packed[0]) + packed[0].length;
    const codeStartRef = reference.indexOf(before[0]) + before[0].length;
    const here = texts(text.slice(codeStart));
    const there = texts(reference.slice(codeStartRef));
    if (here.length !== there.length) continue;

    const pieces = [];
    for (let i = 0; i < here.length; i += 1) {
      const mine = here[i];
      const other = there[i];
      if (mine.quote !== other.quote) continue;

      /* A sentence that has nothing to do with the lesson. */
      const said = REWRITTEN.find((r) => r.was === other.value);
      if (said && CN.test(mine.value) && mine.value !== said.now) {
        pieces.push({ mine, text: said.now });
        rewritten += 1;
        continue;
      }

      /*
       * A piece of a name.  The packing knows the whole name, so the
       * piece has to be the one the packing uses.  A piece is a word
       * that is joined to another word, so it ends in a space — a word
       * that stands on its own is a name of its own and is left alone.
       */
      if (!CN.test(mine.value)) continue;
      if (!other.value.trim()) continue;
      if (!other.value.endsWith(' ')) continue;
      if (!names.some((n) => n.startsWith(other.value))) continue;
      pieces.push({ mine, text: other.value });
    }

    if (!pieces.length) continue;

    let out = text;
    /* The words are taken back from the last one to the first one. */
    for (const p of pieces.reverse()) {
      const quoted = p.mine.quote + p.text + p.mine.quote;
      const at = codeStart + p.mine.at;
      const end = codeStart + p.mine.end;
      out = out.slice(0, at) + quoted + out.slice(end);
      fixed += 1;
    }
    fs.writeFileSync(file, out);
    lessons += 1;
    console.log(`${file}\n  ${pieces.length} word(s) put right`);
  }
}

console.log(
  `\n${fixed} word(s) put right in ${lessons} lesson(s), ${rewritten} of them written again`
);
