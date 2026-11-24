#!/usr/bin/env node
/*
 * Gives the packed anatomy back the names the programs look for.
 *
 * A lesson about the human body carries its anatomy packed into the page:
 * every bone, muscle and nerve has a name, and the program finds those
 * parts by that name:
 *
 *     const hum = part('Humerus.l').pos;
 *
 * When the names inside the packing are turned into Chinese the program
 * no longer finds the part it asks for.  The lesson then stops with
 *
 *     Cannot read properties of null (reading '1')
 *
 * or draws a body without its nerves.
 *
 * So the names inside the packing are taken back from the mirror that was
 * taken before any wording was changed, and the Chinese name is kept beside
 * them under the name "zh", so that nothing is lost.
 *
 * The words in the program itself are looked at the same way.  A word that
 * stands for a part — the name of a vessel, the name of a lobe — has to be
 * the name that is in the packing, and those words are taken back as well.
 * The words that are only read by a person are left in Chinese.
 *
 *   node tools/lq-anatomy-names.mjs --pristine <the folder> --roots mirror
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
      '  node tools/lq-anatomy-names.mjs --pristine <the folder>'
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

/*
 * Every text between two marks, in the order they stand, with the place
 * they stand.  The texts inside a comment are not read, for a comment is
 * a remark and not a word of the program.
 */
function texts(source) {
  const out = [];
  let i = 0;
  let line = 1;
  while (i < source.length) {
    const c = source[i];
    if (c === '\n') {
      line += 1;
      i += 1;
      continue;
    }
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
        if (d === '\n') line += 1;
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

let restored = 0;
let lessons = 0;

for (const root of ROOTS) {
  if (!fs.existsSync(root)) continue;
  for (const file of walk(root)) {
    const text = fs.readFileSync(file, 'utf8');
    const packed = text.match(PACK);
    if (!packed) continue;

    const old = path.relative(root, file);
    /* The reference keeps the name of the folder the mirror was taken in. */
    const mirror = [path.join(PRISTINE, old), path.join(PRISTINE, path.basename(root), old)].find(
      (p) => fs.existsSync(p)
    );
    if (!mirror) {
      console.log(`${file}  (no mirror to compare with)`);
      continue;
    }
    const reference = fs.readFileSync(mirror, 'utf8');
    const before = reference.match(PACK);
    if (!before) continue;

    const now = JSON.parse(packed[1]);
    const was = JSON.parse(before[1]);
    if (!now.parts || !was.parts || now.parts.length !== was.parts.length) {
      console.log(`${file}  (the two do not hold the same parts)`);
      continue;
    }
    /* The parts sit in the same order in both. */
    if (!now.parts.every((p, i) => p.v === was.parts[i].v && p.i === was.parts[i].i)) {
      console.log(`${file}  (the parts do not line up)`);
      continue;
    }

    const partNames = new Set(was.parts.map((p) => p.name));
    const byName = new Map();
    let changed = false;
    now.parts.forEach((p, i) => {
      if (p.name === was.parts[i].name) return;
      byName.set(p.name, was.parts[i].name);
      p.zh = p.name;
      p.name = was.parts[i].name;
      changed = true;
    });

    let out = text;
    if (changed) {
      out = out.replace(PACK, `const ANATOMY = ${JSON.stringify(now)};`);
    }

    /*
     * The words of the program are lined up with the words of the
     * reference.  A word that stood for a part in the reference stands for
     * that part here as well, so it is taken back.
     *
     * Only the words behind the packing are lined up: the packing itself
     * was written a moment ago and holds a word more for every name.
     */
    const codeStart = out.indexOf(packed[0]) + packed[0].length;
    const codeStartRef = reference.indexOf(before[0]) + before[0].length;
    const here = texts(out.slice(codeStart));
    const there = texts(reference.slice(codeStartRef));
    let given = 0;
    if (here.length === there.length) {
      const pieces = [];
      for (let i = 0; i < here.length; i += 1) {
        const mine = here[i];
        const other = there[i];
        if (mine.quote !== other.quote) continue;
        if (!CN.test(mine.value)) continue;
        if (!partNames.has(other.value)) continue;
        pieces.push({ mine, other });
      }
      /* The words are taken back from the last one to the first one. */
      for (const p of pieces.reverse()) {
        const quoted = p.other.quote + p.other.value + p.other.quote;
        /* The place of the word is counted from the start of the code. */
        const at = codeStart + p.mine.at;
        const end = codeStart + p.mine.end;
        out = out.slice(0, at) + quoted + out.slice(end);
        given += 1;
      }
    }

    if (changed || given) {
      fs.writeFileSync(file, out);
      restored += byName.size;
      lessons += 1;
      console.log(`${file}\n  ${byName.size} part name(s) given back, ${given} word(s) with them`);
    }
  }
}

console.log(`\n${restored} part name(s) given back in ${lessons} lesson(s)`);
