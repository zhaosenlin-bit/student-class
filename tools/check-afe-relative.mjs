import fs from 'node:fs';

const dir = 'mirror/leqixiang/courseware';
const files = fs.readdirSync(dir).filter((f) => f.startsWith('afe-') && f.endsWith('.html'));

/* Relative references in a document are resolved against its base. */
const relRx = /(?:src|href)\s*=\s*["']([^"':]+)["']/g;

for (const f of files) {
  const id = f.replace('.html', '');
  const t = fs.readFileSync(`${dir}/${f}`, 'utf8');
  const rel = new Set();
  for (const m of t.matchAll(relRx)) {
    const u = m[1];
    if (u.startsWith('/') || u.startsWith('#') || u.startsWith('data:') || /^[a-z]+:/i.test(u)) continue;
    rel.add(u.split('?')[0].split('#')[0]);
  }
  /* The 3D overview lives inside a JSON string in the bootstrap, so its
     references are escaped there too. */
  for (const m of t.matchAll(/\\u003c(script|link)[^>]*?(?:src|href)=\\"([^\\"]+)\\"/g)) {
    if (!m[2].startsWith('/')) rel.add(m[2].split('?')[0].split('#')[0]);
  }

  const missing = [];
  for (const u of rel) {
    const p = `${dir}/${id}.assets/${u}`;
    if (!fs.existsSync(p)) missing.push(u);
  }
  console.log(`\n== ${id}: ${rel.size} relative refs, missing ${missing.length}`);
  for (const u of missing.slice(0, 30)) console.log('   !', u);
}
