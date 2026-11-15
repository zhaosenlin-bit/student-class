#!/usr/bin/env node
// Every /api/ path the 图灵智赋 bundle can call, and which of them the local
// server answers.  Anything "missing" here is a gap to close.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assets = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'assets');

const calls = new Map();
const walk = (dir) => {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p);
    else if (/\.(js|mjs|html)$/.test(f.name)) {
      const text = fs.readFileSync(p, 'utf8');
      const re = /['"`]((?:https?:\/\/[^'"`]+)?\/api\/[A-Za-z0-9_\-\/\.\$\{\}]*)['"`]/g;
      let m;
      while ((m = re.exec(text))) {
        const raw = m[1];
        const url = raw.replace(/^https?:\/\/[^/]+/, '');
        if (!calls.has(url)) calls.set(url, new Set());
        calls.get(url).add(path.relative(assets, p));
      }
    }
  }
};
walk(assets);

const server = fs.readFileSync(path.join(ROOT, 'server', 'server.mjs'), 'utf8');
const handled = (url) => {
  const staticPart = url.replace(/\{[^}]*\}/g, '').replace(/[?].*$/, '');
  return server.includes(staticPart) || server.includes(staticPart.slice(0, -1));
};

const rows = [...calls].sort((a, b) => a[0].localeCompare(b[0]));
let missing = 0;
for (const [url, files] of rows) {
  const ok = handled(url);
  if (!ok) missing += 1;
  console.log(`${ok ? 'ok    ' : 'MISS  '}${url}   [${[...files].slice(0, 2).join(', ')}]`);
}
console.log(`\n${rows.length} distinct paths, ${missing} without a literal match in the server`);
