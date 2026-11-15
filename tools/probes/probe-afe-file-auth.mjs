/* How does the course file check its reader? Try the shapes a sandboxed
   frame produces. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://aifunengjiaoyu.com';
const TOKEN = fs.readFileSync(path.join(ROOT, 'recon', 'scratch', 'afe-token.txt'), 'utf8').trim();
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const url = process.argv[2];
const sessionId = process.argv[3];

const variants = [
  ['bearer + sec-fetch', {
    'User-Agent': UA,
    Authorization: `Bearer ${TOKEN}`,
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Dest': 'empty',
  }],
  ['bearer + sec-fetch-dest-document', {
    'User-Agent': UA,
    Authorization: `Bearer ${TOKEN}`,
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Dest': 'document',
  }],
  ['bearer + sec-fetch-site-same-origin-document', {
    'User-Agent': UA,
    Authorization: `Bearer ${TOKEN}`,
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Dest': 'iframe',
    'Sec-Fetch-User': '?1',
  }],
  ['bearer + accept-html', {
    'User-Agent': UA,
    Authorization: `Bearer ${TOKEN}`,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Dest': 'iframe',
  }],
  ['bearer + referer-play', {
    'User-Agent': UA,
    Authorization: `Bearer ${TOKEN}`,
    Referer: `${ORIGIN}/play/1016`,
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Dest': 'iframe',
  }],
  ['bearer + x-session', {
    'User-Agent': UA,
    Authorization: `Bearer ${TOKEN}`,
    'X-Reviewed-Session': sessionId,
  }],
];

for (const [name, headers] of variants) {
  const res = await fetch(url, { headers });
  const text = res.ok ? await res.text() : '';
  console.log(`  ${res.status} len=${text.length} ${name}`);
  if (res.ok) console.log('     ' + text.slice(0, 140).replace(/\s+/g, ' '));
}
