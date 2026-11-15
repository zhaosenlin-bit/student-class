#!/usr/bin/env node
/*
 * List the media a chapter course still needs.
 *
 * The documents name their pictures under the platform's own asset
 * address.  This compares those names with the files that are on disk and
 * reports what is missing, so the gap can be measured before anything is
 * fetched.
 *
 *   node tools/check-chapter-media.mjs 842 1016 1360
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CW = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'courseware');
const ids = process.argv.slice(2).map(Number).filter(Boolean);

const FILE_EXT = /\.(png|jpe?g|gif|svg|webp|avif|mp3|mp4|wav|ogg|m4a|glb|gltf|json|js|mjs|css|wasm|bin|woff2?|ttf)$/i;

function refsOf(html) {
  const out = new Set();
  const add = (raw) => {
    if (!raw) return;
    const ref = raw.split('?')[0].split('#')[0];
    if (!ref || /^(https?:|data:|\/\/)/i.test(ref)) return;
    if (!FILE_EXT.test(ref)) return;
    out.add(ref);
  };
  for (const m of html.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)) add(m[1]);
  for (const m of html.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) add(m[1]);
  for (const m of html.matchAll(/["'`]([^"'`\s]+\.(?:png|jpe?g|gif|svg|webp|mp3|mp4|wav|ogg|glb|json|js|mjs|css|wasm))["'`]/gi))
    add(m[1]);
  return out;
}

function candidates(ref, programId) {
  const out = [];
  const marker = `/api/program-assets/${programId}/`;
  let rel = ref;
  const at = ref.indexOf(marker);
  if (at >= 0) rel = ref.slice(at + marker.length);
  else if (ref.startsWith('./')) rel = ref.slice(2);
  else if (ref.startsWith('/')) rel = ref.slice(1);
  out.push(rel, rel.replace(/^assets\//, ''), path.posix.basename(rel));
  return [...new Set(out)];
}

for (const id of ids) {
  const outDir = path.join(CW, `${id}.assets`);
  if (!fs.existsSync(outDir)) {
    console.log(`${id}: 没有本地目录`);
    continue;
  }
  const have = new Set();
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else have.add(path.relative(outDir, p).replace(/\\/g, '/'));
    }
  };
  walk(outDir);

  const wanted = new Set();
  for (const name of fs.readdirSync(outDir)) {
    if (!name.endsWith('.html')) continue;
    for (const ref of refsOf(fs.readFileSync(path.join(outDir, name), 'utf8'))) wanted.add(ref);
  }
  const missing = new Map();
  for (const ref of wanted) {
    const list = candidates(ref, id);
    if (list.some((c) => have.has(c))) continue;
    if (!missing.has(list[0])) missing.set(list[0], list);
  }
  console.log(`${id}: 引用 ${wanted.size} 个, 缺 ${missing.size} 个`);
  for (const key of [...missing.keys()].slice(0, Number(process.env.SHOW || 8))) {
    console.log(`   - ${key}`);
  }
}
