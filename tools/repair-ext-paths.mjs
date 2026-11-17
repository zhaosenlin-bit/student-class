#!/usr/bin/env node
/*
 * Repair the addresses of mirrored CDN files.
 *
 * While the work was being mirrored, the name of a host and the path
 * behind it were joined without a slash in between, so a texture that
 * lives at threejs.org/examples/... was asked for at
 * threejs.orgexamples/...  The file was never found.
 *
 *   node tools/repair-ext-paths.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOSTS = [
  'threejs.org',
  'cdn.jsdelivr.net',
  'unpkg.com',
  'cdnjs.cloudflare.com',
  'code.jquery.com',
  's3.amazonaws.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'ga.jspm.io',
  'maxcdn.bootstrapcdn.com',
  'cdn.tailwindcss.com',
  'ajax.googleapis.com',
  'raw.githubusercontent.com',
  'www.new3jcn.com',
  'new3jcn.com',
  'storage.googleapis.com',
  'assets.mixkit.co',
  'www.soundhelix.com',
  'esm.sh',
];
const RE = new RegExp(
  '(/_ext/)(' + HOSTS.map((h) => h.replace(/\./g, '\\.')).join('|') + ')(?=[a-z0-9])',
  'g'
);

const dirs = [
  path.join(ROOT, 'mirror', '3jcn', 'courseware'),
  path.join(ROOT, 'mirror', 'leqixiang', 'courseware'),
];

let files = 0;
let hits = 0;
for (const dir of dirs) {
  if (!fs.existsSync(dir)) continue;
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.html')) continue;
    const file = path.join(dir, name);
    const html = fs.readFileSync(file, 'utf8');
    const n = (html.match(RE) || []).length;
    if (!n) continue;
    files++;
    hits += n;
    fs.writeFileSync(file, html.replace(RE, '$1$2/'), 'utf8');
  }
}
console.log(`修正了 ${hits} 个地址，涉及 ${files} 个课件文件`);
