/* Which references did the camera crawler fail to resolve? */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CW = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'courseware');
const id = process.argv[2];
const html = fs.readFileSync(path.join(CW, `${id}.html`), 'utf8');
const base = html.match(/<base[^>]*href="([^"]+)"/i)?.[1];
console.log('base:', base);

const refs = new Set();
for (const m of html.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)) refs.add(m[1]);
for (const m of html.matchAll(/["'`]([^"'`]*\.(?:js|css|json|glb|png|jpg|webp|svg|mp3|woff2?))["'`]/gi)) refs.add(m[1]);
for (const m of html.matchAll(/\bimport\s*(?:[^'"]*?\bfrom\s*)?["']([^"']+)["']/g)) refs.add(m[1]);
console.log('refs:');
for (const r of refs) console.log('  ', r);

console.log('\nasset dir:');
const dir = path.join(CW, `${id}.assets`);
const walk = (d, prefix = '') => {
  if (!fs.existsSync(d)) return;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.isDirectory()) walk(path.join(d, e.name), prefix + e.name + '/');
    else console.log('  ', prefix + e.name, fs.statSync(path.join(d, e.name)).size);
  }
};
walk(dir);
