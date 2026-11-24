#!/usr/bin/env node
/*
 * A module that is asked for as an ordinary script.
 *
 * An add-on of three.js is a module: it says what it brings in and
 * what it gives.  A browser that is asked to read it as an ordinary
 * script stops at the first word it cannot read, and the lesson
 * loses that part of itself.
 *
 * Such a tag gives nothing anyway — a module never puts its names
 * where an ordinary script could find them — so the tag is taken
 * away.
 *
 *   node tools/lq-module-tags.mjs --check --roots mirror
 *   node tools/lq-module-tags.mjs --fix   --roots mirror
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf('--' + name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const has = (name) => args.includes('--' + name);

const ROOTS = arg('roots', 'mirror').split(',').filter(Boolean);

const pages = (roots) => {
  const out = [];
  for (const root of roots) {
    const stack = [root];
    while (stack.length) {
      const dir = stack.pop();
      let names = [];
      try {
        names = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const n of names) {
        const full = path.join(dir, n.name);
        if (n.isDirectory()) {
          if (/\.assets$/.test(n.name)) continue;
          stack.push(full);
        } else if (n.name.endsWith('.html')) out.push(full.split(path.sep).join('/'));
      }
    }
  }
  return out;
};

/* A tag that reads a module of three.js as an ordinary script. */
const TAG = /<script([^>]*)src\s*=\s*["']([^"']*examples\/jsm\/[^"']*)["'][^>]*>\s*<\/script>/gi;

let touched = 0;
for (const file of pages(ROOTS)) {
  const text = fs.readFileSync(file, 'utf8');
  TAG.lastIndex = 0;
  let out = text;
  let count = 0;
  for (const m of [...text.matchAll(TAG)]) {
    if (/type\s*=\s*["']module["']/.test(m[1])) continue;
    out = out.replace(m[0], '');
    count++;
  }
  if (!count) continue;
  touched++;
  console.log(`${file}  (${count} tags)`);
  if (has('fix')) fs.writeFileSync(file, out, 'utf8');
}

console.log(`\n${has('fix') ? 'took away' : 'would take away'} ${touched} pages`);
