#!/usr/bin/env node
// Cross-project check: REA's runtime observation vs craft-anything's static graph.
//
// REA captured the bytes the browser actually received (response bodies).
// We hash those bytes, hash the mirrored file that answers the same path, and
// hand both to craft-anything's js_runtime_code_match. A script that is
// "loaded" there means the bundle we serve is the bundle the browser ran.
import { createHash } from 'node:crypto';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CAPTURES = path.join(ROOT, 'recon', 'captures');

const SITES = [
  {
    id: 'xbjiaoyu',
    liveHost: 'xbjiaoyu.com',
    localHost: 'localhost:4173',
    mirror: path.join(ROOT, 'mirror', 'xbjiaoyu'),
    captures: ['local-xb-runtime.json', 'xb-catalog.json', 'xb-play-free.json'],
  },
  {
    id: 'aifunengjiaoyu',
    liveHost: 'aifunengjiaoyu.com',
    localHost: 'localhost:4174',
    mirror: path.join(ROOT, 'mirror', 'aifunengjiaoyu'),
    captures: [
      'local-afe-runtime.json',
      'afe-browse-final.json',
      'afe-launch.json',
      'afe-inspect.json',
    ],
  },
];

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

function sha256Buf(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

// Every script the browser asked for, with the sha256 of the bytes it received
// (from the captured response body) when the capture kept them.
function captureScripts(file) {
  if (!existsSync(file)) return [];
  const j = JSON.parse(readFileSync(file, 'utf8'));
  const items = j?.normalized_result?.events?.items ?? [];
  const urlByTxn = new Map();
  const bodyByTxn = new Map();
  for (const it of items) {
    if (it.kind === 'request' && it.resource_type === 'script' && it.url?.url) {
      urlByTxn.set(it.transaction_id, it.url.url);
    }
    if (it.kind === 'network-content' && it.phase === 'response' && it.body?.state === 'captured') {
      const raw = Buffer.from(it.body.content ?? '', 'base64');
      bodyByTxn.set(it.transaction_id, { bytes: raw, sha256: sha256Buf(raw) });
    }
  }
  const out = [];
  for (const [txn, url] of urlByTxn) {
    const body = bodyByTxn.get(txn);
    out.push({ url, sha256: body?.sha256 ?? null, bytes: body?.bytes?.length ?? null });
  }
  return out;
}

// Map a request URL onto the mirrored file that answers it.
function localFileFor(site, url) {
  const u = new URL(url);
  const live = u.hostname === site.liveHost;
  const local = u.hostname === site.localHost || u.hostname === 'localhost';
  if (!live && !local) return null;
  let rel = decodeURIComponent(u.pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  rel = rel.replace(/^\/+/, '');
  // The server answers /app.js from mirror/<site>/assets/app.js; the AFE bundle
  // sits one level deeper because its own paths already start with /assets/.
  for (const candidate of [
    path.join(site.mirror, 'assets', rel),
    path.join(site.mirror, rel),
  ]) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

const runtime = {};
const summary = [];

for (const site of SITES) {
  const seen = new Map();
  let noBody = 0;
  let thirdParty = 0;
  let fileMismatch = 0;
  for (const cap of site.captures) {
    for (const s of captureScripts(path.join(CAPTURES, cap))) {
      if (seen.has(s.url)) continue;
      const file = localFileFor(site, s.url);
      if (!file) {
        const host = new URL(s.url).hostname;
        if (host === site.liveHost || host === site.localHost || host === 'localhost') {
          noBody += 1;
        } else {
          thirdParty += 1;
        }
        continue;
      }
      const onDisk = sha256(file);
      const served = s.sha256;
      if (served && served !== onDisk) fileMismatch += 1;
      seen.set(s.url, {
        url: s.url,
        sha256: served ?? onDisk,
        source: served ? 'browser-response' : 'mirrored-file',
        file: path.relative(ROOT, file),
        matchesMirror: served ? served === onDisk : null,
      });
    }
  }
  runtime[site.id] = [...seen.values()];
  summary.push({
    site: site.id,
    scripts: seen.size,
    browserHashed: seen.size && [...seen.values()].filter((v) => v.source === 'browser-response').length,
    mirrorMismatch: fileMismatch,
    notMirrored: noBody,
    thirdParty: thirdParty,
  });
}

const outPath = path.join(ROOT, 'recon', 'runtime-scripts.json');
writeFileSync(outPath, JSON.stringify(runtime, null, 2));
console.log(JSON.stringify({ summary, out: path.relative(ROOT, outPath) }, null, 2));
