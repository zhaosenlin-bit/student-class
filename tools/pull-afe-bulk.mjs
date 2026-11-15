#!/usr/bin/env node
/*
 * Pull every courseware body the 图灵智赋 platform is willing to hand over.
 *
 * The front page shows twelve works; /api/programs lists four hundred and
 * forty-two, and the account can open almost all of them. A body arrives as
 * a small document that points at a lease folder with a <base href>; the
 * lease is short lived, so the assets have to be crawled right after the
 * body is fetched.
 *
 * Everything lands in
 *   mirror/aifunengjiaoyu/courseware/<id>.html
 *   mirror/aifunengjiaoyu/courseware/<id>.assets/...
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
const TOKEN = fs.readFileSync(path.join(ROOT, 'recon', 'scratch', 'afe-token.txt'), 'utf8').trim();

const args = process.argv.slice(2);
const onlyIds = args.includes('--ids') ? args[args.indexOf('--ids') + 1] : null;
const limit = args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) : Infinity;
const workers = args.includes('--workers') ? Number(args[args.indexOf('--workers') + 1]) : 5;
const skipAssets = args.includes('--no-assets');

const FILE_EXT =
  /\.(?:js|mjs|css|html?|png|jpe?g|gif|svg|webp|avif|glb|gltf|bin|mp3|mp4|wav|ogg|m4a|woff2?|ttf|otf|eot|json|txt|wasm|ktx2?|basis)(?:\?|$)/i;

const headers = {
  'User-Agent': UA,
  Referer: `${ORIGIN}/`,
  Authorization: `Bearer ${TOKEN}`,
};

/*
 * The platform rate limits a burst of requests. Everything goes through one
 * gate: a minimum gap between calls, and a patient retry when it says no.
 */
const GAP = Number(process.env.AFE_GAP || 350);
let lastCall = 0;
async function pace() {
  const wait = lastCall + GAP - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
}

async function request(url, options = {}) {
  for (let attempt = 0; attempt < 5; attempt++) {
    await pace();
    const res = await fetch(url, { ...options, headers: { ...headers, ...(options.headers || {}) } });
    if (res.status !== 429) return res;
    /* Too many requests: back off and try again. */
    const pause = 4000 * (attempt + 1) + Math.floor(Math.random() * 3000);
    if (process.env.AFE_VERBOSE) console.log(`   429, waiting ${pause}ms`);
    await new Promise((r) => setTimeout(r, pause));
  }
  return fetch(url, { ...options, headers: { ...headers, ...(options.headers || {}) } });
}

const api = async (route, options = {}) => {
  const res = await request(ORIGIN + route, {
    ...options,
    headers: {
      ...headers,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  try {
    return { status: res.status, text, json: JSON.parse(text) };
  } catch {
    return { status: res.status, text, json: null };
  }
};

/*
 * The camera runtime hands out a signed launch URL on a second host. The
 * URL answers with a redirect and a session cookie; following that gives
 * the real document.
 */
async function pullViaCameraLaunch(program) {
  const id = program.id;
  const res = await api(`/api/programs/${id}/camera-launch`, {
    method: 'POST',
    body: '{}',
  });
  const launchUrl = res.json?.launchUrl;
  if (!launchUrl) return null;

  const jar = new Map();
  const cookieHeader = () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  const store = (response) => {
    for (const c of response.headers.getSetCookie?.() || []) {
      const [pair] = c.split(';');
      const at = pair.indexOf('=');
      jar.set(pair.slice(0, at).trim(), pair.slice(at + 1).trim());
    }
  };

  let target = launchUrl;
  let html = '';
  for (let hop = 0; hop < 6; hop++) {
    const response = await fetch(target, {
      headers: {
        'User-Agent': UA,
        ...(jar.size ? { Cookie: cookieHeader() } : {}),
      },
      redirect: 'manual',
    });
    store(response);
    const text = await response.text();
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) break;
      target = new URL(location, target).href;
      continue;
    }
    if (!response.ok) return null;
    html = text;
    break;
  }
  if (!html) return null;

  /* The lease prefix in the base tag has to survive into the local copy,
     so the asset folder is named after the lease exactly as the body
     expects it. */
  const base = html.match(/<base[^>]*href="([^"]+)"/i)?.[1] || null;
  const lease = base ? base.match(/\/t\/([^/]+)\//)?.[1] : null;
  const assetRoot = lease ? `/api/program-assets/${id}/t/${lease}/` : base;

  fs.mkdirSync(CW, { recursive: true });
  fs.writeFileSync(path.join(CW, `${id}.html`), html);

  let files = 0;
  let missing = 0;
  if (!skipAssets) {
    const r = await crawlAssets(id, html, assetRoot, { jar, cookieHeader });
    files = r.files;
    missing = r.missing;
  }
  return { id, title: program.title, ok: true, bytes: html.length, files, missing, via: 'camera' };
}

const configOf = (html) => {
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
};

const assetRootOf = (html) => {
  const base = html.match(/<base[^>]*href="([^"]+)"/i);
  if (base) return base[1];
  const cfg = configOf(html);
  return cfg?.assetRoot || null;
};

