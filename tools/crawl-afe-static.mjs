#!/usr/bin/env node
/*
 * Exhaustive static-surface crawler for 图灵智赋 (aifunengjiaoyu.com).
 *
 * The mirror was originally assembled file-by-file, which meant the site
 * could still contain public assets nobody had discovered yet: a stylesheet
 * three levels deep, an icon referenced only from a lazily imported chunk,
 * a font subset nobody opened.
 *
 * This crawler does a breadth-first walk over the *whole* reachable static
 * surface — HTML documents, ES modules (following their import graph),
 * stylesheets, fonts, images, media, 3D models — and compares what it finds
 * against what the local mirror already holds.  Anything publicly
 * reachable but missing locally is downloaded.
 *
 * It understands the reference syntaxes the site actually uses:
 *   HTML   src / href / srcset / poster / data-src / content of <link>
 *   CSS    url(...) / @import
 *   JS     import ... from 'x' / import('x') / new URL('x', import.meta.url)
 *          plus plain string literals that look like site-relative paths
 *
 * Usage:
 *   node tools/crawl-afe-static.mjs            # discover + download gaps
 *   node tools/crawl-afe-static.mjs --dry      # discover only, no writes
 *   node tools/crawl-afe-static.mjs --seed /extra/path   # add a seed
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AFE = path.join(ROOT, 'mirror', 'aifunengjiaoyu');
const ORIGIN = 'https://aifunengjiaoyu.com';
const CDN = 'https://static.aifunengjiaoyu.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const seeds = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--seed') seeds.push(args[i + 1]);
}

/* ------------------------------------------------------------------ */
/* fetch helpers                                                      */
/* ------------------------------------------------------------------ */

const seen = new Map(); // url -> { status, type, size, local }
const queue = [];
const queued = new Set();

function enqueue(url, note = '') {
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) return;
  if (url.startsWith('#')) return;
  let abs;
  try {
    abs = new URL(url, ORIGIN + '/').href;
  } catch {
    return;
  }
  if (!abs.startsWith(ORIGIN) && !abs.startsWith(CDN)) return;
  abs = abs.split('#')[0];
  if (queued.has(abs)) return;
  queued.add(abs);
  queue.push({ url: abs, note });
}

async function fetchOne(url, attempts = 3) {
  let last;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Referer: `${ORIGIN}/` },
        redirect: 'follow',
      });
      const type = res.headers.get('content-type') || '';
      if (!res.ok) return { status: res.status, type, body: null };
      return { status: res.status, type, body: Buffer.from(await res.arrayBuffer()) };
    } catch (error) {
      last = error;
      await new Promise((r) => setTimeout(r, 700 * (i + 1)));
    }
  }
  throw last;
}

/* ------------------------------------------------------------------ */
/* reference extraction                                               */
/* ------------------------------------------------------------------ */

const EXT_RE =
  /\.(?:js|mjs|css|json|html?|png|jpe?g|webp|gif|svg|ico|woff2?|ttf|otf|eot|mp4|webm|mov|m3u8|mp3|wav|glb|gltf|bin|glsl|wasm|txt|xml|pdf|map|zip)$/i;

const SKIP_HOSTS = new Set([
  'unpkg.com',
  'cdn.jsdelivr.net',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'www.googletagmanager.com',
  'hm.baidu.com',
  'cnzz.com',
]);

function looksLikePath(s) {
  if (!s || s.length > 300) return false;
  if (/^(https?:)?\/\//i.test(s)) return false;
  if (s.startsWith('#') || s.startsWith('data:')) return false;
  if (s.startsWith('/')) return true;
  if (!/\//.test(s)) return EXT_RE.test(s);
  return EXT_RE.test(s.split('?')[0]);
}

function extractFromHtml(text) {
  const out = [];
  const attrs =
    /(?:src|href|poster|data-src|data-href|data-original)\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = attrs.exec(text))) out.push(m[1]);
  const srcset = /srcset\s*=\s*["']([^"']+)["']/gi;
  while ((m = srcset.exec(text))) {
    for (const part of m[1].split(',')) {
      const u = part.trim().split(/\s+/)[0];
      if (u) out.push(u);
    }
  }
  const meta = /<meta[^>]+content\s*=\s*["']([^"']+\.(?:png|jpe?g|webp|svg|ico))["']/gi;
  while ((m = meta.exec(text))) out.push(m[1]);
  return out;
}

