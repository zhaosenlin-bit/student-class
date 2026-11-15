/* Absolute references inside a base-tag document: where do they land? */
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

const jar = new Map();
const cookieHeader = () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
let target = launch.launchUrl;
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
    target = new URL(res.headers.get('location'), target).href;
    continue;
  }
  break;
}

const candidates = [
  ['host-root', `${host}/models/heart.glb`],
  ['lease-root', `${host}/api/program-assets/${id}/t/${lease}/models/heart.glb`],
  ['lease-package', `${host}/api/program-assets/${id}/t/${lease}/package/models/heart.glb`],
  ['base-relative', `${host}${base}models/heart.glb`],
  ['wasm-base', `${host}${base}wasm/vision_wasm_nosimd_internal.js`],
  ['wasm-lease', `${host}/api/program-assets/${id}/t/${lease}/wasm/vision_wasm_nosimd_internal.js`],
  ['wasm-pkg', `${host}/api/program-assets/${id}/t/${lease}/package/wasm/vision_wasm_nosimd_internal.js`],
  ['host-root-wasm', `${host}/wasm/vision_wasm_nosimd_internal.js`],
];

for (const [name, url] of candidates) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, ...(jar.size ? { Cookie: cookieHeader() } : {}) },
  });
  console.log(`  ${name} -> ${res.status} len=${res.headers.get('content-length')}`);
}
