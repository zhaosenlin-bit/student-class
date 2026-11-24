/*
 * How much of an English simulation can be covered by the Chinese
 * wording we already have, and what is left over.
 */
import fs from 'node:fs';
import path from 'node:path';
import { readStrings } from './lab-physics-strings.mjs';

const CW = path.resolve('mirror/lab-physics/courseware');
const glossary = JSON.parse(
  fs.readFileSync('work/lab-physics-glossary.json', 'utf8')
);

const unwrap = (s) =>
  s
    .replace(/^[\u202a\u202b]/, '')
    .replace(/[\u202c]$/, '');

const rows = [];
for (const f of fs.readdirSync(CW)) {
  if (!f.endsWith('.html')) continue;
  const r = readStrings(path.join(CW, f));
  if (!r || !r.table || !r.table.en) continue;
  const en = r.table.en;
  const keys = Object.keys(en);
  if (!keys.length) continue;
  /* A simulation that already has Chinese is done. */
  if (r.table.zh_CN) continue;
  let covered = 0;
  const missing = [];
  for (const k of keys) {
    const v = unwrap(String(en[k]));
    /* A value that is already Chinese needs no work. */
    if (/[\u3400-\u9fff]/.test(v)) continue;
    if (glossary[k]) covered++;
    else missing.push(k);
  }
  rows.push({
    slug: f.replace(/\.html$/, ''),
    total: keys.length,
    covered,
    missing: missing.length,
    missingKeys: missing,
  });
}

rows.sort((a, b) => b.missing - a.missing);
fs.writeFileSync(
  'work/lab-physics-zh-plan.json',
  JSON.stringify(rows, null, 1)
);
console.log('English PhET simulations:', rows.length);
console.log(
  'total keys',
  rows.reduce((s, r) => s + r.total, 0),
  'covered',
  rows.reduce((s, r) => s + r.covered, 0),
  'missing',
  rows.reduce((s, r) => s + r.missing, 0)
);
for (const r of rows) {
  console.log(
    `${r.slug.padEnd(38)} ${String(r.total).padStart(4)} keys  covered ${String(r.covered).padStart(4)}  missing ${r.missing}`
  );
}

/* The keys that are missing most often are the ones worth a dictionary. */
const freq = new Map();
for (const r of rows) for (const k of r.missingKeys) freq.set(k, (freq.get(k) || 0) + 1);
const top = [...freq].sort((a, b) => b[1] - a[1]);
fs.writeFileSync(
  'work/lab-physics-zh-missing-keys.json',
  JSON.stringify(top, null, 1)
);
console.log('--- missing keys seen in more than one simulation ---');
console.log(top.filter(([, n]) => n > 1).map(([k, n]) => `${k}:${n}`).join('  '));
