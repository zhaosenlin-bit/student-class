/* Follow the loader shell one hop and report what the body route gives. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://aifunengjiaoyu.com';
const TOKEN = fs.readFileSync(path.join(ROOT, 'recon', 'scratch', 'afe-token.txt'), 'utf8').trim();
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const headers = { 'User-Agent': UA, Referer: `${ORIGIN}/`, Authorization: `Bearer ${TOKEN}` };

for (const id of process.argv.slice(2).map(Number).filter(Boolean)) {
  console.log(`\n=== ${id} ===`);
  let url = `${ORIGIN}/api/program-file/${id}`;
  for (let hop = 0; hop < 5; hop++) {
    const res = await fetch(url, { headers });
    const text = await res.text();
    console.log(`  hop${hop} ${res.status} len=${text.length} ${url.slice(0, 90)}`);
    const next = text.match(/window\.location\.replace\(["']([^"']+)["']\)/);
    if (!next) {
      console.log('    ' + text.slice(0, 300).replace(/\s+/g, ' '));
      break;
    }
    url = next[1].startsWith('http') ? next[1] : ORIGIN + next[1];
  }
}
