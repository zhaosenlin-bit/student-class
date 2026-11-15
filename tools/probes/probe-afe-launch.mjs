/* The player has more than one way in. Try the routes it uses. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://aifunengjiaoyu.com';
const TOKEN = fs.readFileSync(path.join(ROOT, 'recon', 'scratch', 'afe-token.txt'), 'utf8').trim();
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const headers = {
  'User-Agent': UA,
  Referer: `${ORIGIN}/`,
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

for (const id of process.argv.slice(2).map(Number).filter(Boolean)) {
  console.log(`\n=== ${id} ===`);
  for (const [route, body] of [
    [`/api/programs/${id}/camera-launch`, '{}'],
    [`/api/programs/${id}/launch`, '{}'],
    [`/api/programs/${id}/chapter-launch`, '{}'],
    [`/api/programs/${id}/public-launch`, '{}'],
  ]) {
    try {
      const res = await fetch(ORIGIN + route, { method: 'POST', headers, body });
      const text = await res.text();
      console.log(`  POST ${route} -> ${res.status} ${text.slice(0, 220).replace(/\s+/g, ' ')}`);
    } catch (e) {
      console.log(`  POST ${route} -> ERR ${e.message}`);
    }
  }
}
