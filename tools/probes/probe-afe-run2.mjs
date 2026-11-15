/* The run host may still want the account header. Try a few combinations. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://aifunengjiaoyu.com';
const TOKEN = fs.readFileSync(path.join(ROOT, 'recon', 'scratch', 'afe-token.txt'), 'utf8').trim();
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const id = Number(process.argv[2]);
const launch = await (
  await fetch(`${ORIGIN}/api/programs/${id}/camera-launch`, {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      Referer: `${ORIGIN}/`,
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  })
).json();
console.log('launch:', launch.launchUrl ? launch.launchUrl.slice(0, 120) : JSON.stringify(launch));
if (!launch.launchUrl) process.exit(0);

const variants = [
  ['bare', { 'User-Agent': UA }],
  ['referer-site', { 'User-Agent': UA, Referer: `${ORIGIN}/play/${id}` }],
  ['bearer', { 'User-Agent': UA, Authorization: `Bearer ${TOKEN}` }],
  ['bearer+referer', { 'User-Agent': UA, Authorization: `Bearer ${TOKEN}`, Referer: `${ORIGIN}/play/${id}` }],
  [
    'bearer+origin',
    {
      'User-Agent': UA,
      Authorization: `Bearer ${TOKEN}`,
      Referer: `${ORIGIN}/play/${id}`,
      Origin: ORIGIN,
    },
  ],
];

for (const [name, headers] of variants) {
  const res = await fetch(launch.launchUrl, { headers, redirect: 'manual' });
  const text = await res.text();
  console.log(`  ${name} -> ${res.status} len=${text.length} ${text.slice(0, 120).replace(/\s+/g, ' ')}`);
  if (res.status === 200) {
    fs.writeFileSync(path.join(ROOT, 'recon', 'scratch', `run-${id}.html`), text);
    break;
  }
}
