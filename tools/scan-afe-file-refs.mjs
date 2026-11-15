/* Every image-like name a body mentions, however it is spelled. */
import fs from 'node:fs';
import path from 'node:path';

const CW = 'mirror/aifunengjiaoyu/courseware';
const id = process.argv[2] || '180';
const file = path.join(CW, `${id}.html`);
const html = fs.readFileSync(file, 'utf8');

const names = new Set();
for (const m of html.matchAll(/[A-Za-z0-9_./-]*\.(?:png|jpe?g|webp|gif|svg|mp3|mp4|wav|ogg|json|glb|gltf)/gi)) {
  names.add(m[0]);
}
console.log(`${id}: ${names.size} file names`);
for (const n of [...names].slice(0, 40)) {
  const i = html.indexOf(n);
  console.log(' ', JSON.stringify(html.slice(Math.max(0, i - 60), i + n.length + 10).replace(/\s+/g, ' ')));
}
