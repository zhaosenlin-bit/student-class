/* camera-launch hands out a signed launch URL on another host. Follow it. */
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
  const launch = await (
    await fetch(`${ORIGIN}/api/programs/${id}/camera-launch`, { method: 'POST', headers, body: '{}' })
  ).json();
  if (!launch.launchUrl) {
    console.log('  no launch:', JSON.stringify(launch).slice(0, 200));
    continue;
  }
  const res = await fetch(launch.launchUrl, { headers: { 'User-Agent': UA, Referer: ORIGIN + '/' } });
  const text = await res.text();
  console.log(`  ${res.status} len=${text.length} ${launch.launchUrl.slice(0, 110)}`);
  console.log('  ' + text.slice(0, 400).replace(/\s+/g, ' '));
}
