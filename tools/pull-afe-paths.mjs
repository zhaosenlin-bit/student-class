#!/usr/bin/env node
/*
 * Fetch named files for a work under a fresh lease.
 *
 * Some works keep their own copy of a module tree — a bootstrap script
 * that imports a dozen more files — and the first mirror pass only kept
 * the two files the document itself names. This tool takes the list of
 * paths that are known to be missing, asks the platform for a new lease
 * and pulls exactly those paths into the work's asset folder.
 *
 * It also takes absolute addresses, for the works that read from a public
 * CDN, and stores those under _ext/<host>/ next to the rest of the mirror.
 *
 *   node tools/pull-afe-paths.mjs --id 616 --paths src/core/SceneManager.js,vendor/three.module.js
 *   node tools/pull-afe-paths.mjs --id 501 --urls https://host/a.png,https://host/b.webp
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CW = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'courseware');
const ORIGIN = 'https://aifunengjiaoyu.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const TOKEN = fs.readFileSync(path.join(ROOT, 'recon', 'scratch', 'afe-token.txt'), 'utf8').trim();
const HEADERS = { Authorization: `Bearer ${TOKEN}`, 'User-Agent': UA, Referer: `${ORIGIN}/` };

const args = process.argv.slice(2);
const value = (name, fallback) => {
  const i = args.indexOf(name);
  return i < 0 ? fallback : args[i + 1];
};
const id = value('--id', '');
const paths = (value('--paths', '') || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const urls = (value('--urls', '') || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
/* Local addresses of mirrored CDN files, given as the path under the
   course's own folder. They are asked of their host again. */
const localPaths = (value('--paths-local', '') || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

let lastCall = 0;
async function pace(gap = 260) {
  const wait = lastCall + gap - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
}
async function get(url, options = {}) {
  for (let attempt = 0; attempt < 4; attempt++) {
    await pace();
    try {
      const res = await fetch(url, { ...options, headers: { ...HEADERS, ...(options.headers || {}) } });
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 4000 * (attempt + 1)));
        continue;
      }
      return res;
    } catch {
      await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
    }
  }
  return null;
}

async function freshBase(programId) {
  const page = await get(`${ORIGIN}/api/programs/${programId}`);
  if (!page) return null;
  const text = await page.text();
  const next = text.match(/window\.location\.replace\(["']([^"']+)["']\)/)?.[1];
  if (!next) return null;
  const res = await get(ORIGIN + next);
  if (!res || !res.ok) return null;
  const html = await res.text();
  return html.match(/<base[^>]*href="([^"]+)"/i)?.[1] || `/api/program-assets/${programId}/`;
}

function store(rel, buf, outDir) {
  const target = path.join(outDir, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, buf);
  return target;
}

if (paths.length) {
  const base = await freshBase(id);
  if (!base) {
    console.log(`${id}: 取不到新租约`);
    process.exit(1);
  }
  console.log(`${id}: 租约 ${base.slice(0, 72)}…`);
  const outDir = path.join(CW, `${id}.assets`);
  for (const rel of paths) {
    const clean = rel.split('?')[0];
    const target = path.join(outDir, clean);
    if (fs.existsSync(target) && fs.statSync(target).size > 0) {
      console.log(`  = ${rel} 已有`);
      continue;
    }
    let done = false;
    for (const b of [base, `/api/program-assets/${id}/`, `/api/program-assets/${id}/_ext/`]) {
      if (done) break;
      const url = ORIGIN + b.replace(/\/$/, '') + '/' + clean.split('/').map(encodeURIComponent).join('/');
      const res = await get(url);
      if (!res || !res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (!buf.length) continue;
      store(clean, buf, outDir);
      console.log(`  + ${rel}  (${(buf.length / 1024).toFixed(0)} KB)`);
      done = true;
    }
    if (!done) console.log(`  - ${rel} 取不到`);
  }
}

for (const url of urls) {
  const parsed = new URL(url);
  const rel = `_ext/${parsed.host}${parsed.pathname}`;
  const outDir = path.join(CW, `${id}.assets`);
  const target = path.join(outDir, rel);
  if (fs.existsSync(target) && fs.statSync(target).size > 0) {
    console.log(`  = ${rel} 已有`);
    continue;
  }
  const res = await get(url, { headers: { Authorization: '' } });
  if (!res || !res.ok) {
    console.log(`  - ${url} -> ${res ? res.status : '失败'}`);
    continue;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  store(rel, buf, outDir);
  console.log(`  + ${rel}  (${(buf.length / 1024).toFixed(0)} KB)`);
}

for (const rel of localPaths) {
  const outDir = path.join(CW, `${id}.assets`);
  const target = path.join(outDir, rel);
  if (fs.existsSync(target) && fs.statSync(target).size > 0) {
    console.log(`  = ${rel} 已有`);
    continue;
  }
  /* _ext/<host>/<path> came from https://<host>/<path> */
  const withoutExt = rel.replace(/^_ext\//, '');
  const cut = withoutExt.indexOf('/');
  if (cut < 0) continue;
  const host = withoutExt.slice(0, cut);
  const rest = withoutExt.slice(cut + 1);
  const url = `https://${host}/${rest.split('/').map(encodeURIComponent).join('/')}`;
  const res = await get(url, { headers: { Authorization: '' } });
  if (!res || !res.ok) {
    console.log(`  - ${rel} -> ${res ? res.status : '失败'}`);
    continue;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  store(rel, buf, outDir);
  console.log(`  + ${rel}  (${(buf.length / 1024).toFixed(0)} KB)`);
}
