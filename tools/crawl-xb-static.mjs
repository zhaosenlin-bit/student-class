#!/usr/bin/env node
/*
 * Exhaustive static-surface crawler for 小白教育 (xbjiaoyu.com).
 *
 * Same idea as the 图灵智赋 crawler: walk everything the site can ask the
 * browser to load — HTML, CSS, ES modules, images, fonts — and compare it
 * against the local mirror so nothing public is left behind.
 *
 * Usage:
 *   node tools/crawl-xb-static.mjs           # discover + download gaps
 *   node tools/crawl-xb-static.mjs --dry     # discover only
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const XB = path.join(ROOT, 'mirror', 'xbjiaoyu');
const ORIGIN = 'https://xbjiaoyu.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const DRY = process.argv.includes('--dry');

const EXT_RE =
  /\.(?:js|mjs|css|json|html?|png|jpe?g|webp|gif|svg|ico|woff2?|ttf|otf|eot|mp4|webm|mov|m3u8|mp3|wav|glb|gltf|bin|txt|xml|pdf|map|zip)$/i;

const seen = new Map();
const queue = [];
const queued = new Set();

function enqueue(url, note = '') {
  if (!url || url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('#'))
    return;
  let abs;
  try {
    abs = new URL(url, ORIGIN + '/').href;
  } catch {
    return;
  }
  if (!abs.startsWith(ORIGIN)) return;
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
  const re = /(?:from\s*|import\s*\(\s*|import\s+|require\s*\(\s*)["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(text))) out.push(m[1]);
  const litRe = /["'`](\/[\w\-.\/@%()\[\]{}一-鿿][^"'`\s<>]{0,200})["'`]/g;
  while ((m = litRe.exec(text))) {
    if (EXT_RE.test(m[1].split('?')[0])) out.push(m[1]);
  }
  const dirRe = /["'`](\/images\/[A-Za-z0-9_\-./]{2,120})["'`]/g;
  while ((m = dirRe.exec(text))) out.push(m[1]);
  return out;
}

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
        /* keep raw */
      }
    }
    if (typeof v !== 'string' || !v.startsWith('/')) continue;
    if (EXT_RE.test(v.split('?')[0])) out.push(v);
  }
  return out;
}

function extractRefs(url, type, buf) {
  if (!buf) return [];
  const text = buf.toString('utf8');
  const lower = url.toLowerCase();
  if (lower.endsWith('.html') || lower.endsWith('.htm') || type.includes('text/html'))
    return extractFromHtml(text);
  if (lower.endsWith('.css') || type.includes('text/css')) return extractFromCss(text);
  if (lower.endsWith('.js') || lower.endsWith('.mjs') || type.includes('javascript'))
    return extractFromJs(text);
  if (lower.endsWith('.json') || type.includes('json')) return extractFromJson(text);
  return [];
}

function localPathFor(url) {
  const u = new URL(url);
  let p = decodeURIComponent(u.pathname);
  if (p.endsWith('/')) p += 'index.html';
  if (p.startsWith('/courseware/')) {
    return path.join(XB, 'courseware', path.basename(p).replace(/\.html$/, '') + '.html');
  }
  if (p.startsWith('/download/')) {
    return path.join(XB, 'courseware', path.basename(p));
  }
  return path.join(XB, 'assets', p.replace(/^\/+/, ''));
}

/* Seed from the local copy too, so pages only reachable by clicking are
 * covered, and from the catalogue payload that names every cover. */
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
      let text;
      try {
        text = fs.readFileSync(full, 'utf8');
      } catch {
        continue;
      }
      const rel = '/' + path.relative(XB, full).replace(/\\/g, '/');
      if (rel.startsWith('/assets/')) found.push(rel.slice('/assets'.length) || '/');
      for (const ref of extractRefs(rel, '', Buffer.from(text))) {
        if (/^\/[^\s]+\.(js|mjs|css|json|png|jpe?g|webp|svg|woff2?)$/i.test(ref)) {
          found.push(ref);
        }
      }
    }
  };
  walk(XB, 0);
  return found;
}

for (const s of new Set(['/', ...localSeedScan()])) enqueue(s, 'seed');

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
  const haveLocal =
    fs.existsSync(local) && fs.statSync(local).isFile() && fs.statSync(local).size > 0;
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
    }
    for (const ref of extractRefs(url, res.type, res.body)) {
      if (!ref || ref.startsWith('#')) continue;
      if (/^https?:\/\//i.test(ref)) {
        if (!ref.startsWith(ORIGIN)) continue;
      }
      enqueue(ref, url);
    }
  } else {
    failed.push({ url, status: res.status });
  }

  if (processed % 40 === 0) {
    process.stdout.write(
      `\r[${processed}] queued=${queue.length} seen=${seen.size} new=${downloaded.length}   `
    );
  }
}

process.stdout.write('\n');

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

const outFile = path.join(ROOT, 'recon', 'scratch', 'xb-static-crawl.json');
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(report, null, 2));

console.log(`\n=== 小白教育 static crawl ===`);
console.log(`crawled      : ${seen.size} urls`);
console.log(`newly added  : ${downloaded.length} (${(report.bytes / 1048576).toFixed(2)} MB)`);
console.log(`404s         : ${report.notFound.length}`);
console.log(`other errors : ${report.failed.length}`);
console.log(`report       : ${outFile}`);
if (downloaded.length) {
  console.log('\n--- newly mirrored ---');
  for (const d of downloaded) {
    console.log(
      `  ${d.url.replace(ORIGIN, '')}  ${(d.size / 1024).toFixed(1)} KB -> ${path
        .relative(XB, d.local)
        .replace(/\\/g, '/')}`
    );
  }
}
if (report.notFound.length) {
  console.log('\n--- 404 (site itself has no such file) ---');
  for (const u of report.notFound) console.log('  ' + u.replace(ORIGIN, ''));
}
