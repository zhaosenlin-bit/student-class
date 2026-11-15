/* Can a chapter-course address still be fetched once the session ended? */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOKEN = fs.readFileSync(path.join(ROOT, 'recon', 'scratch', 'afe-token.txt'), 'utf8').trim();
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const urls = process.argv.slice(2);
for (const url of urls) {
  for (const [name, headers] of [
    ['plain', { 'User-Agent': UA }],
    ['bearer', { 'User-Agent': UA, Authorization: `Bearer ${TOKEN}` }],
    ['bearer+ref', { 'User-Agent': UA, Authorization: `Bearer ${TOKEN}`, Referer: 'https://aifunengjiaoyu.com/' }],
  ]) {
    const res = await fetch(url, { headers });
    const text = res.ok ? await res.text() : '';
    console.log(
      `  ${res.status} len=${res.headers.get('content-length')} ${name} ${url.slice(-70)}`
    );
    if (res.ok && text) console.log('     ' + text.slice(0, 150).replace(/\s+/g, ' '));
  }
}
