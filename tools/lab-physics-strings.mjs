/*
 * Read the string table out of a PhET build.
 *
 * A Chinese build writes its strings as plain JSON.  An English build
 * writes a compressed table together with a small decoder that knows
 * how to read it.  Both are read here so the two can be compared.
 */
import fs from 'node:fs';

const KEY = 'window.phet.chipper.strings = ';

/* The decoder that PhET ships inside the English build. */
function readStatement(text) {
  const at = text.indexOf(KEY);
  if (at < 0) return null;
  const start = at + KEY.length;

  /* Walk the expression, tracking strings and brackets. */
  let i = start;
  let depth = 0;
  let inStr = null;
  for (; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      inStr = c;
      continue;
    }
    if (c === '(' || c === '{' || c === '[') depth++;
    else if (c === ')' || c === '}' || c === ']') depth--;
    else if (c === ';' && depth === 0) break;
  }
  return { start, end: i, statement: text.slice(start, i) };
}

export function readStrings(file) {
  const text = fs.readFileSync(file, 'utf8');
  const st = readStatement(text);
  if (!st) return null;

  /* Plain JSON: the Chinese builds. */
  const trimmed = st.statement.trim();
  if (trimmed.startsWith('{')) {
    return { file, kind: 'json', table: JSON.parse(trimmed), span: st };
  }

  /* Compressed: the English builds. */
  const m = st.statement.match(/^\((y=>\{[\s\S]*\})\)\(([\s\S]*)\)$/);
  if (!m) return { file, kind: 'unknown', statement: st.statement.slice(0, 200), span: st };
  const decoder = eval(`(${m[1]})`);
  const payload = eval(m[2]);
  return { file, kind: 'packed', table: decoder(payload), span: st, payload };
}

if (process.argv[1] && process.argv[1].endsWith('lab-physics-strings.mjs')) {
  for (const f of process.argv.slice(2)) {
    const r = readStrings(f);
    if (!r) {
      console.log(f, 'no strings');
      continue;
    }
    const locales = Object.keys(r.table);
    const counts = {};
    for (const l of locales) counts[l] = Object.keys(r.table[l]).length;
    console.log(f, r.kind, JSON.stringify(counts));
  }
}
