/*
 * Work out which wording a reader actually sees in a simulation.
 *
 * A simulation keeps far more wording than it shows.  Only the wording
 * that turns up in the rendered page needs a Chinese wording; the rest
 * can stay as it is.
 *
 *   node tools/lab-physics-visible-keys.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { readStrings } from './lab-physics-strings.mjs';

const CW = path.resolve('mirror/lab-physics/courseware');
const rendered = JSON.parse(
  fs.readFileSync('work/lq-rendered-text.json', 'utf8')
);

const unwrap = (s) =>
  String(s)
    .replace(/^[\u202a\u202b]/, '')
    .replace(/[\u202c]$/, '');

/* The words the reader saw, per simulation. */
const visible = new Map();
for (const item of rendered.results || []) {
  const id = item.id || '';
  if (!id.startsWith('lab-physics-')) continue;
  const name = id.slice('lab-physics-'.length);
  const lines = new Set(
    String(item.text || '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
  );
  visible.set(name, lines);
}

const out = {};
for (const f of fs.readdirSync(CW)) {
  if (!f.endsWith('.html')) continue;
  const name = f.replace(/\.html$/, '');
  const r = readStrings(path.join(CW, f));
  if (!r || !r.table || !r.table.en) continue;
  const lines = visible.get(name);
  const hits = {};
  const loose = [];
  for (const [key, raw] of Object.entries(r.table.en)) {
    const value = unwrap(raw);
    if (!/[A-Za-z]{2,}/.test(value)) continue;
    if (!lines) continue;
    if (lines.has(value)) {
      hits[key] = value;
      continue;
    }
    /* The reader saw a piece of a longer wording. */
    for (const line of lines) {
      if (line.includes(value) && value.length >= 3) {
        loose.push([key, value, line]);
        break;
      }
    }
  }
  out[name] = { hits, loose };
  console.log(
    `${name}: ${Object.keys(hits).length} exact visible, ${loose.length} loose`
  );
}

fs.writeFileSync(
  'work/lab-physics-visible-keys.json',
  JSON.stringify(out, null, 1)
);

/* The wording that is visible in at least one simulation. */
const values = new Map();
for (const sim of Object.values(out)) {
  for (const [key, value] of Object.entries(sim.hits)) {
    if (!values.has(value)) values.set(value, []);
    values.get(value).push(key);
  }
}
fs.writeFileSync(
  'work/lab-physics-visible-values.json',
  JSON.stringify(
    [...values.entries()].map(([value, keys]) => ({ value, keys })),
    null,
    1
  )
);
console.log(`\ndistinct visible wording: ${values.size}`);
