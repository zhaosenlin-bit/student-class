/*
 * Fill in the outside files the mirrored course bodies still ask for.
 *
 * A course may pull a library from a public CDN.  Those addresses are
 * rewritten to /api/program-assets/<course>/_ext/<host>/<path>, so the
 * file has to sit there.  This walks every body, resolves what it wants
 * (including the bare names an import map points at), and downloads the
 * pieces that are not there yet.
 *
 *   node tools\fetch-lq-missing.mjs            only the missing ones
 *   node tools\fetch-lq-missing.mjs --all      every outside file
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CW = path.join(ROOT, 'mirror', 'leqixiang', 'courseware');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const REDOWNLOAD = process.argv.includes('--all');

/*
 * Only the hosts the local server can answer.  Anything else stays an
 * outside address in the document, and the ones that are only mentioned in
 * a comment never get asked for at run time.
 */
const RUNTIME_HOSTS = new Set(
  String(
    process.env.LQ_EXT_HOSTS ||
      [
      'cdn.jsdelivr.net',
      'unpkg.com',
      'cdnjs.cloudflare.com',
      'esm.sh',
      'cdn.tailwindcss.com',
      'storage.googleapis.com',
      'tuxiaoling-glb-2026.oss-cn-shenzhen.aliyuncs.com',
      'assets.mixkit.co',
      'www.soundhelix.com',
      'musk-online.fbcontent.cn',
      'metis-online.fbcontent.cn',
      'www.feixianglaoshi.com',
      'i.pinimg.com',
      'fonts.googleapis.com',
      'fonts.gstatic.com',
      ]
  )
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean)
);

/* ------------------------------------------------------------------ read */

const bodies = fs
  .readdirSync(CW)
  .filter((n) => n.endsWith('.html'))
  .map((name) => ({
    id: name.replace(/\.html$/, ''),
    text: fs.readFileSync(path.join(CW, name), 'utf8'),
  }));

/* The import map turns a bare name into an address. */
const importMapOf = (text) => {
  const map = {};
  for (const m of text.matchAll(/<script[^>]*type=["']importmap["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(m[1]);
      Object.assign(map, parsed.imports || {});
    } catch {}
  }
  return map;
};

const resolveWith = (map, spec) => {
  if (!spec || /^(https?:|data:|\/|\.\/|\.\.\/|#)/.test(spec)) return null;
  const exact = map[spec];
  if (exact) return exact;
  for (const [prefix, target] of Object.entries(map)) {
    if (prefix.endsWith('/') && spec.startsWith(prefix)) {
      return target + spec.slice(prefix.length);
    }
  }
  return null;
};

const specsOf = (text) => {
  const out = new Set();
  for (const m of text.matchAll(/["'`]([A-Za-z@][^"'`\s]*?)["'`]/g)) out.add(m[1]);
  return out;
};

const urlsOf = (text) => {
  const out = new Set();
  for (const m of text.matchAll(/https?:\/\/[^"'`)\s<>]+/g)) out.add(m[0]);
  return out;
};

/* Some bodies carry the address already escaped for the markup. */
const unescape = (s) =>
  s
    .replace(/&quot;/g, '')
    .replace(/&gt;/g, '')
    .replace(/&lt;/g, '')
    .replace(/&amp;/g, '&');

/* What every course wants, and where it has to land. */
const needs = new Map(); // host+path -> Set(course id)
const wanted = new Map(); // host+path -> original url

for (const { id, text } of bodies) {
  const map = importMapOf(text);
  const candidates = new Set(urlsOf(text));
  for (const spec of specsOf(text)) {
    const resolved = resolveWith(map, spec);
    if (resolved && /^https?:/.test(resolved)) candidates.add(resolved);
  }

  for (const raw of candidates) {
    let url;
    try {
      url = new URL(unescape(raw));
    } catch {
      continue;
    }
    if (!/^https?:$/.test(url.protocol)) continue;
    if (!RUNTIME_HOSTS.has(url.host)) continue;
    /* The Tailwind play address has no path; the server knows it. */
    if (url.host === 'cdn.tailwindcss.com') continue;
    const file = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    if (!file) continue;
    /* A folder address stands for the files inside it. */
    if (file.endsWith('/')) continue;
    const key = url.host + '/' + file;
    if (!needs.has(key)) needs.set(key, new Set());
    needs.get(key).add(id);
    if (!wanted.has(key)) wanted.set(key, url.href);
  }
}

/* ------------------------------------------------------------- download */

const fetchWith = async (url, tries = 2) => {
  for (let i = 0; i < tries; i++) {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 60000);
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: '*/*' },
        signal: ctl.signal,
      });
      clearTimeout(timer);
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    } catch {}
  }
  return null;
};