function extractFromCss(text) {
  const out = [];
  const urlRe = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;
  let m;
  while ((m = urlRe.exec(text))) out.push(m[1]);
  const impRe = /@import\s+(?:url\()?\s*["']([^"')]+)["']/gi;
  while ((m = impRe.exec(text))) out.push(m[1]);
  return out;
}

function extractFromJs(text) {
  const out = [];
  const re =
    /(?:from\s*|import\s*\(\s*|import\s+|require\s*\(\s*)["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(text))) out.push(m[1]);
  /* import.meta.url relative assets */
  const metaRe = /new\s+URL\(\s*["']([^"']+)["']\s*,\s*import\.meta\.url\s*\)/g;
  while ((m = metaRe.exec(text))) out.push(m[1]);
  /* bare string literals that look like site-relative asset paths */
  const litRe = /["'`](\/[\w\-.\/@%()\[\]{}一-鿿][^"'`\s<>]{0,200})["'`]/g;
  while ((m = litRe.exec(text))) {
    if (EXT_RE.test(m[1].split('?')[0])) out.push(m[1]);
  }
  return out;
}

/*
 * JSON payloads carry the asset inventory: cover images, description
 * screenshots, demo videos.  The values are either site-relative paths or
 * absolute CDN URLs, and some of them are JSON *inside* a JSON string
 * (desc_images), so this walks the text rather than parsing it.
 */
function extractFromJson(text) {
  const out = [];
  const strRe = /"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = strRe.exec(text))) {
    let v = m[1];
    if (v.includes('\\u')) {
      try {
        v = JSON.parse('"' + v + '"');
      } catch {
        /* keep the raw form */
      }
    }
    if (!v) continue;
    if (v.startsWith('[') || v.startsWith('{')) {
      for (const inner of extractFromJson(v)) out.push(inner);
      continue;
    }
    if (/^https?:\/\//i.test(v)) {
      if (/\/prod\/uploads\//.test(v)) out.push(v);
      continue;
    }
    if (v.startsWith('/') && EXT_RE.test(v.split('?')[0])) out.push(v);
  }
  return out;
}

function extractRefs(url, type, buf) {
  if (!buf) return [];
  const text = buf.toString('utf8');
  const lower = url.toLowerCase();
  if (lower.endsWith('.html') || lower.endsWith('.htm') || type.includes('text/html')) {
    return extractFromHtml(text);
  }
  if (lower.endsWith('.css') || type.includes('text/css')) return extractFromCss(text);
  if (
    lower.endsWith('.js') ||
    lower.endsWith('.mjs') ||
    type.includes('javascript')
  ) {
    return extractFromJs(text);
  }
  if (lower.endsWith('.json') || type.includes('json')) return extractFromJson(text);
  return [];
}

/* ------------------------------------------------------------------ */
/* local mirror mapping                                               */
/* ------------------------------------------------------------------ */

function localPathFor(url) {
  const u = new URL(url);
  let p = decodeURIComponent(u.pathname);
  if (p.endsWith('/')) p += 'index.html';
  /* The local server exposes the live URL path verbatim under a few roots. */
  if (p.startsWith('/prod/uploads/')) {
    return path.join(AFE, 'public', p.replace(/^\/+/, ''));
  }
  /* The CDN host serves the same /prod/uploads/ tree. */
  if (u.host === 'static.aifunengjiaoyu.com') {
    return path.join(AFE, 'public', p.replace(/^\/+/, ''));
  }
  if (p.startsWith('/play/')) {
    return path.join(AFE, 'play', path.basename(p));
  }
  if (p.startsWith('/courseware/')) {
    return path.join(AFE, 'courseware', path.basename(p));
  }
  /* Everything else is served out of the assets/ tree. */
  return path.join(AFE, 'assets', p.replace(/^\/+/, ''));
}

/* ------------------------------------------------------------------ */
/* seeds                                                              */
/* ------------------------------------------------------------------ */

const defaultSeeds = ['/'];

/* Everything the mirrored front-end actually asks for, harvested from the
 * local copy.  This seeds the crawl with pages the live site only reaches
 * after a click. */
function localSeedScan() {
  const found = [];
  const walk = (dir, depth) => {
    if (depth > 8) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        walk(full, depth + 1);
        continue;
      }
      if (!/\.(html?|mjs|js|css|json)$/i.test(e.name)) continue;
      if (path.basename(e.name).startsWith('_recon')) continue;
      let text;
      try {
        text = fs.readFileSync(full, 'utf8');
      } catch {
        continue;
      }
      const rel = '/' + path.relative(AFE, full).replace(/\\/g, '/');
      found.push(rel);
      for (const ref of extractRefs(rel, '', Buffer.from(text))) {
        if (looksLikePath(ref)) found.push(ref);
      }
    }
  };
  walk(AFE, 0);
  return found;
}

/* ------------------------------------------------------------------ */
/* main                                                               */
/* ------------------------------------------------------------------ */

const allSeeds = new Set(defaultSeeds);
for (const s of seeds) allSeeds.add(s);
for (const s of localSeedScan()) allSeeds.add(s);

for (const s of allSeeds) enqueue(s, 'seed');

const downloaded = [];
const missing = [];
const failed = [];
let processed = 0;

while (queue.length) {
  const item = queue.shift();
  const { url } = item;
  if (seen.has(url)) continue;

  let res;
  try {
    res = await fetchOne(url);
  } catch (error) {
    failed.push({ url, error: String(error) });
    continue;
  }
  processed++;

  const local = localPathFor(url);
  const haveLocal = fs.existsSync(local) && fs.statSync(local).size > 0;
  const rec = {
    url,
    status: res.status,
    type: res.type,
    size: res.body ? res.body.length : 0,
    local,
    present: haveLocal,
    note: item.note,
  };
  seen.set(url, rec);

  if (res.status === 200 && res.body) {
    if (!haveLocal) {
      missing.push(rec);
      if (!DRY) {
        fs.mkdirSync(path.dirname(local), { recursive: true });
        fs.writeFileSync(local, res.body);
        downloaded.push(rec);
      }
    } else if (fs.statSync(local).size !== res.body.length) {
      rec.sizeDiff = fs.statSync(local).size;
    }
    for (const ref of extractRefs(url, res.type, res.body)) {
      if (looksLikePath(ref)) enqueue(ref, url);
    }
  } else {
    failed.push({ url, status: res.status });
  }

  if (processed % 25 === 0) {
    process.stdout.write(
      `\r[${processed}] queued=${queue.length} seen=${seen.size} new=${downloaded.length}   `
    );
  }
}

process.stdout.write('\n');

/* ------------------------------------------------------------------ */
/* report                                                             */
/* ------------------------------------------------------------------ */

const report = {
  generatedAt: new Date().toISOString(),
  origin: ORIGIN,
  dry: DRY,
  totalSeen: seen.size,
  downloaded: downloaded.length,
  bytes: downloaded.reduce((a, b) => a + b.size, 0),
  missing,
  failed: failed.filter((f) => f.status && f.status !== 404),
  notFound: failed.filter((f) => f.status === 404).map((f) => f.url),
  all: [...seen.values()],
};

const outFile = path.join(ROOT, 'recon', 'scratch', 'afe-static-crawl.json');
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(report, null, 2));

console.log(`\n=== 图灵智赋 static crawl ===`);
console.log(`crawled      : ${seen.size} urls`);
console.log(`newly added  : ${downloaded.length} (${(report.bytes / 1048576).toFixed(1)} MB)`);
console.log(`404s         : ${report.notFound.length}`);
console.log(`other errors : ${report.failed.length}`);
console.log(`report       : ${outFile}`);
if (downloaded.length) {
  console.log('\n--- newly mirrored ---');
  for (const d of downloaded) {
    console.log(
      `  ${d.url.replace(ORIGIN, '')}  ${(d.size / 1024).toFixed(1)} KB -> ${path
        .relative(AFE, d.local)
        .replace(/\\/g, '/')}`
    );
  }
}
if (report.notFound.length) {
  console.log('\n--- 404 (site itself has no such file) ---');
  for (const u of report.notFound) console.log('  ' + u.replace(ORIGIN, ''));
}
