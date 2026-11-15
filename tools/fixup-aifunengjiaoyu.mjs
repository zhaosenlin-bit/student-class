#!/usr/bin/env node
/*
 * Second pass over the aifunengjiaoyu mirror.
 *
 *  1. Save /tuxiaoling/ (the 图小灵 AI teaching assistant page the SPA embeds)
 *     as a real index.html; the first pass stored it as a bare file name.
 *  2. Retry every CDN asset that did not come down cleanly.
 *  3. Rewrite every https://static.aifunengjiaoyu.com/... URL inside
 *     programs.json to the local /prod/uploads/... path so the replica never
 *     depends on the remote CDN (which rejects requests without a Referer).
 */

import fs from 'node:fs';
import path from 'node:path';

const ORIGIN = 'https://aifunengjiaoyu.com';
const CDN = 'https://static.aifunengjiaoyu.com';
const ROOT = 'C:/kaifa/xiaobai-class/mirror/aifunengjiaoyu';
const ASSET_DIR = path.join(ROOT, 'assets');
const PUBLIC_DIR = path.join(ROOT, 'public');
const MANIFEST = path.join(ROOT, 'manifest.json');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ensureDir = (p) => fs.mkdirSync(p, { recursive: true });

function localPathFor(url, baseDir) {
  const u = new URL(url);
  let rel = decodeURIComponent(u.pathname).replace(/^\/+/, '');
  if (rel === '' || rel.endsWith('/')) rel += 'index.html';
  const dir = path.join(baseDir, path.dirname(rel));
  ensureDir(dir);
  return { file: path.join(dir, path.basename(rel)), rel };
}

async function fetchWithRetry(url, attempts = 4) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': UA,
          Referer: `${ORIGIN}/`,
          Accept: '*/*',
          'Accept-Language': 'zh-CN,zh;q=0.9',
        },
        redirect: 'follow',
      });
      if (res.ok) return res;
      lastError = new Error(`status ${res.status}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(700 * (i + 1));
  }
  throw lastError;
}

const manifest = fs.existsSync(MANIFEST)
  ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))
  : { assets: {}, public: {} };
manifest.assets = manifest.assets || {};
manifest.public = manifest.public || {};

/* 1. the /tuxiaoling page --------------------------------------------- */
for (const [url, bucket, dir] of [
  [`${ORIGIN}/tuxiaoling/`, 'assets', ASSET_DIR],
  [`${ORIGIN}/favicon.ico`, 'assets', ASSET_DIR],
]) {
  try {
    const res = await fetchWithRetry(url);
    const buf = Buffer.from(await res.arrayBuffer());
    const { file, rel } = localPathFor(url, dir);
    ensureDir(path.dirname(file));
    fs.writeFileSync(file, buf);
    manifest[bucket][url] = { rel, status: 200, bytes: buf.length };
    console.log(`[asset 200] ${rel} ${buf.length}b`);
  } catch (error) {
    console.log(`[asset FAIL] ${url} :: ${error.message}`);
  }
}

/* 2. catalogue, media, and the URL rewrite ----------------------------- */
const catRes = await fetchWithRetry(`${ORIGIN}/api/programs`);
const catalogue = await catRes.json();

const wanted = new Set();
const collect = (value) => {
  if (typeof value !== 'string' || !value.startsWith('http')) return;
  wanted.add(value);
};
for (const p of catalogue.programs || []) {
  collect(p.cover_url);
  collect(p.video_url);
  for (const field of ['desc_images', 'admin_note_images']) {
    if (!p[field]) continue;
    try {
      for (const u of JSON.parse(p[field])) collect(u);
    } catch {}
  }
}

/* every file that is already on disk, keyed by its CDN URL */
const localByUrl = new Map();
for (const [url, rec] of Object.entries(manifest.public)) {
  if (rec.status === 200) localByUrl.set(url, rec.rel);
}

for (const url of wanted) {
  if (localByUrl.has(url)) continue;
  try {
    const res = await fetchWithRetry(url);
    const buf = Buffer.from(await res.arrayBuffer());
    const { file, rel } = localPathFor(url, PUBLIC_DIR);
    ensureDir(path.dirname(file));
    fs.writeFileSync(file, buf);
    manifest.public[url] = { rel, status: 200, bytes: buf.length };
    localByUrl.set(url, rel);
    console.log(`[public 200] ${rel} ${buf.length}b`);
  } catch (error) {
    manifest.public[url] = { rel: null, status: 0, error: String(error.message || error) };
    console.log(`[public FAIL] ${url.slice(-70)} :: ${error.message}`);
  }
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
  await sleep(100);
}

/* 3. rewrite the catalogue to local paths ------------------------------ */
const rewrite = (value) => {
  if (typeof value !== 'string') return value;
  if (!value.startsWith(`${CDN}/`)) return value;
  const rel = localByUrl.get(value);
  return rel ? `/${rel}` : value;
};

const rewritten = (catalogue.programs || []).map((p) => {
  const next = { ...p, cover_url: rewrite(p.cover_url), video_url: rewrite(p.video_url) };
  for (const field of ['desc_images', 'admin_note_images']) {
    if (!p[field]) continue;
    try {
      const list = JSON.parse(p[field]).map(rewrite);
      next[field] = JSON.stringify(list);
    } catch {}
  }
  next.price = 0;
  next.localInstalled = false;
  next.localReplica = true;
  return next;
});

fs.writeFileSync(
  path.join(ROOT, 'programs.json'),
  JSON.stringify({ ...catalogue, programs: rewritten, guestLimited: false }, null, 2)
);

manifest.summary = {
  assets: Object.keys(manifest.assets).length,
  public: Object.keys(manifest.public).length,
  programs: rewritten.length,
};
fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
console.log('SUMMARY', JSON.stringify(manifest.summary));
