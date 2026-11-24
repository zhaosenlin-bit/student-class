#!/usr/bin/env node
/*
 * Look for the one kind of damage that is easy to miss: a word that is
 * part of the program rather than part of the wording, translated all the
 * same.  A heading that says "章节" instead of "chapter" is fine; a
 * program that keeps its chapter under one name and looks it up under
 * another is broken, and it looks broken only as a blank page.
 *
 * The mirror that was taken before any wording was changed is the
 * reference: a name that is used as a key in one and not in the other
 * is a name that was translated where it should not have been.
 *
 *   node tools/lq-identifier-audit.mjs --pristine C:/kaifa/_pristine
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const PRISTINE = arg('pristine', 'C:/kaifa/_pristine');
const ROOTS = arg(
  'roots',
  'mirror/leqixiang/courseware,mirror/studio/courseware,mirror/lab-course/courseware,mirror/lab-virtual/courseware,mirror/lab-reaction/courseware,mirror/lab-explore/courseware,mirror/lab-physics/courseware,mirror/lab-process/courseware,mirror/library/courseware'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const OUT = arg('out', '');

const CJK = /[\u3400-\u9fff\uf900-\ufaff]/;

/* A cheap look for a Chinese word used as a name.  The slow scan below
   only runs on the files these find. */
const CJK_KEY = /['"][^'"\n]*[\u3400-\u9fff][^'"\n]*['"]\s*:/;
const CJK_INDEX = /\[['"][^'"\n]*[\u3400-\u9fff][^'"\n]*['"]\]/;

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

function identifierLiterals(text) {
  const out = [];
  /*
   * A hand-written walk.  A regular expression for "the next string
   * literal" backs up badly on a page with a long data word in it, and
   * these pages have some very long ones.
   */
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
        /* A template hole is code, not wording. */
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
    while (after < text.length && /\s/.test(text[after])) after++;
    const next = text[after] || '';
    const prev = prevChar(text, start);
    let role = '';
    if (next === ':' && prev !== '?') role = 'key';
    else if (prev === '[') role = 'index';
    if (!role) continue;
    out.push({ value: body, role, index: start });
  }
  return out;
}

const report = [];
let files = 0;
let compared = 0;

for (const root of ROOTS) {
  if (!fs.existsSync(root)) continue;
  for (const name of fs.readdirSync(root)) {
    if (!name.endsWith('.html')) continue;
    files++;
    const cur = fs.readFileSync(path.join(root, name), 'utf8');
    const refPath = path.join(PRISTINE, root.replace(/\\/g, '/'), name);
    if (!fs.existsSync(refPath)) continue;
    compared++;
    /* The cheap look first: a file without a Chinese name in it is not
       worth the slow scan. */
    if (!CJK_KEY.test(cur) && !CJK_INDEX.test(cur)) continue;
    const ref = fs.readFileSync(refPath, 'utf8');
    const curLits = identifierLiterals(cur);
    const refLits = identifierLiterals(ref);
    const curCjk = curLits.filter((l) => CJK.test(l.value));
    if (!curCjk.length) continue;
    const refSet = new Set(refLits.map((l) => l.value));
    /* A Chinese name in a program that had no Chinese name before is the
       sign of a word that was translated where it should not have been. */
    const fresh = curCjk.filter((l) => !refSet.has(l.value));
    if (!fresh.length) continue;
    /* The English name it replaced: an identifier the reference has and
       the copy has lost. */
    const curSet = new Set(curLits.map((l) => l.value));
    const lost = [...new Set(refLits.map((l) => l.value).filter((v) => !CJK.test(v)))].filter(
      (v) => !curSet.has(v)
    );
    report.push({
      file: path.join(root, name).replace(/\\/g, '/'),
      fresh: [...new Set(fresh.map((l) => l.value))].map((v) => v.slice(0, 40)),
      freshCount: fresh.length,
      lost: lost.slice(0, 12),
      lostCount: lost.length,
    });
  }
}

report.sort((a, b) => b.freshCount - a.freshCount);
console.log(`scanned ${files} files, compared ${compared} with the reference`);
console.log(`files with a translated program name: ${report.length}`);
for (const r of report) {
  console.log(
    `  ${r.file}  new=${JSON.stringify(r.fresh)} (${r.freshCount})  lost=${r.lost.length}`
  );
}
if (OUT) fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
