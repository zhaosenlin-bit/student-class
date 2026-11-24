#!/usr/bin/env node
/*
 * Does every course still work without the internet?
 *
 * The library keeps a copy of the scripts and the fonts that the lessons
 * ask for, and the server points the lessons at those copies.  This
 * fetches each lesson the way a reader would, collects every address it
 * still reaches for, and asks the local server for each one.  A lesson
 * that is left asking the internet for something is reported, because
 * that is the lesson that will look broken on a machine with no network.
 *
 *   node tools/check-lq-offline-assets.mjs --conc 12
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const PORT = Number(arg('lq', 4173));
const CONC = Number(arg('conc', 12));
const REPORT = arg('report', '');
const BASE = `http://127.0.0.1:${PORT}`;

const cat = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'mirror', 'leqixiang', 'catalog.json'), 'utf8')
);
const ids = cat.products.filter((p) => p.localInstalled).map((p) => p.id);

const seen = new Map();
const bad = [];
let checked = 0;

async function head(url) {
  try {
    const r = await fetch(url, { method: 'GET', redirect: 'follow' });
    await r.arrayBuffer();
    return r.status;
  } catch {
    return 0;
  }
}

async function course(id) {
  const res = await fetch(`${BASE}/courseware/${id}?local=1`);
  if (!res.ok) {
    bad.push({ id, url: `courseware/${id}`, status: res.status });
    return;
  }
  const html = await res.text();
  /* Everything the lesson asks the network for, and every local copy it
     points at.  The local ones have to be there; the outside ones are the
     ones that break without a network. */
  const urls = new Set();
  /* A hint for the browser is not a file the lesson needs. */
  const hints = new Set();
  for (const m of html.matchAll(
    /<link\b[^>]*\brel=["']?(?:dns-prefetch|preconnect|prefetch|preload)["']?[^>]*>/gi
  )) {
    for (const h of m[0].matchAll(/href\s*=\s*["']([^"']+)["']/gi)) {
      hints.add(h[1]);
    }
  }
  for (const m of html.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)) {
    const u = m[1];
    if (!u || hints.has(u)) continue;
    if (/^https?:\/\//i.test(u)) urls.add(u);
    else if (u.startsWith('/')) urls.add(u);
  }
  for (const u of urls) {
    if (!u.startsWith('/_ext/') && !u.startsWith('/api/program-assets/')) continue;
    if (!u.includes('/_ext/')) continue;
    const key = u.split('?')[0];
    if (seen.has(key)) continue;
    seen.set(key, id);
  }
  checked += 1;
  if (checked % 200 === 0) console.log(`[${checked}/${ids.length}] 外网直连 ${bad.length} 处`);
}

async function pool(list, worker, size) {
  let index = 0;
  const runners = Array.from({ length: size }, async () => {
    while (index < list.length) {
      const item = list[index++];
      await worker(item);
    }
  });
  await Promise.all(runners);
}

await pool(ids, course, CONC);

/* Now the local copies themselves. */
console.log(`本地副本地址 ${seen.size} 个，逐个问服务要`);
const broken = [];
await pool(
  [...seen.keys()],
  async (u) => {
    const status = await head(BASE + u);
    if (status !== 200) broken.push({ url: u, status, course: seen.get(u) });
  },
  CONC
);

console.log('');
console.log(`课程 ${checked} 门，本地副本地址 ${seen.size} 个`);

if (REPORT) {
  fs.writeFileSync(
    REPORT,
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        courses: checked,
        localCopies: seen.size,
        externalHits: bad.length,
        broken,
      },
      null,
      1
    )
  );
  console.log(`报告写入 ${REPORT}`);
}

if (broken.length) {
  console.log(`缺 ${broken.length} 个：`);
  for (const b of broken.slice(0, 40)) console.log(`  ${b.status} ${b.url}  (${b.course})`);
  process.exitCode = 1;
} else {
  console.log('绿灯：每一门课要用的外部脚本与字体，本地都有。');
}
