/* The file route answers with a small loader. Print it in full. */
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
  const access = await (await fetch(`${ORIGIN}/api/programs/${id}/access-token`, { headers })).json();
  const res = await fetch(`${ORIGIN}/api/program-file/${id}?token=${encodeURIComponent(access.token)}`, {
    headers,
  });
  const text = await res.text();
  console.log(`\n=== ${id} (${res.status}, ${text.length} bytes) ===`);
  console.log(text);
}
