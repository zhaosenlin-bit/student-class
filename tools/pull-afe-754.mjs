/*
 * The 长征 overview is a bootstrap that carries the real page as a string.
 * That page loads a set of files relative to the lease folder, and the two
 * free chapters load their own scene files the same way. This pulls every
 * file the document tree asks for.
 */
import fs from 'node:fs';
import path from 'node:path';

const ORIGIN = 'https://aifunengjiaoyu.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

/* Assets live in the 图灵智赋 mirror: it is the single source of truth the
   乐启享 builder copies from. Pulling straight into the merged folder would
   be wiped by the next build. */
const DIR = 'mirror/aifunengjiaoyu/courseware';
const ID = '754';
const ASSETS = path.join(DIR, `${ID}.assets`);

const token = fs.readFileSync('recon/scratch/afe-token.txt', 'utf8').trim();
const body = fs.readFileSync(path.join(DIR, `${ID}.html`), 'utf8');
const lease = body.match(/assetRoot":"([^"]+)"/)?.[1] || '';
if (!lease) throw new Error('no lease in the body');

const headers = {
  'User-Agent': UA,
  Referer: `${ORIGIN}/`,
  Authorization: `Bearer ${token}`,
};

const seen = new Set();
const queue = [
  'index.html',
  'courseware/website-bridge.js',
  'courseware/runtime.js',
  'courseware/classroom.css',
  'courseware/classroom.js',
  'shared-audio.css',
  'shared-audio.js',
  'shared-ui/unified-topbar.css',
  'shared-ui/unified-topbar.js',
  'hide-map-overlay-button.js',
  'map-stability.js',
  'map-node-position-fix.js',
  'map-app-loader.js',
  'assets/index-Cv5KdO45.css',
  'map-stability.css',
  'map-node-position-fix.css',
  'scenes/ruijin/index.html',
  'scenes/yudu/index.html',
  'scenes/xiangjiang/index.html',
  'scenes/zunyi/index.html',
  'scenes/chishui/index.html',
  'scenes/jinshajiang/index.html',
  'scenes/luding/index.html',
  'scenes/snowgrass/index.html',
  'scenes/final/index.html',
];

const relRx = /(?:src|href)\s*=\s*["']([^"':#]+)["']/g;
const escRx = /\\u003c(script|link)[^>]*?(?:src|href)=\\"([^\\"]+)\\"/g;
/* Bundlers point at their chunks through import.meta.url. */
const modRx = /new URL\(\s*["']([^"']+)["']\s*,\s*import\.meta\.url\s*\)/g;
const impRx = /(?:^|[^.\w])import\s*\(\s*["']([^"']+)["']\s*\)|from\s*["']([^"']+)["']|import\s+["']([^"']+)["']/g;
const ok = [];
const failed = [];

while (queue.length) {
  const rel = queue.shift();
  if (seen.has(rel)) continue;
  seen.add(rel);
  const out = path.join(ASSETS, rel);
  if (fs.existsSync(out) && fs.statSync(out).size > 0) {
    ok.push(rel);
  } else {
    const url = ORIGIN + lease + rel;
    try {
      const r = await fetch(url, { headers });
      if (!r.ok) throw new Error('status ' + r.status);
      const buf = Buffer.from(await r.arrayBuffer());
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, buf);
      ok.push(rel);
      console.log('ok  ', String(buf.length).padStart(9), rel);
    } catch (e) {
      failed.push(`${rel} (${e.message})`);
      console.log('FAIL', rel, e.message);
    }
  }
  /* Follow the references the file itself carries. A reference is relative
     to the folder the referring file lives in. */
  const file = path.join(ASSETS, rel);
  if (!fs.existsSync(file)) continue;
  if (!/\.(html|js|css)$/i.test(rel)) continue;
  const text = fs.readFileSync(file, 'utf8');
  const refs = new Set();
  for (const m of text.matchAll(relRx)) refs.add(m[1]);
  for (const m of text.matchAll(escRx)) refs.add(m[2]);
  for (const m of text.matchAll(modRx)) refs.add(m[1]);
  for (const m of text.matchAll(impRx)) refs.add(m[1] || m[2] || m[3]);
  const folder = path.dirname(rel);
  for (const ref of refs) {
    if (/^[a-z]+:/i.test(ref) || ref.startsWith('/') || ref.startsWith('#') || ref.startsWith('data:')) continue;
    const clean = path
      .normalize(path.join(folder, ref.split('?')[0].split('#')[0]))
      .replace(/\\/g, '/')
      .replace(/^\.\//, '');
    if (clean.startsWith('..')) continue;
    if (!clean || seen.has(clean)) continue;
    const target = path.join(ASSETS, clean);
    if (!fs.existsSync(target)) queue.push(clean);
  }
  await new Promise((r) => setTimeout(r, 120));
}

console.log(`\n${ok.length} files present, ${failed.length} unavailable`);
for (const f of failed) console.log('  missing upstream:', f);
