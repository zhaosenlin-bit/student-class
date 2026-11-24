#!/usr/bin/env node
/*
 * Finds Chinese words that stand where a rule of the style sheet belongs.
 *
 * A style sheet is made of names and values:
 *
 *     iframe { volume: silent; }
 *
 * When a word of that kind is turned into Chinese the rule is not a rule
 * any more and the browser throws it away.  The page keeps its colours but
 * loses the styling of that one part.
 *
 * This walk reports the style sheets that hold such a word.
 *
 *   node tools/lq-css-chinese.mjs --roots mirror
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

const STYLE = /<style[^>]*>([\s\S]*?)<\/style>/gi;
/* A word, a colon and a value that holds a Chinese character. */
const RULE = /[a-z-]+\s*:\s*[^;{}]*[㐀-鿿][^;{}]*[;}]/gi;

let found = 0;

for (const root of ROOTS) {
  if (!fs.existsSync(root)) continue;
  for (const file of walk(root)) {
    const text = fs.readFileSync(file, 'utf8');
    for (const block of text.matchAll(STYLE)) {
      const css = block[1];
      for (const rule of css.matchAll(RULE)) {
        found += 1;
        const line = css.slice(0, rule.index).split(/\r?\n/).length;
        console.log(`${file}  (style line ${line})\n  ${rule[0].trim()}`);
      }
    }
  }
}

console.log(`\n${found} rule(s) with a Chinese word`);
