/* Work out how a reference turns into a working asset URL. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CW = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'courseware');
const ORIGIN = 'https://aifunengjiaoyu.com';
const TOKEN = fs.readFileSync(path.join(ROOT, 'recon', 'scratch', 'afe-token.txt'), 'utf8').trim();
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const id = process.argv[2];
const html = fs.readFileSync(path.join(CW, `${id}.html`), 'utf8');
const base = html.match(/<base[^>]*href="([^"]+)"/i)[1];
const lease = base.match(/\/t\/([^/]+)\//)[1];
const host = 'https://play.aifunengjiaoyu.com';

const api = await fetch(`${ORIGIN}/api/programs/${id}/camera-launch`, {
  method: 'POST',
  headers: {
    'User-Agent': UA,
    Referer: `${ORIGIN}/`,
    Authorization: `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: '{}',
});
const launch = await api.json();
console.log('camera-launch:', launch.success ? 'ok' : launch.msg + '/' + (launch.reason || ''));

const jar = new Map();
const cookieHeader = () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
let target = launch.launchUrl;
for (let hop = 0; hop < 6 && launch.launchUrl; hop++) {
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
    target = new URL(res.headers.get('location'), target).href;
    continue;
  }
  break;
}

const candidates = [
  `${host}${base}styles/courseware.css`,
  `${host}${base}../styles/courseware.css`,
  `${host}/api/program-assets/${id}/t/${lease}/styles/courseware.css`,
  `${host}/api/program-assets/${id}/t/${lease}/package/styles/courseware.css`,
  `${host}/api/program-assets/${id}/styles/courseware.css`,
  `${host}${base}models/heart.glb`,
  `${host}/api/program-assets/${id}/t/${lease}/models/heart.glb`,
  `${host}/api/program-assets/${id}/t/${lease}/package/models/heart.glb`,
];

for (const url of candidates) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, ...(jar.size ? { Cookie: cookieHeader() } : {}) },
  });
  console.log(`  ${res.status} len=${res.headers.get('content-length')} ${url.replace(host, '').slice(0, 90)}`);
}
