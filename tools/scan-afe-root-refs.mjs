/* Every absolute site path a pulled body points at, across all of them. */
import fs from 'node:fs';
import path from 'node:path';

const CW = 'mirror/aifunengjiaoyu/courseware';
const out = new Map();
for (const file of fs.readdirSync(CW)) {
  if (!file.endsWith('.html')) continue;
  const id = file.replace(/\.html$/, '');
  const html = fs.readFileSync(path.join(CW, file), 'utf8');
  const refs = new Set();
  for (const m of html.matchAll(/["'`](\/(?:courseware|api\/program-assets)\/[A-Za-z0-9_\-./]+)["'`]/g)) {
    refs.add(m[1]);
  }
  for (const m of html.matchAll(/["'`]([A-Za-z0-9_\-]+\.(?:png|jpg|jpeg|webp|gif|svg|mp3|mp4|json|js|css))["'`]/g)) {
    refs.add('/courseware/' + m[1]);
  }
  if (refs.size) out.set(id, [...refs]);
}
const all = new Set();
for (const refs of out.values()) for (const r of refs) all.add(r);
console.log('bodies with root refs:', out.size);
console.log('distinct root refs:', all.size);
console.log([...all].slice(0, 40).join('\n'));
fs.writeFileSync('recon/scratch/afe-root-refs.json', JSON.stringify([...out], null, 1));
