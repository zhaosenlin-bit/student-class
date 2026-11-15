#!/usr/bin/env node
/*
 * Cross-check the API surface.
 *
 * craft-anything's js_app_map reads the mirrored bundles and lists every
 * endpoint the front-end can call.  This tool asks the local server for
 * each literal one and reports which are answered, so a gap shows up
 * instead of silently 404ing in the browser.
 */
import fs from 'node:fs';

const MAPS = [
  {
    files: [
      'recon/craft-xb-app-map.json',
      'recon/craft-js-app-map-xb-all.json',
    ],
    local: 'http://localhost:4173',
    live: 'https://xbjiaoyu.com',
  },
  {
    files: [
      'recon/craft-afe-app-map.json',
      'recon/craft-js-app-map-afe-all.json',
    ],
    local: 'http://localhost:4174',
    live: 'https://aifunengjiaoyu.com',
  },
];

const readMap = (file) => {
  const raw = fs.readFileSync(file, 'utf8');
  let json;
  try {
    json = JSON.parse(raw);
  } catch {
    json = JSON.parse(raw.slice(raw.indexOf('{')));
  }
  return (json.result || {}).endpoints || [];
};

const readMaps = (files) => {
  const out = [];
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    out.push(...readMap(file));
  }
  return out;
};

// Turn /api/x/{id}?q=1 into something the server can be asked about.
const concrete = (url) =>
  url
    .replace(/\{[^}]*\}/g, '1')
    .replace(/\?.*$/, '')
    .replace(/[^/]$/, '$&');

let gaps = 0;
let ok = 0;

const probe = async (base, path, method) => {
  const headers = { 'Content-Type': 'application/json' };
  if (method === 'POST' && base.includes('4173')) {
    // The live 小白教育 site refuses a POST that does not carry the
    // front-end's own Origin and X-Requested-With: studio headers.
    headers['X-Requested-With'] = 'studio';
    headers['Origin'] = base;
  }
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const r = await fetch(base + path, {
        method,
        headers,
        body: method === 'POST' ? '{}' : undefined,
        redirect: 'manual',
        signal: AbortSignal.timeout(25000),
      });
      if (r.status !== 429 || attempt === 3) return r.status;
    } catch {
      if (attempt === 3) return -1;
    }
    await new Promise((res) => setTimeout(res, 3000 * (attempt + 1)));
  }
  return -1;
};

for (const { files, local, live } of MAPS) {
  const eps = readMaps(files).filter(
    (e) => e.literal && /^\/(api|tuxiaoling\/api|course-compat)\//.test(e.url || '')
  );
  const seen = new Set();
  for (const e of eps) {
    const path = concrete(e.url);
    if (seen.has(path)) continue;
    seen.add(path);
  }
  console.log(`\n${files.join(' + ')}  (${seen.size} distinct paths)`);
  for (const path of seen) {
    for (const method of ['GET', 'POST']) {
      await new Promise((res) => setTimeout(res, 1200));
      const localStatus = await probe(local, path, method);
      const liveStatus = await probe(live, path, method);
      const match = localStatus === liveStatus;
      if (match) ok++;
      else gaps++;
      console.log(
        `  ${match ? 'ok  ' : 'DIFF'} ${method.padEnd(4)} ${path.padEnd(40)}` +
          ` local=${localStatus} live=${liveStatus}` +
          (match ? '' : '   <- differs')
      );
    }
  }
}

console.log(`\nmatching the live site ${ok}, different ${gaps}`);
