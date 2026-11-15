/* Follow the launch URL with a cookie jar and decode what it carries. */
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

const url = new URL(launch.launchUrl);
const param = url.searchParams.get('launch');
console.log('launch payload:', Buffer.from(param, 'base64').toString('utf8'));

const jar = new Map();
const cookieHeader = () =>
  [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
const store = (res) => {
  for (const c of res.headers.getSetCookie?.() || []) {
    const [pair] = c.split(';');
    const idx = pair.indexOf('=');
    jar.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
  }
};

let target = launch.launchUrl;
for (let hop = 0; hop < 6; hop++) {
  const res = await fetch(target, {
    headers: { 'User-Agent': UA, ...(jar.size ? { Cookie: cookieHeader() } : {}) },
    redirect: 'manual',
  });
  store(res);
  const text = await res.text();
  console.log(`hop${hop} ${res.status} len=${text.length} ${target.slice(0, 100)}`);
  if (res.status >= 300 && res.status < 400) {
    const loc = res.headers.get('location');
    if (!loc) break;
    target = new URL(loc, target).href;
    console.log('   -> ' + target.slice(0, 140));
    continue;
  }
  console.log('   ' + text.slice(0, 300).replace(/\s+/g, ' '));
  if (res.status === 200) fs.writeFileSync(path.join(ROOT, 'recon', 'scratch', `run-${id}.html`), text);
  break;
}
console.log('cookies:', [...jar.keys()].join(', '));
