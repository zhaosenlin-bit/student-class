#!/usr/bin/env node
// Compare the local server with the live sites at the level the browser
// actually sees: status, content type and body text.
//
// The live 图灵智赋 site answers an unknown route — including a known route
// called with the wrong method — with Express's own "Cannot GET /path" HTML
// page, so a body-level comparison is the only way to see that.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const TARGETS = [
  {
    site: '图灵智赋',
    live: 'https://aifunengjiaoyu.com',
    local: 'http://localhost:4174',
    paths: JSON.parse(
      fs.readFileSync(path.join(ROOT, 'recon', 'afe-guest-paths.json'), 'utf8')
    ),
  },
  {
    site: '小白教育',
    live: 'https://xbjiaoyu.com',
    local: 'http://localhost:4173',
    paths: JSON.parse(
      fs.readFileSync(path.join(ROOT, 'recon', 'xb-live-method-matrix.json'), 'utf8')
    ),
  },
];

const norm = (text) => text.replace(/\s+/g, ' ').trim();

const probe = async (base, p, method) => {
  const headers = { 'Content-Type': 'application/json' };
  if (method === 'POST' && headersNeedStudio) {
    // The live 小白教育 site refuses a POST that does not look like it came
    // from its own front-end.
    headers['X-Requested-With'] = 'studio';
    headers['Origin'] = base;
    headers['Referer'] = `${base}/`;
  }
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const r = await fetch(base + p, {
        method,
        headers,
        body: method === 'POST' ? '{}' : undefined,
        redirect: 'manual',
        signal: AbortSignal.timeout(25000),
      });
      const text = await r.text();
      if (r.status !== 429 || attempt === 3) {
        return {
          status: r.status,
          type: (r.headers.get('content-type') || '').split(';')[0],
          body: norm(text).slice(0, 220),
        };
      }
    } catch {
      if (attempt === 3) return { status: -1, type: '', body: 'error' };
    }
    await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
  }
  return { status: -1, type: '', body: 'error' };
};

let headersNeedStudio = false;

let same = 0;
let diff = 0;
const report = [];

for (const t of TARGETS) {
  const paths = Array.isArray(t.paths) ? t.paths : Object.keys(t.paths);
  headersNeedStudio = t.site === '小白教育';
  for (const p of paths) {
    for (const method of ['GET', 'POST']) {
      await new Promise((r) => setTimeout(r, 1000));
      const live = await probe(t.live, p, method);
      const local = await probe(t.local, p, method);
      const match =
        live.status === local.status &&
        live.type === local.type &&
        live.body === local.body;
      if (match) same++;
      else {
        diff++;
        report.push({ site: t.site, path: p, method, live, local });
      }
      console.log(
        `${match ? 'ok  ' : 'DIFF'} ${method.padEnd(4)} ${p.padEnd(42)}` +
          ` live=${live.status}/${live.type} local=${local.status}/${local.type}`
      );
    }
  }
}

console.log(`\nidentical ${same}, different ${diff}\n`);
for (const r of report) {
  console.log(`--- ${r.site} ${r.method} ${r.path}`);
  console.log(`    live : ${r.live.status} ${r.live.type} ${r.live.body}`);
  console.log(`    local: ${r.local.status} ${r.local.type} ${r.local.body}`);
}

fs.writeFileSync(
  path.join(ROOT, 'recon', 'response-body-diff.json'),
  JSON.stringify(report, null, 2)
);
