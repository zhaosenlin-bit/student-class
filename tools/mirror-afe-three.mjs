#!/usr/bin/env node
/*
 * Mirror the two runtime pieces the 图小灵 3D viewer still reaches for.
 *
 * 1. /tuxiaoling/runtime/viewer-v1.mjs — served by the site itself and
    imported by the model preview frame, but not part of the shell bundle.
 * 2. three.js r160 — the preview frame builds its own import map that
    points at unpkg.com, so a offline copy would have to fetch the engine
    from the internet.  The engine and the two add-ons it pulls in are
    public, so they are mirrored under /tuxiaoling/vendor/three/.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AFE = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'assets');
const ORIGIN = 'https://aifunengjiaoyu.com';
const UNPKG = 'https://unpkg.com/three@0.160.0/';
const HEADERS = { 'User-Agent': 'Mozilla/5.0', Referer: `${ORIGIN}/` };

async function save(url, dest) {
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
    console.log(`  keep  ${path.relative(ROOT, dest)}`);
    return true;
  }
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    console.log(`  MISS ${res.status} ${url}`);
    return false;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
  console.log(`  save  ${path.relative(ROOT, dest)} (${(buf.length / 1024).toFixed(1)} KB)`);
  return true;
}

console.log('runtime viewer:');
await save(`${ORIGIN}/tuxiaoling/runtime/viewer-v1.mjs`, path.join(AFE, 'tuxiaoling', 'runtime', 'viewer-v1.mjs'));

console.log('three.js r160:');
const VENDOR = path.join(AFE, 'tuxiaoling', 'vendor', 'three');
const files = ['build/three.module.js', 'examples/jsm/loaders/GLTFLoader.js', 'examples/jsm/controls/OrbitControls.js'];
for (const file of files) {
  await save(UNPKG + file, path.join(VENDOR, file));
}

/* Follow any further bare imports the add-ons pull in. */
const queue = [...files];
const seen = new Set(files);
while (queue.length) {
  const file = queue.shift();
  const local = path.join(VENDOR, file);
  if (!fs.existsSync(local)) continue;
  const text = fs.readFileSync(local, 'utf8');
  for (const m of text.matchAll(/from\s+['"](\.\.?\/[^'"]+)['"]/g)) {
    const rel = path.posix.normalize(path.posix.join(path.posix.dirname(file), m[1]));
    if (seen.has(rel)) continue;
    seen.add(rel);
    queue.push(rel);
    await save(UNPKG + rel, path.join(VENDOR, rel));
  }
}
console.log(`three.js files: ${seen.size}`);
