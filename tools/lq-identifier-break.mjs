#!/usr/bin/env node
/*
 * Find the courses where a name was translated on one side of a program
 * and not on the other.
 *
 * A course keeps its chapters under one name and looks them up under
 * another, and the course comes up as an empty page.  The mirror that
 * was taken before any wording was changed is the reference: when the
 * reference says "chapter" and the copy says "章节", and the copy still
 * reads "chapter" somewhere, the two no longer meet.
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

/*
 * The mirror that was taken before any wording was changed.  It is
 * not kept in the repository, so it has to be pointed at; the archive
 * next to the project holds a copy of it.
 */
const PRISTINE = arg('pristine', '');
if (!PRISTINE || !fs.existsSync(PRISTINE)) {
  console.log(
    'the mirror taken before the wording was changed is needed;\n' +
      '  node tools/lq-identifier-break.mjs --pristine <the folder>'
  );
  process.exit(1);
}
const ROOTS = arg(
  'roots',
  'mirror/leqixiang/courseware,mirror/studio/courseware,mirror/lab-course/courseware,mirror/lab-virtual/courseware,mirror/lab-reaction/courseware,mirror/lab-explore/courseware,mirror/lab-physics/courseware,mirror/lab-process/courseware,mirror/library/courseware'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const OUT = arg('out', '');
const FIX = args.includes('--fix');

const CJK = /[\u3400-\u9fff\uf900-\ufaff]/;

function prevChar(text, index) {
  let i = index - 1;
  let steps = 0;
  while (i >= 0 && steps < 200) {
    const ch = text[i];
    if (!/\s/.test(ch)) return ch;
    i--;
    steps++;
  }
  return '';
}

/* Every string in the page, with where it sits. */
function scan(text) {
  const all = [];
  const n = text.length;
  let i = 0;
  while (i < n) {
    const q = text[i];
    if (q !== '"' && q !== "'" && q !== '`') {
      i++;
      continue;
    }
    const start = i;
    i++;
    let body = '';
    let closed = false;
    while (i < n) {
      const ch = text[i];
      if (ch === '\\') {
        body += text[i + 1] || '';
        i += 2;
        continue;
      }
      if (ch === q) {
        closed = true;
        i++;
        break;
      }
      if (q === '`' && ch === '$' && text[i + 1] === '{') {
        let depth = 1;
        i += 2;
        while (i < n && depth) {
          if (text[i] === '{') depth++;
          else if (text[i] === '}') depth--;
          i++;
        }
        continue;
      }
      body += ch;
      i++;
    }
    if (!closed) break;
    let after = i;
    while (after < n && /\s/.test(text[after])) after++;
    const next = text[after] || '';
    const prev = prevChar(text, start);
    let role = '';
    if (next === ':' && prev !== '?') role = 'key';
    else if (prev === '[') role = 'index';
    all.push({ value: body, role, start, end: i });
  }
  return all;
}

/*
 * A name that is written in two pieces — 'chapt' + 'er' — is still the
 * same name, so a program that reads a name that way is reading it.
 */
function stillRead(cur, lits, name) {
  for (const l of lits) {
    if (l.value === name) return true;
  }
  for (let i = 0; i + 1 < lits.length; i++) {
    const a = lits[i];
    const b = lits[i + 1];
    const between = cur.slice(a.end, b.start);
    if (!/^\s*\+\s*$/.test(between)) continue;
    if (a.value + b.value === name) return true;
  }
  /* A name that is put together from more than two pieces. */
  for (let i = 0; i < lits.length; i++) {
    let acc = lits[i].value;
    for (let j = i + 1; j < Math.min(lits.length, i + 6); j++) {
      const between = cur.slice(lits[j - 1].end, lits[j].start);
      if (!/^\s*\+\s*$/.test(between)) break;
      acc += lits[j].value;
      if (acc === name) return true;
    }
  }
  return false;
}

/*
 * A name is often read as a bare word and not as a text:
 *
 *     const M = { energy: { ... } };
 *     M[key].energy
 *
 * So the words of the program are looked at with the texts taken out, and
 * the name is looked for there.
 */
function readAsWord(cur, lits, name) {
  const code = cur.split('');
  /* A remark is not a word of the program. */
  for (const m of cur.matchAll(/\/\*[\s\S]*?\*\//g)) {
    for (let i = m.index; i < m.index + m[0].length; i += 1) code[i] = ' ';
  }
  for (const m of cur.matchAll(/\/\/[^\n]*/g)) {
    for (let i = m.index; i < m.index + m[0].length; i += 1) code[i] = ' ';
  }
  for (const l of lits) {
    for (let i = l.start; i < l.end; i += 1) code[i] = ' ';
  }
  const bare = code.join('');
  const word = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\w$])${word}([^\\w$]|$)`).test(bare);
}

const report = [];
let compared = 0;

for (const root of ROOTS) {
  if (!fs.existsSync(root)) continue;
  for (const name of fs.readdirSync(root)) {
    if (!name.endsWith('.html')) continue;
    const curPath = path.join(root, name);
    const refPath = path.join(PRISTINE, root.replace(/\\/g, '/'), name);
    if (!fs.existsSync(refPath)) continue;
    compared++;
    const cur = fs.readFileSync(curPath, 'utf8');
    const ref = fs.readFileSync(refPath, 'utf8');
    const curLits = scan(cur);
    const refLits = scan(ref);
    const curIds = curLits.filter((l) => l.role);
    const refIds = refLits.filter((l) => l.role);
    if (!curIds.length || curIds.length !== refIds.length) continue;
    const breaks = [];
    for (let i = 0; i < curIds.length; i++) {
      const c = curIds[i];
      const r = refIds[i];
      if (c.value === r.value) continue;
      if (!CJK.test(c.value)) continue;
      if (CJK.test(r.value)) continue;
      /* The name the reference used is still read by the copy: the two
         sides no longer meet. */
      if (!stillRead(cur, curLits, r.value) && !readAsWord(cur, curLits, r.value)) continue;
      breaks.push({
        at: c.start,
        end: c.end,
        was: r.value,
        now: c.value,
        context: cur.slice(Math.max(0, c.start - 60), c.end + 60),
      });
    }
    if (breaks.length) {
      report.push({ file: curPath.replace(/\\/g, '/'), breaks });
      if (FIX) {
        /*
         * Put the name back the way the program reads it.  The wording
         * around it stays Chinese; only the name changes.
         */
        let text = cur;
        for (const b of breaks.slice().sort((x, y) => y.at - x.at)) {
          const quote = text[b.at];
          if (quote !== "'" && quote !== '"') {
            console.log(`  SKIP ${curPath}: could not place '${b.now}'`);
            continue;
          }
          const was = b.was.includes("'") ? `"${b.was}"` : `'${b.was}'`;
          text = text.slice(0, b.at) + was + text.slice(b.end);
        }
        fs.writeFileSync(curPath, text, 'utf8');
        console.log(`  FIXED ${curPath} (${breaks.length})`);
      }
    }
  }
}

console.log(`compared ${compared} courses with the reference`);
console.log(`courses where a name no longer meets: ${report.length}`);
for (const r of report) {
  console.log(`\n  ${r.file}  (${r.breaks.length})`);
  for (const b of r.breaks.slice(0, 12)) {
    console.log(`    ${JSON.stringify(b.was)} -> ${JSON.stringify(b.now)}`);
    console.log(`      ...${b.context}...`);
  }
}
if (OUT) fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
