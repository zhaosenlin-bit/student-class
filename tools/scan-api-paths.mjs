#!/usr/bin/env node
/* List every /api/... path the mirrored front-end code can call. */
import fs from 'node:fs';
import path from 'node:path';

const roots = process.argv.slice(2);
const files = [];
for (const root of roots) {
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.name.endsWith('.js') || entry.name.endsWith('.mjs')) files.push(p);
    }
  };
  walk(root);
}

const found = new Map();
const pattern = /["'`](\/?api\/[A-Za-z0-9_\-/.${}]*)["'`]/g;
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  for (const m of text.matchAll(pattern)) {
    const key = m[1];
    if (!found.has(key)) found.set(key, new Set());
    found.get(key).add(path.basename(file));
  }
}
for (const [key, where] of [...found].sort()) {
  console.log(key.padEnd(46), [...where].join(','));
}
