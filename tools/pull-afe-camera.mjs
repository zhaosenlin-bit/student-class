#!/usr/bin/env node
/*
 * Pull the works the camera runtime opens.
 *
 * These works refuse the whole-program token. The player instead asks for
 * a signed launch, gets a redirect plus a session cookie, and only then
 * the document appears. The trial allowance is small, so the body and
 * every asset it points at are fetched in one pass.
 *
 * A body that is already on disk carries its own lease. That lease keeps
 * serving its assets for a while, so --assets-only can finish the job
 * without spending another trial.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CW = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'courseware');
const ORIGIN = 'https://aifunengjiaoyu.com';
const ASSET_HOST = 'https://play.aifunengjiaoyu.com';
const TOKEN = fs.readFileSync(path.join(ROOT, 'recon', 'scratch', 'afe-token.txt'), 'utf8').trim();
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const apiHeaders = {
  'User-Agent': UA,
  Referer: `${ORIGIN}/`,
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

const FILE_EXT =
  /\.(?:js|mjs|css|html?|png|jpe?g|gif|svg|webp|avif|glb|gltf|bin|mp3|mp4|wav|ogg|m4a|woff2?|ttf|otf|eot|json|txt|wasm|ktx2?|basis|task|dat|data|glsl|vert|frag|ktx|env|map)(?:\?|$)/i;

const args = process.argv.slice(2);
const onlyIds = args.includes('--ids') ? args[args.indexOf('--ids') + 1] : null;
const assetsOnly = args.includes('--assets-only');

const refsOf = (text) => {
  const out = new Set();
  const add = (raw) => {
    if (!raw) return;
    const ref = raw.split('?')[0].split('#')[0];
    if (!ref) return;
    if (/^https?:\/\//i.test(ref)) {
      if (FILE_EXT.test(ref)) out.add(ref);
      return;
    }
    if (/^\/\//.test(ref) || ref.startsWith('data:') || ref.startsWith('mailto:')) return;
    if (!FILE_EXT.test(ref)) return;
    out.add(ref);
  };
  for (const m of text.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)) add(m[1]);
  for (const m of text.matchAll(/\bimport\s*(?:[^'"]*?\bfrom\s*)?["']([^"']+)["']/g)) add(m[1]);
  for (const m of text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) add(m[1]);
  for (const m of text.matchAll(/["'`](\.{0,2}\/[A-Za-z0-9_\-./]+\.[A-Za-z0-9]{2,5})["'`]/g)) add(m[1]);
  for (const m of text.matchAll(/["'`](\/[A-Za-z0-9_\-./]+\.[A-Za-z0-9]{2,5})["'`]/g)) add(m[1]);
  for (const m of text.matchAll(
    /["'`]([A-Za-z0-9_\-]+\.(?:png|jpe?g|gif|svg|webp|avif|glb|gltf|mp3|mp4|wav|ogg|m4a|json|js|mjs|css|wasm|bin|woff2?|ttf|task|dat|data))["'`]/g
  ))
    add(m[1]);
  return out;
};

/* Every way a reference can be filed on the asset host. */
const urlsFor = (id, assetRoot, rel) => {
  if (/^https?:\/\//i.test(rel)) return [rel];
  const clean = rel.replace(/^\.\//, '').replace(/^\/+/, '');
  const list = [];
  if (assetRoot) list.push(`${ASSET_HOST}${assetRoot}${clean}`);
  const lease = assetRoot?.match(/\/t\/([^/]+)\//)?.[1];
  if (lease) {
    list.push(`${ASSET_HOST}/api/program-assets/${id}/t/${lease}/${clean}`);
    list.push(`${ASSET_HOST}/api/program-assets/${id}/t/${lease}/package/${clean}`);
  }
  list.push(`${ASSET_HOST}/api/program-assets/${id}/${clean}`);
  return [...new Set(list)];
};

/* Walk the references of a body and save everything it can reach. */
async function crawlAssets(id, html, assetRoot) {
  const outDir = path.join(CW, `${id}.assets`);
  const queue = [];
  const seen = new Set();
  const push = (rel) => {
    if (!rel || seen.has(rel)) return;
    seen.add(rel);
    queue.push(rel);
  };
  for (const r of refsOf(html)) {
    if (/^https?:\/\//i.test(r)) push(r);
    else if (r.startsWith('/api/program-assets/'))
      push(r.replace(/^\/+/, '').replace(/^api\/program-assets\/\d+\/t\/[^/]+\//, ''));
    else if (assetRoot && r.startsWith(assetRoot)) push(decodeURIComponent(r.slice(assetRoot.length)));
    else push(r.replace(/^\.\//, '').replace(/^\/+/, ''));
  }

  let files = 0;
  let missing = 0;
  while (queue.length) {
    const raw = queue.shift();
    const isExt = /^https?:\/\//i.test(raw);
    const rel = isExt ? '_ext/' + new URL(raw).host + new URL(raw).pathname : decodeURIComponent(raw);
    const target = path.join(outDir, rel);
    let buf = null;
    if (fs.existsSync(target) && fs.statSync(target).size > 0) {
      buf = fs.readFileSync(target);
    } else {
      for (const url of urlsFor(id, assetRoot, raw)) {
        try {
          const res = await fetch(url, { headers: { 'User-Agent': UA } });
          if (res.ok) {
            buf = Buffer.from(await res.arrayBuffer());
            break;
          }
        } catch {
          buf = null;
        }
      }
      /* The CDN that these documents name is unreachable here; the same
         package is published on a mirror that answers. */
      if (!buf && raw.startsWith('https://cdn.jsdelivr.net/npm/')) {
        try {
          const res = await fetch(raw.replace('https://cdn.jsdelivr.net/npm/', 'https://unpkg.com/'), {
            headers: { 'User-Agent': UA },
          });
          if (res.ok) buf = Buffer.from(await res.arrayBuffer());
        } catch {
          buf = null;
        }
      }
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
        if (/^https?:\/\//i.test(r)) push(r);
        else if (r.startsWith('/api/program-assets/'))
          push(r.replace(/^\/+/, '').replace(/^api\/program-assets\/\d+\/t\/[^/]+\//, ''));
        else if (assetRoot && r.startsWith(assetRoot)) push(decodeURIComponent(r.slice(assetRoot.length)));
        else if (r.startsWith('/')) push(r.replace(/^\/+/, ''));
        else {
          const dir = path.posix.dirname(rel);
          push(path.posix.normalize(path.posix.join(dir, r)));
        }
      }
    }
  }
  return { files, missing };
}

async function pullViaCamera(program) {
  const id = program.id;
  const saved = path.join(CW, `${id}.html`);

  /* A body on disk already carries a lease; its assets can be fetched
     again without asking for a new trial. */
  if (assetsOnly && fs.existsSync(saved) && fs.statSync(saved).size > 2000) {
    const html = fs.readFileSync(saved, 'utf8');
    const assetRoot = html.match(/<base[^>]*href="([^"]+)"/i)?.[1] || null;
    const r = await crawlAssets(id, html, assetRoot);
    return { id, title: program.title, ok: true, bytes: html.length, ...r, via: 'lease' };
  }

  const launchRes = await fetch(`${ORIGIN}/api/programs/${id}/camera-launch`, {
    method: 'POST',
    headers: apiHeaders,
    body: '{}',
  });
  const launch = await launchRes.json();
  if (!launch.success || !launch.launchUrl) {
    return {
      id,
      title: program.title,
      ok: false,
      reason: `${launch.msg}${launch.reason ? '/' + launch.reason : ''}`,
    };
  }

  const jar = new Map();
  const cookieHeader = () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');

  let target = launch.launchUrl;
  let html = '';
  for (let hop = 0; hop < 6; hop++) {
    const res = await fetch(target, {
      headers: { 'User-Agent': UA, ...(jar.size ? { Cookie: cookieHeader() } : {}) },
      redirect: 'manual',
    });
    for (const c of res.headers.getSetCookie?.() || []) {
      const [pair] = c.split(';');
      const at = pair.indexOf('=');
      jar.set(pair.slice(0, at).trim(), pair.slice(at + 1).trim());
    }
    const text = await res.text();
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) break;
      target = new URL(location, target).href;
      continue;
    }
    if (!res.ok) return { id, title: program.title, ok: false, reason: `body ${res.status}` };
    html = text;
    break;
  }
  if (!html) return { id, title: program.title, ok: false, reason: 'no-body' };

  fs.mkdirSync(CW, { recursive: true });
  fs.writeFileSync(saved, html);
  const assetRoot = html.match(/<base[^>]*href="([^"]+)"/i)?.[1] || null;
  const r = await crawlAssets(id, html, assetRoot);
  return { id, title: program.title, ok: true, bytes: html.length, ...r, via: 'camera' };
}

const all = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'programs-all.json'), 'utf8')
);
let targets = all;
if (onlyIds) {
  const wanted = onlyIds.split(',').map((s) => s.trim());
  targets = all.filter((p) => wanted.includes(String(p.id)));
}

for (const program of targets) {
  const result = await pullViaCamera(program);
  console.log(
    result.ok
      ? `ok   ${result.id} ${(result.bytes / 1024 | 0)}KB files=${result.files} miss=${result.missing} ${String(result.title).slice(0, 26)}`
      : `FAIL ${result.id} ${result.reason} ${String(result.title).slice(0, 26)}`
  );
}
