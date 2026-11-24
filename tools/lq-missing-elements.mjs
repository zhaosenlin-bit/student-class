#!/usr/bin/env node
/*
 * Finds the lessons that reach for an element that is not on the page.
 *
 * A lesson that does
 *
 *     document.getElementById('audioBtn').addEventListener('click', ...)
 *
 * stops with
 *
 *     Cannot read properties of null (reading 'addEventListener')
 *
 * when the page has no element with that name.  The mirror of a lesson can
 * lose such an element, and the lesson then never starts.
 *
 * This walk reads every lesson and reports the names it asks for but does
 * not have.
 *
 *   node tools/lq-missing-elements.mjs --roots mirror
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const ROOTS = arg('roots', 'mirror').split(',').map((s) => s.trim());

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const ASK = /getElementById\(\s*['"]([^'"]+)['"]\s*\)/g;
const HAVE = /\sid\s*=\s*['"]([^'"]+)['"]/g;

/* The names a lesson writes into the page itself. */
const WRITES = [
  /\.(?:innerHTML|outerHTML|textContent)\s*=\s*['"]/,
  /insertAdjacentHTML/,
  /createElement/,
];

let found = 0;

for (const root of ROOTS) {
  if (!fs.existsSync(root)) continue;
  for (const file of walk(root)) {
    const text = fs.readFileSync(file, 'utf8');

    const have = new Set([...text.matchAll(HAVE)].map((m) => m[1]));
    const asked = new Set([...text.matchAll(ASK)].map((m) => m[1]));
    if (!asked.size) continue;

    /* A lesson that fills the page itself may name an element it builds. */
    if (WRITES.some((w) => w.test(text))) continue;

    const missing = [...asked].filter((id) => !have.has(id));
    if (!missing.length) continue;
    found += missing.length;
    console.log(`${file}\n  ${missing.join('\n  ')}`);
  }
}

console.log(`\n${found} name(s) asked for but not on the page`);
