/* List the references the camera crawler could not resolve. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CW = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'courseware');
const ASSET_HOST = 'https://play.aifunengjiaoyu.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const id = process.argv[2];
const html = fs.readFileSync(path.join(CW, `${id}.html`), 'utf8');
const assetRoot = html.match(/<base[^>]*href="([^"]+)"/i)?.[1];
const lease = assetRoot?.match(/\/t\/([^/]+)\//)?.[1];
const dir = path.join(CW, `${id}.assets`);

const have = new Set();
const walk = (d) => {
  if (!fs.existsSync(d)) return;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.isDirectory()) walk(path.join(d, e.name));
    else have.add(path.relative(dir, path.join(d, e.name)).split(path.sep).join('/'));
  }
};
walk(dir);

const refs = new Set();
for (const m of html.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)) refs.add(m[1]);
for (const m of html.matchAll(/["'`](\.{0,2}\/[A-Za-z0-9_\-./]+\.[A-Za-z0-9]{2,5})["'`]/g)) refs.add(m[1]);
for (const m of html.matchAll(/["'`](\/[A-Za-z0-9_\-./]+\.[A-Za-z0-9]{2,5})["'`]/g)) refs.add(m[1]);
for (const m of html.matchAll(
  /["'`]([A-Za-z0-9_\-]+\.(?:png|jpe?g|gif|svg|webp|avif|glb|gltf|mp3|mp4|wav|ogg|m4a|json|js|mjs|css|wasm|bin|woff2?|ttf))["'`]/g
))
  refs.add(m[1]);

console.log('have:', have.size);
for (const r of refs) {
  if (/^https?:/i.test(r)) {
    console.log(`  CDN  ${r}`);
    continue;
  }
  const clean = r.replace(/^\.\//, '').replace(/^\/+/, '');
  if (have.has(clean)) continue;
  console.log(`  MISS ${clean}`);
  for (const url of [
    `${ASSET_HOST}${assetRoot}${clean}`,
    `${ASSET_HOST}/api/program-assets/${id}/t/${lease}/${clean}`,
    `${ASSET_HOST}/api/program-assets/${id}/t/${lease}/package/${clean}`,
  ]) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    console.log(`       ${res.status} ${url.replace(ASSET_HOST, '').slice(-60)}`);
  }
}