const refsOf = (text) => {
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
  for (const m of text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) add(m[1]);
  for (const m of text.matchAll(/["'`](\.{0,2}\/[A-Za-z0-9_\-./]+\.[A-Za-z0-9]{2,5})["'`]/g)) add(m[1]);
  for (const m of text.matchAll(/["'](\/[A-Za-z0-9_\-./]+\.[A-Za-z0-9]{2,5})["']/g)) add(m[1]);
  /* A bare file name inside the package folder, such as "y.png". */
  for (const m of text.matchAll(
    /["'`]([A-Za-z0-9_\-]+\.(?:png|jpe?g|gif|svg|webp|avif|glb|gltf|mp3|mp4|wav|ogg|m4a|json|js|mjs|css|wasm|bin|woff2?|ttf))["'`]/g
  ))
    add(m[1]);
  for (const m of text.matchAll(/["'](\/api\/program-assets\/[A-Za-z0-9_\-./]*)/g)) out.add(m[1]);
  return out;
};

const fetchBuffer = async (url, session = null) => {
  const extra = session?.cookieHeader ? { Cookie: session.cookieHeader() } : {};
  const tryFetch = async (target) => {
    const res = await request(target, { headers: extra });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  };
  let buf = await tryFetch(url).catch(() => null);
  if (!buf && url.startsWith('https://cdn.jsdelivr.net/')) {
    buf = await tryFetch(url.replace('https://cdn.jsdelivr.net/npm/', 'https://unpkg.com/')).catch(
      () => null
    );
  }
  return buf;
};

/* Crawl the lease folder the body points at, saving every file it can reach. */
async function crawlAssets(id, html, assetRoot, session = null) {
  if (!assetRoot) return { files: 0, missing: 0 };
  const outDir = path.join(CW, `${id}.assets`);
  const cfg = configOf(html);
  const seeds = cfg?.entries || [];
  const importMap = (() => {
    const m = html.match(/<script[^>]*type=["']importmap["'][^>]*>([\s\S]*?)<\/script>/i);
    if (!m) return {};
    try {
      return JSON.parse(m[1]).imports || {};
    } catch {
      return {};
    }
  })();

  const queue = [];
  const seen = new Set();
  const push = (rel) => {
    if (!rel || seen.has(rel)) return;
    seen.add(rel);
    queue.push(rel);
  };
  for (const e of seeds) push(e);
  for (const r of refsOf(html)) {
    if (/^https?:\/\//i.test(r)) push(r);
    else if (r.startsWith(assetRoot)) push(decodeURIComponent(r.slice(assetRoot.length)));
    else if (r.startsWith('/api/program-assets/')) push(r.replace(/^\/+/, ''));
    else push(r.replace(/^\/+/, ''));
  }
  for (const m of html.matchAll(/from\s*["']([^"']+)["']/g)) {
    const spec = m[1];
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

  let files = 0;
  let missing = 0;
  while (queue.length) {
    const raw = queue.shift();
    const isExt = /^https?:\/\//i.test(raw);
    const rel = isExt
      ? '_ext/' + new URL(raw).host + new URL(raw).pathname
      : decodeURIComponent(raw);
    const target = path.join(outDir, rel);
    const url = isExt
      ? raw
      : rel.startsWith('api/program-assets/')
        ? ORIGIN + '/' + rel
        : ORIGIN + assetRoot + rel;
    let buf = null;
    try {
      buf =
        fs.existsSync(target) && fs.statSync(target).size > 0
          ? fs.readFileSync(target)
          : await fetchBuffer(url, session);
    } catch {
      buf = null;
    }
    if (!buf) {
      missing++;
      continue;
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (!fs.existsSync(target)) fs.writeFileSync(target, buf);
    files++;
    if (/\.(js|mjs|css|html?|json)($|\?)/i.test(rel) && !isExt) {
      const text = buf.toString('utf8');
      for (const r of refsOf(text)) {
        if (r.startsWith(assetRoot)) push(decodeURIComponent(r.slice(assetRoot.length)));
        else if (r.startsWith('/api/program-assets/')) push(r.replace(/^\/+/, ''));
        else if (/^https?:\/\//i.test(r)) push(r);
        else {
          const dir = path.posix.dirname(rel);
          push(path.posix.normalize(path.posix.join(dir, r)));
        }
      }
    }
  }
  return { files, missing };
}

async function pullOne(program) {
  const id = program.id;
  const bodyFile = path.join(CW, `${id}.html`);
  if (fs.existsSync(bodyFile) && fs.statSync(bodyFile).size > 0 && !args.includes('--refresh')) {
    const html = fs.readFileSync(bodyFile, 'utf8');
    if (!skipAssets) await crawlAssets(id, html, assetRootOf(html));
    return { id, title: program.title, ok: true, cached: true };
  }

  const access = await api(`/api/programs/${id}/access-token`);
  if (!access.json?.success || !access.json.token) {
    /* Some works refuse the whole-program token but open through the
       camera runtime the player uses. Try that door before giving up. */
    const viaCamera = await pullViaCameraLaunch(program);
    if (viaCamera) return viaCamera;
    return { id, title: program.title, ok: false, reason: access.json?.msg || access.status };
  }
  let url = `${ORIGIN}/api/program-file/${id}?token=${encodeURIComponent(access.json.token)}`;

  let body = null;
  let html = '';
  for (let hop = 0; hop < 4; hop++) {
    const res = await request(url).catch(() => null);
    if (!res || !res.ok) {
      return { id, title: program.title, ok: false, reason: res ? res.status : 'fetch' };
    }
    body = Buffer.from(await res.arrayBuffer());
    html = body.toString('utf8');
    const next = html.match(/window\.location\.replace\(["']([^"']+)["']\)/);
    if (!next) break;
    url = next[1].startsWith('http') ? next[1] : ORIGIN + next[1];
  }
  if (!body) return { id, title: program.title, ok: false, reason: 'no-body' };
  fs.mkdirSync(CW, { recursive: true });
  fs.writeFileSync(bodyFile, body);

  let files = 0;
  let missing = 0;
  if (!skipAssets) {
    const r = await crawlAssets(id, html, assetRootOf(html));
    files = r.files;
    missing = r.missing;
  }
  return { id, title: program.title, ok: true, bytes: body.length, files, missing };
}

const all = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'programs-all.json'), 'utf8')
);
let targets = all;
if (onlyIds) {
  const wanted = onlyIds.split(',').map((s) => s.trim());
  targets = all.filter((p) => wanted.includes(String(p.id)));
}
targets = targets.slice(0, limit);

const report = [];
let cursor = 0;
let done = 0;

async function worker() {
  while (cursor < targets.length) {
    const program = targets[cursor++];
    let result;
    try {
      result = await pullOne(program);
    } catch (e) {
      result = { id: program.id, title: program.title, ok: false, reason: e.message };
    }
    done++;
    report.push(result);
    if (result.ok) {
      console.log(
        `ok   ${String(done).padStart(3)}/${targets.length} ${String(result.id).padEnd(5)} ` +
          `${(result.bytes || 0) / 1024 | 0}KB files=${result.files ?? '-'} miss=${result.missing ?? '-'} ` +
          `${String(result.title || '').slice(0, 26)}`
      );
    } else {
      console.log(`FAIL ${String(done).padStart(3)}/${targets.length} ${result.id} ${result.reason}`);
    }
    fs.writeFileSync(
      path.join(ROOT, 'recon', 'scratch', 'afe-bulk-report.json'),
      JSON.stringify(report, null, 1)
    );
  }
}

console.log(`pulling ${targets.length} programmes with ${workers} workers`);
await Promise.all(Array.from({ length: Math.min(workers, targets.length) }, worker));

const ok = report.filter((r) => r.ok);
console.log(`\npulled ${ok.length}/${report.length}`);
const reasons = new Map();
for (const r of report.filter((x) => !x.ok)) reasons.set(r.reason, (reasons.get(r.reason) || 0) + 1);
for (const [reason, count] of reasons) console.log(`  ${count} x ${reason}`);
