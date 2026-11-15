/* Inspect a body that came from the camera-launch route. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = process.argv[2];
const text = fs.readFileSync(path.resolve(ROOT, file), 'utf8');
console.log('len', text.length);
console.log('base:', text.match(/<base href="([^"]+)"/)?.[1]?.slice(0, 200));
console.log('--- head ---');
console.log(text.slice(0, 700).replace(/\s+/g, ' '));
console.log('--- refs ---');
const refs = new Set();
for (const m of text.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)) refs.add(m[1]);
for (const m of text.matchAll(/\bimport\s*(?:[^'"]*?\bfrom\s*)?["']([^"']+)["']/g)) refs.add(m[1]);
[...refs].slice(0, 40).forEach((r) => console.log('  ', r));
console.log('total refs', refs.size);
