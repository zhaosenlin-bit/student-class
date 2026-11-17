#!/usr/bin/env node
/*
 * Fetch the files a course asks for and the disk does not have.
 *
 * Two shapes of request were left over from the mirroring:
 *
 *   /api/program-assets/<course>/_ext/<host>/<path>
 *       a file from a public CDN, mirrored under the course
 *
 *   /<folder>/<file>
 *       a file from the root of the site the course came from, which
 *       the local server answers from the mirror of that site
 *
 * Anything still missing is downloaded once and kept beside the other
 * shared files, so the course works with the network turned off.
 *
 *   node tools/fetch-lq-root-assets.mjs           # only what is missing
 *   node tools/fetch-lq-root-assets.mjs --report  # only report
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CW = path.join(ROOT, 'mirror', 'leqixiang', 'courseware');
const SHARED = path.join(ROOT, 'mirror', 'leqixiang', '_shared-ext');
const REPORT_ONLY = process.argv.includes('--report');
const UA =
  'Mozilla/5.0 (Windows NT 10.9; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

/* The site the root-relative names came from. */
const ROOT_HOST = 'www.new3jcn.com';
/* The folders a root-relative name may point into. */
const ROOT_FOLDERS = new Set([
  'jsm',
  'js',
  'Phyc140',
  'Phyc240',
  'Simulation',
  'pictures',
  'models',
  'textures',
  'video',
  'Audio',
  'mp3',
  'libs',
  'ParticlesLibs',
  'Physijs',
  'Cloth',
  'quantum-mechanics',
  'thermodynamics',
  'electricity-magnetism',
  'mechanics',
  'periodic_table',
  'build',
  'fonts',
  'css',
  'images',
]);

const isAssetName = (p) =>
  /\.(?:js|mjs|css|json|html?|png|jpe?g|gif|svg|webp|ico|mp3|mp4|webm|wav|ogg|ttf|woff2?|eot|glb|gltf|bin|mtl|obj|fbx|ply|dat|txt|md|pdf|glsl|frag|vert|csv|map)(\?.*)?$/i.test(
    p
  );

const decode = (p) => {
  try {
    return decodeURIComponent(p);
  } catch {
    return p;
  }
};

/* ------------------------------------------------------------ what is wanted */

const wanted = new Map(); // host/path -> { host, file, courses:Set, kind }
const note = (host, file, id, kind) => {
  file = decode(file).replace(/^\/+/, '');
  if (!file || file.endsWith('/')) return;
  if (!isAssetName(file)) return;
  const key = host + '/' + file;
  const cur = wanted.get(key) || { host, file, courses: new Set(), kind };
  cur.courses.add(id);
  cur.kind = kind;
  wanted.set(key, cur);
};

for (const name of fs.readdirSync(CW)) {
  if (!name.endsWith('.html')) continue;
  const id = name.replace(/\.html$/, '');
  const text = fs.readFileSync(path.join(CW, name), 'utf8');

  /* the shape the server rewrites a CDN address into */
  for (const m of text.matchAll(/\/api\/program-assets\/[A-Za-z0-9_-]+\/_ext\/([A-Za-z0-9.-]+)\/([^"'`)\s<>]+)/g)) {
    note(m[1], m[2], id, 'ext');
  }
  /* a name at the root of the site the course came from */
  for (const m of text.matchAll(/(?:src|href|from|url)\s*[=:]\s*["'`]\/(?!api\/|courseware\/|_\/)([^"'`)\s<>]+)["'`]/g)) {
    const p = m[1];
    const folder = p.split('/')[0];
    if (!ROOT_FOLDERS.has(folder)) continue;
    note(ROOT_HOST, p, id, 'root');
  }
  /* an import that walks up one folder from the page */
  for (const m of text.matchAll(/from\s*["'`](\.\.\/[^"'`\s<>]+)["'`]/g)) {
    const p = m[1].replace(/^\.\.\//, '');
    const folder = p.split('/')[0];
    if (!ROOT_FOLDERS.has(folder)) continue;
    note(ROOT_HOST, p, id, 'rel');
  }
}

/* ------------------------------------------------------------- what is there */

const have = (host, file) => {
  const shared = path.join(SHARED, host, ...file.split('/'));
  if (fs.existsSync(shared) && fs.statSync(shared).isFile()) return true;
  for (const id of wanted.get(host + '/' + file)?.courses || []) {
    const own = path.join(CW, `${id}.assets`, '_ext', host, ...file.split('/'));
    if (fs.existsSync(own) && fs.statSync(own).isFile()) return true;
  }
  return false;
};

const missing = [];
for (const [key, w] of wanted) {
  if (have(w.host, w.file)) continue;
  missing.push(w);
}

console.log(`课程引用了 ${wanted.size} 个外部文件，其中 ${missing.length} 个本地没有`);
if (!missing.length) process.exit(0);

/* --------------------------------------------------------------- download */

const fetchWith = async (url, tries = 2) => {
  for (let i = 0; i < tries; i++) {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 45000);
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: '*/*' },
        signal: ctl.signal,
        redirect: 'follow',
      });
      clearTimeout(timer);
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      if (!buf.length) return null;
      return buf;
    } catch {}
  }
  return null;
};

/* Some files live under another name on the CDN that mirrors them. */
const mirrors = (host, file) => {
  const list = [`https://${host}/${file}`];
  if (host === 'unpkg.com') list.push(`https://cdn.jsdelivr.net/${file}`);
  if (host === 'cdn.jsdelivr.net') list.push(`https://unpkg.com/${file}`);
  if (host === 'threejs.org' && file.startsWith('examples/')) {
    list.push(`https://raw.githubusercontent.com/mrdoob/three.js/master/${file}`);
    list.push(`https://cdn.jsdelivr.net/gh/mrdoob/three.js@master/${file}`);
  }
  if (host === ROOT_HOST) list.push(`https://new3jcn.com/${file}`);
  return [...new Set(list)];
};

let got = 0;
const failed = [];
for (const w of missing) {
  const target = path.join(SHARED, w.host, ...w.file.split('/'));
  let buf = null;
  for (const url of mirrors(w.host, w.file)) {
    buf = await fetchWith(url);
    if (buf) break;
  }
  if (!buf) {
    failed.push(`${w.host}/${w.file}`);
    continue;
  }
  if (!REPORT_ONLY) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, buf);
  }
  got++;
  if (got % 20 === 0) console.log(`  已补齐 ${got}/${missing.length}`);
}

console.log(`\n补齐 ${got} 个文件${REPORT_ONLY ? '（只报告，未写入）' : ''}`);
if (failed.length) {
  console.log(`\n仍然缺少 ${failed.length} 个：`);
  for (const f of failed.slice(0, 40)) console.log('  ', f);
}
fs.writeFileSync(
  path.join(ROOT, 'recon', 'scratch', 'fetch-lq-root-assets.json'),
  JSON.stringify(
    { at: new Date().toISOString(), wanted: wanted.size, missing: missing.length, got, failed },
    null,
    1
  )
);
