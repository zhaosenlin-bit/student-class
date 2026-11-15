#!/usr/bin/env node
/*
 * List every absolute http(s) URL still baked into the mirrored front-end.
 *
 * The local copy should not reach out to the live site at runtime, so this
 * is the check that keeps the replica honest: after mirroring, the only
 * hosts left should be ones the server deliberately handles (or none).
 */
import fs from 'node:fs';
import path from 'node:path';

const roots = process.argv.slice(2);
if (!roots.length) {
  console.error('usage: node tools/scan-live-deps.mjs <dir|url> [dir|url ...]');
  process.exit(2);
}

const SCAN_EXT = /\.(js|mjs|html|css|json)$/i;
const URL_RE = /https?:\/\/[a-z0-9.-]+(?::\d+)?/gi;

const byHost = new Map();
let scanned = 0;

const note = (host, where) => {
  if (!byHost.has(host)) byHost.set(host, new Set());
  byHost.get(host).add(where);
};

const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (SCAN_EXT.test(entry.name)) {
      scanned++;
      const text = fs.readFileSync(p, 'utf8');
      for (const m of text.matchAll(URL_RE)) {
        const host = m[0].replace(/^https?:\/\//i, '').toLowerCase();
        note(host, path.relative(process.cwd(), p));
      }
    }
  }
};

for (const root of roots) {
  // A URL is scanned as the browser would receive it, which is the only way
  // to catch references the server rewrites away at serve time.
  if (/^https?:\/\//i.test(root)) {
    try {
      const r = await fetch(root);
      const text = await r.text();
      scanned++;
      for (const m of text.matchAll(URL_RE)) {
        note(m[0].replace(/^https?:\/\//i, '').toLowerCase(), root);
      }
    } catch (e) {
      console.error(`fetch failed ${root}: ${e.message}`);
    }
    continue;
  }
  if (!fs.existsSync(root)) {
    console.error(`missing: ${root}`);
    continue;
  }
  walk(root);
}

console.log(`scanned ${scanned} files under ${roots.join(', ')}`);
if (!byHost.size) {
  console.log('no absolute URLs left — the copy is fully self-contained');
  process.exit(0);
}
for (const [host, files] of [...byHost].sort((a, b) => b[1].size - a[1].size)) {
  console.log(`\n${host}  (${files.size} files)`);
  for (const f of [...files].slice(0, 6)) console.log(`    ${f}`);
  if (files.size > 6) console.log(`    ... +${files.size - 6} more`);
}
