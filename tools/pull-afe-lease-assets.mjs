/*
 * A saved body carries a signed lease in its base tag. That lease is what
 * the assets are filed under, so the assets can be fetched again later
 * without spending another trial.
 */
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

const id = Number(process.argv[2]);
const html = fs.readFileSync(path.join(CW, `${id}.html`), 'utf8');
const base = html.match(/<base[^>]*href="([^"]+)"/i)[1];
const lease = base.match(/\/t\/([^/]+)\//)[1];
const leasePayload = Buffer.from(lease.split('.')[0], 'base64').toString('utf8');
const pkg = base.endsWith('/package/') ? 'package/' : '';
const exp = leasePayload.match(/"exp":(\d+)/)?.[1];
console.log('lease expires at', exp ? new Date(Number(exp) * 1000).toISOString() : 'unknown');

const refs = new Set();
for (const m of html.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)) refs.add(m[1]);
for (const m of html.matchAll(/["'`](\.{0,2}\/[A-Za-z0-9_\-./]+\.[A-Za-z0-9]{2,5})["'`]/g)) refs.add(m[1]);
for (const m of html.matchAll(/["'`](\/[A-Za-z0-9_\-./]+\.[A-Za-z0-9]{2,5})["'`]/g)) refs.add(m[1]);

const local = [...refs]
  .filter((r) => !/^https?:|^\/\/|^\/|data:/.test(r))
  .map((r) => r.replace(/^\.\//, '').replace(/^\//, ''));
console.log('local refs:', local.length);

const hosts = [ORIGIN, 'https://play.aifunengjiaoyu.com'];
const prefixes = [
  (r) => base + r,
  (r) => `/api/program-assets/${id}/t/${lease}/` + pkg + r,
  (r) => `/api/program-assets/${id}/` + r,
];

for (const rel of local.slice(0, 4)) {
  console.log(`\n-- ${rel}`);
  for (const host of hosts) {
    for (const [i, prefix] of prefixes.entries()) {
      const url = host + prefix(rel);
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Referer: ORIGIN + '/', Authorization: `Bearer ${TOKEN}` },
      });
      console.log(`  ${res.status} len=${res.headers.get('content-length')} ${host.slice(8, 20)} p${i}`);
    }
  }
}