/* Other places that serve the very same npm package. */
const mirrors = (url) => {
  const list = [url];
  const host = url.host;
  const p = decodeURIComponent(url.pathname);
  if (host === 'cdn.jsdelivr.net' && p.startsWith('/npm/')) {
    const rest = p.slice('/npm/'.length);
    list.push(`https://unpkg.com/${rest}`);
    if (rest.endsWith('/+esm')) {
      const pkg = rest.slice(0, -'/+esm'.length);
      list.push(`https://unpkg.com/${pkg}?module`);
    }
  }
  if (host === 'unpkg.com') {
    list.push(`https://cdn.jsdelivr.net${url.pathname}`);
  }
  return [...new Set(list)];
};

const store = (id, host, file, buffer) => {
  const target = path.join(CW, `${id}.assets`, '_ext', host, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, buffer);
};

let done = 0;
let skipped = 0;
const failed = [];

for (const [key, ids] of needs) {
  const slash = key.indexOf('/');
  const host = key.slice(0, slash);
  const file = key.slice(slash + 1);

  const allPresent = [...ids].every((id) =>
    fs.existsSync(path.join(CW, `${id}.assets`, '_ext', host, file))
  );
  if (allPresent && !REDOWNLOAD) {
    skipped++;
    continue;
  }

  const url = new URL(wanted.get(key));
  let buffer = null;
  for (const candidate of mirrors(url)) {
    buffer = await fetchWith(candidate);
    if (buffer) break;
  }
  /* Some builds ship the file without its ".min" twin. */
  if (!buffer && /\.min\.js$/.test(file)) {
    const plain = new URL(url.href.replace(/\.min\.js$/, '.js'));
    for (const candidate of mirrors(plain)) {
      buffer = await fetchWith(candidate);
      if (buffer) break;
    }
  }

  if (!buffer) {
    failed.push({ key, ids: [...ids] });
    continue;
  }
  for (const id of ids) store(id, host, file, buffer);
  done++;
  console.log(`${String(buffer.length).padStart(9)}  ${key}`);
}

console.log(`\nstored ${done}, already present ${skipped}, failed ${failed.length}`);
for (const f of failed) console.log('  FAILED', f.key, '->', f.ids.join(', '));

/* The MediaPipe package keeps its engine next to the bundle. */
const MEDIAPIPE_WASM = [
  'vision_wasm_internal.js',
  'vision_wasm_internal.wasm',
  'vision_wasm_nosimd_internal.js',
  'vision_wasm_nosimd_internal.wasm',
];

for (const [key, ids] of [...needs]) {
  const m = key.match(/^(cdn\.jsdelivr\.net)\/npm\/(@mediapipe\/tasks-vision@[^/]+)\/wasm$/);
  if (!m) continue;
  for (const file of MEDIAPIPE_WASM) {
    const fileKey = `${m[1]}/${m[2]}/wasm/${file}`;
    const target = path.join(CW, `${[...ids][0]}.assets`, '_ext', ...fileKey.split('/'));
    if (fs.existsSync(target)) continue;
    const buffer = await fetchWith(`https://unpkg.com/${m[2]}/wasm/${file}`);
    if (!buffer) continue;
    for (const id of ids) store(id, m[1], `npm/${m[2]}/wasm/${file}`, buffer);
    console.log(`${String(buffer.length).padStart(9)}  ${fileKey}`);
  }
}
