#!/usr/bin/env node
// Which API paths does the 小白教育 front-end actually call, and with what
// method?  Used to make sure the local server keeps answering exactly the
// calls the original code makes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const hits = new Map();
const note = (file, kind, url) => {
  if (!url.startsWith('/api/')) return;
  const key = `${url}`;
  if (!hits.has(key)) hits.set(key, { count: 0, kinds: new Set(), files: new Set() });
  const h = hits.get(key);
  h.count += 1;
  h.kinds.add(kind);
  h.files.add(path.basename(file));
};

function scan(file, text) {
  for (const m of text.matchAll(/api\(\s*[`'"]([^`'"$]+)[`'"]/g)) note(file, 'api()', m[1]);
  for (const m of text.matchAll(/fetch\(\s*[`'"]([^`'"$]+)[`'"]/g)) note(file, 'fetch', m[1]);
}

const assets = path.join(ROOT, 'mirror', 'xbjiaoyu', 'assets');
for (const f of fs.readdirSync(assets)) {
  if (/\.(js|html)$/.test(f)) scan(f, fs.readFileSync(path.join(assets, f), 'utf8'));
}

const cw = path.join(ROOT, 'mirror', 'xbjiaoyu', 'courseware');
for (const f of fs.readdirSync(cw)) {
  if (f.endsWith('.html')) scan(f, fs.readFileSync(path.join(cw, f), 'utf8'));
}

console.log('API paths the mirrored front-end calls:');
for (const [url, h] of [...hits].sort((a, b) => b[1].count - a[1].count)) {
  console.log(`  ${String(h.count).padStart(4)}  ${url}   [${[...h.kinds].join(', ')}]`);
}
