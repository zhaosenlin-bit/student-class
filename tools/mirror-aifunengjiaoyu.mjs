#!/usr/bin/env node
// Mirror the publicly reachable parts of aifunengjiaoyu.com (图灵智赋):
//   - the shell assets the SPA loads (CSS / JS / images / the /tuxiaoling page)
//   - the marketplace catalogue returned by /api/programs
//   - the public cover art, description images, demo videos and attachments
//     that the CDN serves under prod/uploads/public
//
// Program courseware itself is behind /api/program-file (401 without a
// signed-in account) and is NOT mirrored here.

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
  if (rel === '') rel = 'index.html';
  const dir = path.join(baseDir, path.dirname(rel));
  ensureDir(dir);
  return { file: path.join(dir, path.basename(rel)), rel };
}

async function fetchWithRetry(url, options = {}, attempts = 3) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetch(url, {
        ...options,
        headers: { 'User-Agent': UA, Referer: `${ORIGIN}/`, ...(options.headers || {}) },
        redirect: 'follow',
      });
    } catch (error) {
      lastError = error;
      await sleep(900 * (i + 1));
    }
  }
  throw lastError;
}

async function save(url, baseDir, manifest, bucket) {
  if (manifest[bucket][url]) return manifest[bucket][url];
  const { file, rel } = localPathFor(url, baseDir);
  try {
    const res = await fetchWithRetry(url);
    if (!res.ok) {
      manifest[bucket][url] = { rel, status: res.status, bytes: 0 };
      return manifest[bucket][url];
    }
    const buf = Buffer.from(await res.arrayBuffer());
    ensureDir(path.dirname(file));
    fs.writeFileSync(file, buf);
    manifest[bucket][url] = { rel, status: res.status, bytes: buf.length };
    return manifest[bucket][url];
  } catch (error) {
    manifest[bucket][url] = { rel, status: 0, error: String(error.message || error) };
    return manifest[bucket][url];
  }
}

async function main() {
  ensureDir(ASSET_DIR);
  ensureDir(PUBLIC_DIR);

  const manifest = {
    source: ORIGIN,
    cdn: CDN,
    capturedAt: new Date().toISOString(),
    assets: {},
    public: {},
  };

  // 1. shell assets
  const assetListFile = process.argv[2];
  const assetUrls = fs.existsSync(assetListFile)
    ? fs.readFileSync(assetListFile, 'utf8').split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
    : [];

  // The SPA shell and the /tuxiaoling page it embeds.
  assetUrls.push(`${ORIGIN}/`);
  assetUrls.push(`${ORIGIN}/tuxiaoling/`);

  let done = 0;
  for (const url of assetUrls) {
    await save(url, ASSET_DIR, manifest, 'assets');
    done++;
    if (done % 20 === 0) {
      console.log(`assets ${done}/${assetUrls.length}`);
      fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
    }
  }
  console.log(`assets done: ${done}`);

  // 2. catalogue
  const catRes = await fetchWithRetry(`${ORIGIN}/api/programs`);
  const catalogue = await catRes.json();
  fs.writeFileSync(path.join(ROOT, 'programs.json'), JSON.stringify(catalogue, null, 2));
  console.log(`catalogue programs: ${catalogue.programs.length}`);

  // 3. public CDN material
  const publicUrls = new Set();
  for (const p of catalogue.programs || []) {
    if (p.cover_url) publicUrls.add(p.cover_url);
    if (p.video_url) publicUrls.add(p.video_url);
    if (p.desc_images) {
      try {
        for (const u of JSON.parse(p.desc_images)) publicUrls.add(u);
      } catch {}
    }
    if (p.admin_note_images) {
      try {
        for (const u of JSON.parse(p.admin_note_images)) publicUrls.add(u);
      } catch {}
    }
  }

  let pdone = 0;
  for (const url of publicUrls) {
    if (!url.startsWith('http')) continue;
    const rec = await save(url, PUBLIC_DIR, manifest, 'public');
    pdone++;
    console.log(`[public ${rec.status}] ${url.slice(-70)} ${rec.bytes ? rec.bytes + 'b' : ''}`);
    fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
    await sleep(120);
  }
  console.log(`public done: ${pdone}`);

  manifest.summary = {
    assets: Object.keys(manifest.assets).length,
    public: Object.keys(manifest.public).length,
    programs: (catalogue.programs || []).length,
  };
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
  console.log('SUMMARY', JSON.stringify(manifest.summary));
}

main();
