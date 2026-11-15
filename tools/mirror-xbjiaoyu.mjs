#!/usr/bin/env node
// Mirror the publicly reachable parts of xbjiaoyu.com (小白教育):
//   - the site shell assets (CSS / JS / images) that the shell loads
//   - every course whose catalog entry is marked free (mode === 'free')
//
// Free courses are served to any anonymous visitor by the site itself:
//   POST /api/launch/<id>  ->  { url: "/courseware/<id>?ticket=..." }
//   GET  /courseware/<id>?ticket=...  (with the studio_viewer cookie)
// Paid courses are intentionally NOT mirrored: the server refuses to launch
// them without a purchase entitlement.

import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import crypto from 'node:crypto';

const ORIGIN = 'https://xbjiaoyu.com';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'mirror', 'xbjiaoyu');
const ASSET_DIR = path.join(ROOT, 'assets');
const CW_DIR = path.join(ROOT, 'courseware');
const MANIFEST = path.join(ROOT, 'manifest.json');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

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
      const res = await fetch(url, {
        ...options,
        headers: { 'User-Agent': UA, ...(options.headers || {}) },
        redirect: 'follow',
      });
      return res;
    } catch (error) {
      lastError = error;
      await sleep(800 * (i + 1));
    }
  }
  throw lastError;
}

async function saveAsset(url, baseDir, manifest) {
  if (manifest.assets[url]) return manifest.assets[url];
  const { file, rel } = localPathFor(url, baseDir);
  try {
    const res = await fetchWithRetry(url);
    if (!res.ok) {
      manifest.assets[url] = { rel, status: res.status, bytes: 0 };
      return manifest.assets[url];
    }
    const buf = Buffer.from(await res.arrayBuffer());
    ensureDir(path.dirname(file));
    fs.writeFileSync(file, buf);
    manifest.assets[url] = { rel, status: res.status, bytes: buf.length };
    return manifest.assets[url];
  } catch (error) {
    manifest.assets[url] = { rel, status: 0, error: String(error.message || error) };
    return manifest.assets[url];
  }
}

async function mirrorCourse(id, manifest) {
  if (manifest.courses[id]) return manifest.courses[id];
  const tabId = crypto.randomUUID();
  const entry = { id, status: 'pending' };
  manifest.courses[id] = entry;
  try {
    const launchRes = await fetchWithRetry(`${ORIGIN}/api/launch/${encodeURIComponent(id)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'studio',
        Referer: `${ORIGIN}/`,
        Origin: ORIGIN,
      },
      body: JSON.stringify({ tabId }),
    });
    const cookie = (launchRes.headers.getSetCookie?.() || [])
      .map((c) => c.split(';')[0])
      .join('; ');
    if (!launchRes.ok) {
      entry.status = 'refused';
      entry.httpStatus = launchRes.status;
      entry.message = (await launchRes.text()).slice(0, 300);
      return entry;
    }
    const launch = await launchRes.json();
    const cwUrl = ORIGIN + launch.url;
    const cwRes = await fetchWithRetry(cwUrl, {
      headers: { Referer: `${ORIGIN}/`, Cookie: cookie },
    });
    if (!cwRes.ok) {
      entry.status = 'refused';
      entry.httpStatus = cwRes.status;
      entry.message = (await cwRes.text()).slice(0, 300);
      return entry;
    }
    const buf = Buffer.from(await cwRes.arrayBuffer());
    ensureDir(CW_DIR);
    const file = path.join(CW_DIR, `${id}.html`);
    fs.writeFileSync(file, buf);
    entry.status = 'ok';
    entry.bytes = buf.length;
    entry.file = path.relative(ROOT, file).replace(/\\/g, '/');
    entry.sha256 = crypto.createHash('sha256').update(buf).digest('hex');
    entry.sourceUrl = cwUrl.split('?')[0];
  } catch (error) {
    entry.status = 'error';
    entry.message = String(error.message || error);
  }
  return entry;
}

async function main() {
  ensureDir(ASSET_DIR);
  ensureDir(CW_DIR);

  const catalog = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const products = catalog.products || [];
  const free = products.filter((p) => p.mode === 'free');
  const paid = products.filter((p) => p.mode !== 'free');

  const manifest = {
    source: ORIGIN,
    capturedAt: new Date().toISOString(),
    catalogCount: products.length,
    freeCount: free.length,
    paidCount: paid.length,
    assets: {},
    courses: {},
  };

  // asset URL list comes from a file (argv[3]) when present, else from argv[3..]
  const assetListFile = process.argv[3];
  const assetUrls = assetListFile && fs.existsSync(assetListFile)
    ? fs.readFileSync(assetListFile, 'utf8').split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
    : process.argv.slice(3);
  let done = 0;
  for (const url of assetUrls) {
    await saveAsset(url, ASSET_DIR, manifest);
    done++;
    if (done % 25 === 0) {
      console.log(`assets ${done}/${assetUrls.length}`);
      fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
    }
  }
  console.log(`assets done: ${done}`);

  const CONCURRENCY = 4;
  const queue = [...free];
  async function worker() {
    while (queue.length) {
      const p = queue.shift();
      const entry = await mirrorCourse(p.id, manifest);
      console.log(
        `[${entry.status}] ${p.id} (${p.title}) ${entry.bytes ? entry.bytes + 'b' : ''} ${
          entry.message ? entry.message.slice(0, 80) : ''
        }`
      );
      fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
      await sleep(250);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  manifest.coursesSummary = {
    ok: Object.values(manifest.courses).filter((c) => c.status === 'ok').length,
    refused: Object.values(manifest.courses).filter((c) => c.status === 'refused').length,
    error: Object.values(manifest.courses).filter((c) => c.status === 'error').length,
  };
  manifest.paidProducts = paid.map((p) => ({
    id: p.id,
    title: p.title,
    subject: p.subject,
    stages: p.stages,
    cover: p.cover,
    taxonomy: p.taxonomy,
    description: p.description,
    modules: p.modules,
  }));
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
  console.log('SUMMARY', JSON.stringify(manifest.coursesSummary));
}

main();
