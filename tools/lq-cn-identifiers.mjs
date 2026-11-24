#!/usr/bin/env node
/*
 * A Chinese word that stands where a program expects a name.
 *
 * When a wording is put in a place where the program reads a name,
 * the program is handed a name it does not know, and the lesson
 * stops working at that place.  Such names are found by reading every
 * program with a reader that knows JavaScript and looking for names
 * that are written in Chinese.
 *
 *   node tools/lq-cn-identifiers.mjs --roots mirror
 */
import fs from 'node:fs';
import path from 'node:path';
import * as acorn from './vendor/acorn.mjs';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const ROOTS = arg('roots', 'mirror').split(',').filter(Boolean);
const CJK = /[\u3400-\u9fff\uf900-\ufaff]/;

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

/* The programs a page holds. */
const programsOf = (text) => {
  const out = [];
  const lower = text.toLowerCase();
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c !== '<') {
      i++;
      continue;
    }
    if (text.startsWith('<!--', i)) {
      const close = text.indexOf('-->', i + 4);
      i = close < 0 ? text.length : close + 3;
      continue;
    }
    if (lower.startsWith('<script', i)) {
      const open = text.indexOf('>', i);
      if (open < 0) break;
      const close = lower.indexOf('</script', open);
      const end = close < 0 ? text.length : close;
      out.push({ start: open + 1, end, code: text.slice(open + 1, end) });
      i = close < 0 ? text.length : close;
      continue;
    }
    i++;
  }
  return out;
};

const found = [];
for (const file of pages(ROOTS)) {
  const text = fs.readFileSync(file, 'utf8');
  for (const p of programsOf(text)) {
    let ast;
    try {
      ast = acorn.parse(p.code, { ecmaVersion: 'latest', sourceType: 'script' });
    } catch {
      try {
        ast = acorn.parse(p.code, { ecmaVersion: 'latest', sourceType: 'module' });
      } catch {
        continue;
      }
    }
    const walk = (node) => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) {
        for (const item of node) walk(item);
        return;
      }
      if (node.type === 'Identifier' && CJK.test(node.name)) {
        found.push({
          file,
          at: p.start + node.start,
          name: node.name,
          parent: node.parent?.type || ''
        });
      }
      for (const key of Object.keys(node)) {
        if (key === 'start' || key === 'end' || key === 'type' || key === 'parent') continue;
        const value = node[key];
        if (value && typeof value === 'object') walk(value);
      }
    };
    walk(ast);
  }
}

const byFile = new Map();
for (const f of found) {
  if (!byFile.has(f.file)) byFile.set(f.file, []);
  byFile.get(f.file).push(f);
}

for (const [file, list] of byFile) {
  const text = fs.readFileSync(file, 'utf8');
  for (const f of list) {
    console.log(`${file} @${f.at}  ${JSON.stringify(f.name)}`);
    console.log(`  ${JSON.stringify(text.slice(Math.max(0, f.at - 80), f.at + 60))}`);
  }
}
console.log(`\nfiles: ${byFile.size}   names: ${found.length}`);
