/*
 * The works that refuse a whole-program token are marked "reviewed public".
 * The player mounts a hosted module for them. Find out what it calls.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://aifunengjiaoyu.com';
const TOKEN = fs.readFileSync(path.join(ROOT, 'recon', 'scratch', 'afe-token.txt'), 'utf8').trim();
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const res = await fetch(`${ORIGIN}/admin-large/runtime/public-host.mjs`, {
  headers: { 'User-Agent': UA, Referer: `${ORIGIN}/` },
});
const text = await res.text();
console.log(`public-host.mjs -> ${res.status} len=${text.length}`);
console.log('--- api routes ---');
for (const m of text.matchAll(/['"`](\/api\/[^'"`\s]+)['"`]/g)) console.log('  ', m[1]);
console.log('--- fetch calls ---');
for (const m of text.matchAll(/fetch\(([^)]{0,120})\)/g)) console.log('  ', m[0].slice(0, 130));
fs.writeFileSync(path.join(ROOT, 'recon', 'scratch', 'public-host.mjs'), text);
