/* Which host serves the assets behind a camera-launch lease? */
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
if (!launch.launchUrl) {
  console.log('camera-launch failed:', JSON.stringify(launch));
  process.exit(0);
}

const jar = new Map();
const cookieHeader = () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
let target = launch.launchUrl;
let html = '';
for (let hop = 0; hop < 6; hop++) {
  const res = await fetch(target, {
    headers: { 'User-Agent': UA, ...(jar.size ? { Cookie: cookieHeader() } : {}) },
    redirect: 'manual',
  });
  for (const c of res.headers.getSetCookie?.() || []) {
    const [pair] = c.split(';');
    const at = pair.indexOf('=');
    jar.set(pair.slice(0, at).trim(), pair.slice(at + 1).trim());
  }
  const text = await res.text();
  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get('location');
    if (!location) {
      console.log('redirect without location:', res.status);
      break;
    }
    target = new URL(location, target).href;
    continue;
  }
  html = text;
  break;
}

const base = html.match(/<base[^>]*href="([^"]+)"/i)?.[1];
console.log('base:', base);
const lease = base.match(/\/t\/([^/]+)\//)?.[1];
console.log('lease:', lease?.slice(0, 40));

const probe = 'assets/index-Cv5KdO45.css';
for (const host of [ORIGIN, 'https://play.aifunengjiaoyu.com']) {
  for (const withCookie of [false, true]) {
    const url = `${host}${base}${probe}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        ...(withCookie && jar.size ? { Cookie: cookieHeader() } : {}),
      },
    });
    console.log(`  ${host} cookie=${withCookie} -> ${res.status} len=${res.headers.get('content-length')}`);
  }
}

/* List the real references the document makes. */
const refs = new Set();
for (const m of html.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)) refs.add(m[1]);
for (const m of html.matchAll(/["'`]([^"'`]*\.(?:js|css|json|glb|png|jpg|webp|svg|mp3|woff2?))["'`]/gi)) refs.add(m[1]);
console.log('refs:');
[...refs].slice(0, 25).forEach((r) => console.log('  ', r));
