/* Are the site-root courseware assets public? */
import fs from 'node:fs';

const ORIGIN = 'https://aifunengjiaoyu.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const token = fs.readFileSync('recon/scratch/afe-token.txt', 'utf8').trim();

const map = JSON.parse(fs.readFileSync('recon/scratch/afe-root-refs.json', 'utf8'));
const names = new Set();
for (const [, refs] of map) {
  for (const r of refs) {
    if (r.startsWith('/courseware/')) names.add(r.replace('/courseware/', ''));
  }
}
console.log('root asset names:', names.size);

for (const name of [...names].slice(0, 20)) {
  const url = `${ORIGIN}/courseware/${name}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Referer: `${ORIGIN}/`, Authorization: `Bearer ${token}` },
  });
  const buf = res.ok ? Buffer.from(await res.arrayBuffer()) : Buffer.alloc(0);
  console.log(` ${name} -> ${res.status} ${buf.length}B ${res.headers.get('content-type') || ''}`);
}
