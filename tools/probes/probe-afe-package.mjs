/* What lives inside the lease folder a body points at. */
import fs from 'node:fs';

const ORIGIN = 'https://aifunengjiaoyu.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const token = fs.readFileSync('recon/scratch/afe-token.txt', 'utf8').trim();
const headers = { 'User-Agent': UA, Referer: `${ORIGIN}/`, Authorization: `Bearer ${token}` };

const id = process.argv[2] || '823';
const access = await fetch(`${ORIGIN}/api/programs/${id}/access-token`, { headers }).then((r) => r.json());
if (!access?.token) {
  console.log('no token', access);
  process.exit(1);
}
let url = `${ORIGIN}/api/program-file/${id}?token=${encodeURIComponent(access.token)}`;
let html = '';
for (let hop = 0; hop < 4; hop++) {
  const res = await fetch(url, { headers });
  html = await res.text();
  const next = html.match(/window\.location\.replace\(["']([^"']+)["']\)/);
  if (!next) break;
  url = next[1].startsWith('http') ? next[1] : ORIGIN + next[1];
}
const assetRoot = html.match(/<base[^>]*href="([^"]+)"/i)?.[1];
console.log('body', html.length, 'assetRoot', assetRoot);

if (assetRoot) {
  const names = ['index.html', 'package.json', 'manifest.json', 'asset-manifest.json', 'data.json'];
  for (const name of names) {
    const target = ORIGIN + assetRoot + name;
    const res = await fetch(target, { headers });
    const text = res.ok ? await res.text() : '';
    console.log(` ${name} -> ${res.status} ${text.length}B`);
    if (res.ok && text) {
      const refs = new Set();
      for (const m of text.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)) refs.add(m[1]);
      for (const m of text.matchAll(/["'`](\.{0,2}\/[A-Za-z0-9_\-./]+\.[A-Za-z0-9]{2,5})["'`]/g)) refs.add(m[1]);
      console.log('   refs:', [...refs].slice(0, 20).join(' '));
      console.log('   head:', text.slice(0, 200).replace(/\s+/g, ' '));
    }
  }
}
