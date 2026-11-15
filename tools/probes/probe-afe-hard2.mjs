/* Two programmes hand out a trial token but the file route complains.
   Try the file route the way the player does. */
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
  const access = await (await fetch(`${ORIGIN}/api/programs/${id}/access-token`, { headers })).json();
  console.log('  access:', JSON.stringify(access).slice(0, 200));
  if (!access.token) continue;

  for (const route of [
    `/api/program-file/${id}?token=${encodeURIComponent(access.token)}`,
    `/api/program-file/${id}?token=${encodeURIComponent(access.token)}&accelerated=1`,
    `/api/programs/${id}/access-token?refresh=1`,
  ]) {
    try {
      const res = await fetch(ORIGIN + route, { headers });
      const text = await res.text();
      console.log(`  ${route.slice(0, 60)} -> ${res.status} len=${text.length}`);
      console.log(`     ${text.slice(0, 200).replace(/\s+/g, ' ')}`);
    } catch (e) {
      console.log(`  ${route.slice(0, 60)} -> ERR ${e.message}`);
    }
  }
}
