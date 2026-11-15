/* Pull the cover and detail images of every programme into the mirrored
   /prod/uploads tree, so the catalogue never reaches for the CDN. */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'mirror/aifunengjiaoyu';
const PUBLIC = path.join(ROOT, 'public');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const programs = JSON.parse(fs.readFileSync(path.join(ROOT, 'programs-all.json'), 'utf8'));

const wanted = new Set();
for (const p of programs) {
  if (p.cover_url) wanted.add(p.cover_url);
  if (p.desc_images) {
    try {
      for (const u of JSON.parse(p.desc_images)) if (u) wanted.add(u);
    } catch {}
  }
  if (p.admin_note_images) {
    try {
      for (const u of JSON.parse(p.admin_note_images)) if (u) wanted.add(u);
    } catch {}
  }
}

console.log('images wanted:', wanted.size);
let ok = 0;
let missed = 0;
for (const url of wanted) {
  const rel = decodeURIComponent(url.replace('https://static.aifunengjiaoyu.com/', ''));
  const out = path.join(PUBLIC, rel);
  if (fs.existsSync(out) && fs.statSync(out).size > 0) {
    ok++;
    continue;
  }
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Referer: 'https://aifunengjiaoyu.com/' } });
    if (!res.ok) throw new Error('status ' + res.status);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, buf);
    ok++;
  } catch (e) {
    missed++;
    if (missed < 10) console.log(' miss', rel, e.message);
  }
}
console.log(`mirrored ${ok}, missing ${missed}`);
