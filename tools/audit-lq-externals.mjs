/* Go through every mirrored course body and list the outside files it asks
   for.  Anything the local server cannot answer is a broken course. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CW = path.join(ROOT, 'mirror', 'leqixiang', 'courseware');

const FILE_EXT =
  /\.(?:js|mjs|css|png|jpe?g|gif|svg|webp|avif|glb|gltf|json|txt|mp3|mp4|wav|ogg|m4a|woff2?|ttf|otf|eot|wasm|bin|data)(?:\?|$)/i;

const bodies = fs
  .readdirSync(CW)
  .filter((n) => n.endsWith('.html') && !n.endsWith('.partial.html'));

const hosts = new Map();
const problems = [];

for (const name of bodies) {
  const text = fs.readFileSync(path.join(CW, name), 'utf8');
  const urls = new Set();
  for (const m of text.matchAll(/https?:\/\/[^"'`)\s<>]+/g)) urls.add(m[0]);
  /* Every local path the body names, however it is written. */
  for (const m of text.matchAll(/\/api\/program-assets\/[A-Za-z0-9_\-]+(?:\/[A-Za-z0-9_\-.%~@+]*)*/g))
    urls.add(m[0]);

  const id = name.replace(/\.html$/, '');
  const assets = path.join(CW, `${id}.assets`);
  const missing = [];

  for (const raw of urls) {
    const u = raw.replace(/[?#].*$/, '');

    if (u.startsWith('/api/program-assets/')) {
      const rest = u.slice('/api/program-assets/'.length);
      const slash = rest.indexOf('/');
      if (slash < 0) continue;
      let tail = rest.slice(slash + 1);
      /* /t/<lease>/… is the lease prefix the server already understands. */
      if (tail.startsWith('t/')) {
        const after = tail.slice(2);
        const cut = after.indexOf('/');
        tail = cut < 0 ? '' : after.slice(cut + 1);
      }
      const rel = tail.startsWith('_ext/') ? tail.slice('_ext/'.length) : tail;
      /* A prefix rule such as "three/addons/" only needs its folder. */
      if (u.endsWith('/')) {
        if (![path.join(assets, '_ext', rel), path.join(assets, rel)].some((p) => fs.existsSync(p)))
          missing.push(u);
        continue;
      }
      const hit = [
        path.join(assets, '_ext', rel),
        path.join(assets, rel),
      ].some((p) => fs.existsSync(p));
      if (!hit) missing.push(u);
      continue;
    }

    let parsed;
    try {
      parsed = new URL(u);
    } catch {
      continue;
    }
    const host = parsed.host;
    hosts.set(host, (hosts.get(host) || 0) + 1);
    const local = path.join(assets, '_ext', host, u.slice(host.length + 8));
    if (fs.existsSync(local)) continue;
    /* A page link is not a file the course needs. */
    const last = u.slice(u.lastIndexOf('/') + 1);
    if (!last.includes('.') && !last.includes('+esm')) continue;
    missing.push(u);
  }

  if (missing.length) problems.push({ id, missing: [...new Set(missing)] });
}

console.log('bodies:', bodies.length);
console.log('\nexternal hosts:');
for (const [h, n] of [...hosts].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${h}`);
console.log(`\nbodies with missing files: ${problems.length}`);
for (const p of problems) {
  console.log(`\n${p.id}  (${p.missing.length})`);
  for (const m of p.missing.slice(0, 12)) console.log('   ', m);
}
