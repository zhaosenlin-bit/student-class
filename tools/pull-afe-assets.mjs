#!/usr/bin/env node
/*
 * Crawl the assets a 图灵智赋 courseware body depends on.
 *
 * A protected body is delivered as an HTML document that either carries
 * everything inline (the "reviewed public" works) or points at
 * /api/program-assets/<program>/t/<lease>/… through a <base href> or the
 * 长征 save-host config.  This tool walks those references and stores
 * every file under
 *   mirror/aifunengjiaoyu/courseware/<program>.assets/<relative path>
 * so the local server can replay them without a lease.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CW = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'courseware');
const ORIGIN = 'https://aifunengjiaoyu.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const args = process.argv.slice(2);
const onlyIds = args.includes('--ids')
  ? args[args.indexOf('--ids') + 1]
  : null;

const TOKEN = fs.existsSync(path.join(ROOT, 'recon', 'scratch', 'afe-token.txt'))
  ? fs.readFileSync(path.join(ROOT, 'recon', 'scratch', 'afe-token.txt'), 'utf8').trim()
  : '';

const FILE_EXT =
  /\.(?:js|mjs|css|html?|png|jpe?g|gif|svg|webp|avif|glb|gltf|bin|mp3|mp4|wav|ogg|m4a|woff2?|ttf|otf|eot|json|txt|wasm|ktx2?|basis)(?:\?|$)/i;

function assetRootOf(html) {
  const base = html.match(/<base[^>]*href="([^"]+)"/i);
  if (base) return base[1];
  const cfg = configOf(html);
  if (cfg && cfg.assetRoot) return cfg.assetRoot;
  return null;
}

function configOf(html) {
  const i = html.indexOf('})({"protocol"');
  if (i < 0) return null;
  const rest = html.slice(i + 3);
  let depth = 0;
  for (let k = 0; k < rest.length; k++) {
    const c = rest[k];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(rest.slice(0, k + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function entriesOf(html) {
  const cfg = configOf(html);
  return cfg ? cfg.entries || [] : [];
}

/* Every relative-looking reference inside a document. */
function refsOf(text) {
  const out = new Set();
  const add = (raw) => {
    if (!raw) return;
    let ref = raw.split('?')[0].split('#')[0];
    if (!ref) return;
    if (/^https?:\/\//i.test(ref)) {
      if (FILE_EXT.test(ref)) out.add(ref);
      return;
    }
    if (/^\/\//.test(ref)) return;
    if (ref.startsWith('data:') || ref.startsWith('mailto:')) return;
    if (!FILE_EXT.test(ref)) return;
    out.add(ref);
  };
  for (const m of text.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)) add(m[1]);
  for (const m of text.matchAll(/\bimport\s*(?:[^'"]*?\bfrom\s*)?["']([^"']+)["']/g)) add(m[1]);
  for (const m of text.matchAll(/import\.meta\.url/g)) {}
  for (const m of text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) add(m[1]);
  for (const m of text.matchAll(/["'`](\.{0,2}\/[A-Za-z0-9_\-./]+\.[A-Za-z0-9]{2,5})["'`]/g)) add(m[1]);
  for (const m of text.matchAll(/["'](\/[A-Za-z0-9_\-./]+\.[A-Za-z0-9]{2,5})["']/g)) add(m[1]);
  for (const m of text.matchAll(/https?:\/\/[A-Za-z0-9._\-]+(?:\/[A-Za-z0-9._\-%+]*)*\.[A-Za-z0-9]{2,5}(?:\?[A-Za-z0-9._\-+=&%]*)?/g)) add(m[0]);
  /* asset roots are referenced without a file name too */
  for (const m of text.matchAll(/["'](\/api\/program-assets\/[A-Za-z0-9_\-./]*)/g)) out.add(m[1]);
  return out;
}

function relFromAbsolute(ref, assetRoot) {
  if (ref.startsWith(assetRoot)) return decodeURIComponent(ref.slice(assetRoot.length));
  return null;
}

/* Resolve the bare specifiers of an import map to real URLs. */
function importMapOf(html) {
  const m = html.match(/<script[^>]*type=["']importmap["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!m) return {};
  try {
    return JSON.parse(m[1]).imports || {};
  } catch {
    return {};
  }
}

function specifiersOf(text) {
  const out = new Set();
  for (const m of text.matchAll(/from\s*["']([^"']+)["']/g)) out.add(m[1]);
  for (const m of text.matchAll(/import\(\s*["']([^"']+)["']/g)) out.add(m[1]);
  return out;
}

async function fetchOne(url) {
  const tryFetch = async (target) => {
  const res = await fetch(target, {
    headers: {
      'User-Agent': UA,
      Referer: `${ORIGIN}/`,
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    },
  });
  if (!res.ok) return null;
  return Buffer.from(await res.arrayBuffer());
  };
  let buf = await tryFetch(url).catch(() => null);
  if (!buf && url.startsWith('https://cdn.jsdelivr.net/')) {
    buf = await tryFetch(
      url.replace('https://cdn.jsdelivr.net/npm/', 'https://unpkg.com/')
    ).catch(() => null);
  }
  return buf;
}

const ids = fs
  .readdirSync(CW)
  .filter((f) => f.endsWith('.html'))
  .map((f) => f.replace(/\.html$/, ''))
  .filter((id) => !onlyIds || onlyIds.split(',').includes(id));

let grandFiles = 0;
for (const id of ids) {
  const bodyFile = path.join(CW, `${id}.html`);
  const html = fs.readFileSync(bodyFile, 'utf8');
  const assetRoot = assetRootOf(html);
  if (!assetRoot) {
    console.log(`[${id}] self-contained (no asset root)`);
    continue;
  }
  const outDir = path.join(CW, `${id}.assets`);
  const seeds = entriesOf(html);
  const queue = [];
  const seen = new Set();
  const push = (rel) => {
    if (!rel || seen.has(rel)) return;
    seen.add(rel);
    queue.push(rel);
  };
  for (const e of seeds) push(e);
  const importMap = importMapOf(html);
  for (const r of refsOf(html)) {
    if (/^https?:\/\//i.test(r)) {
      push(r);
      continue;
    }
    const abs = relFromAbsolute(r, assetRoot);
    push(abs || r.replace(/^\/+/, ''));
  }
  for (const spec of specifiersOf(html)) {
    if (/^https?:/i.test(spec) || spec.startsWith('/') || spec.startsWith('.')) continue;
    if (importMap[spec]) push(importMap[spec]);
    else {
      for (const [key, value] of Object.entries(importMap)) {
        if (key.endsWith('/') && spec.startsWith(key)) {
          push(value + spec.slice(key.length));
          break;
        }
      }
    }
  }

  let saved = 0;
  let failed = 0;
  while (queue.length) {
    const raw = queue.shift();
    const isExt = /^https?:\/\//i.test(raw);
    const rel = isExt
      ? '_ext/' + new URL(raw).host + '/' + new URL(raw).pathname.replace(/^\/+/, '')
      : decodeURIComponent(raw);
    const target = path.join(outDir, rel);
    const url = isExt
      ? raw
      : rel.startsWith('api/program-assets/')
        ? ORIGIN + '/' + rel
        : ORIGIN + assetRoot + rel;
    let buf = null;
    try {
      buf = fs.existsSync(target) && fs.statSync(target).size > 0 ? fs.readFileSync(target) : await fetchOne(url);
    } catch {
      buf = null;
    }
    if (!buf) {
      failed++;
      if (process.env.DEBUG_ASSETS) console.log(`   missing: ${url}`);
      continue;
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (!fs.existsSync(target)) fs.writeFileSync(target, buf);
    saved++;
    const text = buf.toString('utf8');
    if (/\.(js|mjs|css|html?|json)($|\?)/i.test(rel) && !isExt) {
      for (const r of refsOf(text)) {
        const abs = relFromAbsolute(r, assetRoot);
        if (abs) push(abs);
        else if (r.startsWith('/')) {
          /* absolute site paths such as /api/program-assets/<id>/… */
          if (r.startsWith('/api/program-assets/')) push(r.replace(/^\/+/, ''));
          continue;
        }
        else {
          const dir = path.posix.dirname(rel);
          push(path.posix.normalize(path.posix.join(dir, r)));
        }
      }
    }
  }
  const bytes = (fs.existsSync(outDir) ? fs.readdirSync(outDir, { recursive: true }) : [])
    .filter((f) => fs.statSync(path.join(outDir, f)).isFile())
    .reduce((n, f) => n + fs.statSync(path.join(outDir, f)).size, 0);
  console.log(`[${id}] ${saved} files, ${failed} missing, ${(bytes / 1024 / 1024).toFixed(1)} MB`);
  grandFiles += saved;
}
console.log(`\ntotal files: ${grandFiles}`);
