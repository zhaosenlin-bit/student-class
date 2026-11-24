#!/usr/bin/env node
/*
 * The Chinese names a program stands on, and the place each one
 * stands in.
 *
 * A name that is written as the key of an object is the courseware's
 * own wording, and it stays as it is.  A name that stands where a
 * value belongs is a name the program does not know, and the lesson
 * stops working at that place.
 *
 *   node tools/lq-cn-names.mjs --roots mirror
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
const QUOTE = String.fromCharCode(39);

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
    if (text[i] !== '<') {
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

const isKeyOf = (node, parent) => {
  if (!parent) return false;
  if (parent.type !== 'Property') return false;
  if (parent.key !== node) return false;
  return !parent.computed;
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
    const walk = (node, parent) => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) {
        for (const item of node) walk(item, parent);
        return;
      }
      if (node.type === 'Identifier' && CJK.test(node.name)) {
        found.push({
          file,
          at: p.start + node.start,
          end: p.start + node.end,
          name: node.name,
          isKey: isKeyOf(node, parent),
          parent: parent ? parent.type : ''
        });
      }
      for (const key of Object.keys(node)) {
        if (key === 'start' || key === 'end' || key === 'type') continue;
        const value = node[key];
        if (value && typeof value === 'object') walk(value, node);
      }
    };
    walk(ast, null);
  }
}

const own = found.filter((f) => f.isKey);
const broken = found.filter((f) => !f.isKey);

const fix = (list) => {
  const byFile = new Map();
  for (const f of list) {
    if (!byFile.has(f.file)) byFile.set(f.file, []);
    byFile.get(f.file).push(f);
  }
  let fixed = 0;
  for (const [file, places] of byFile) {
    const text = fs.readFileSync(file, 'utf8');
    let out = text;
    for (const f of [...places].sort((a, b) => b.at - a.at)) {
      out = out.slice(0, f.at) + QUOTE + f.name + QUOTE + out.slice(f.end);
      fixed++;
    }
    fs.writeFileSync(file, out, 'utf8');
  }
  console.log('given back their quotes: ' + fixed + ' in ' + byFile.size + ' pages');
};

const tally = (list) => {
  const m = new Map();
  for (const f of list) m.set(f.name, (m.get(f.name) || 0) + 1);
  return [...m].sort((a, b) => b[1] - a[1]);
};

if (args.includes('--fix')) fix(broken);

console.log(`the courseware's own names: ${own.length}`);
for (const [name, n] of tally(own)) console.log('  ', n, name);
console.log(`\nnames that stand where a value belongs: ${broken.length}`);
for (const [name, n] of tally(broken)) console.log('  ', n, name);
console.log(`\nfiles: ${new Set(broken.map((f) => f.file)).size}`);

if (args.includes('--where')) {
  for (const f of broken) {
    const text = fs.readFileSync(f.file, 'utf8');
    console.log(`${f.file} @${f.at} ${JSON.stringify(f.name)} ${f.parent}`);
    console.log(`  ${JSON.stringify(text.slice(Math.max(0, f.at - 70), f.at + 50))}`);
  }
}
