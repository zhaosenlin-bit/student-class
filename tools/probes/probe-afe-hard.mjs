/* Why do eight programmes refuse to hand over a body? Look at every route
   the platform exposes for one of them. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://aifunengjiaoyu.com';
const TOKEN = fs.readFileSync(path.join(ROOT, 'recon', 'scratch', 'afe-token.txt'), 'utf8').trim();
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const ids = process.argv.slice(2).map(Number).filter(Boolean);
const headers = { 'User-Agent': UA, Referer: `${ORIGIN}/`, Authorization: `Bearer ${TOKEN}` };

for (const id of ids) {
  console.log(`\n=== ${id} ===`);
  for (const route of [
    `/api/programs/${id}/access-token`,
    `/api/programs/${id}`,
    `/api/program-file/${id}`,
    `/api/program-file/verify-access?programId=${id}`,
  ]) {
    try {
      const res = await fetch(ORIGIN + route, { headers });
      const text = await res.text();
      console.log(`  ${route} -> ${res.status} ${text.slice(0, 260).replace(/\s+/g, ' ')}`);
    } catch (e) {
      console.log(`  ${route} -> ERR ${e.message}`);
    }
  }
}
