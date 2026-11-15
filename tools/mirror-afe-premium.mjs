#!/usr/bin/env node
/*
 * Mirror the 图灵智赋 精品课 (premium catalogue) side of the site.
 *
 * /api/programs only exposes 12 guest-visible works.  The full catalogue
 * lives behind /api/premium/catalogue: 10 packages, 224 categories and 480
 * courses, each pointing at a programme id in the 846-1346 range.  That
 * endpoint is public, so it can be mirrored exactly like the rest of the
 * front-end.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AFE = path.join(ROOT, 'mirror', 'aifunengjiaoyu');
const PREMIUM_DIR = path.join(AFE, 'premium');
const ASSET_DIR = path.join(AFE, 'assets', 'premium-catalogue');
const ORIGIN = 'https://aifunengjiaoyu.com';
const UA = { 'User-Agent': 'Mozilla/5.0' };

const JSON_TARGETS = [
  ['/api/premium/catalogue', 'catalogue.json'],
  ['/api/premium/prices', 'prices.json'],
  ['/api/premium/capabilities', 'capabilities.json'],
  ['/api/pay/vip-prices', 'vip-prices.json'],
];

const MODULE_TARGETS = [
  'client.mjs',
  'account.mjs',
  'membership.mjs',
  'promotion.mjs',
  'purchase.mjs',
  'uploads.mjs',
  'covers.mjs',
  'microphone-viewer.mjs',
];

async function get(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { headers: UA });
      if (res.status === 404) return { status: 404, body: null };
      if (!res.ok) throw new Error(`status ${res.status}`);
      return { status: res.status, body: Buffer.from(await res.arrayBuffer()) };
    } catch (error) {
      if (attempt === 3) throw error;
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
}

fs.mkdirSync(PREMIUM_DIR, { recursive: true });
fs.mkdirSync(ASSET_DIR, { recursive: true });

for (const [urlPath, name] of JSON_TARGETS) {
  const { status, body } = await get(ORIGIN + urlPath);
  if (status !== 200) {
    console.log(`skip ${urlPath} -> ${status}`);
    continue;
  }
  fs.writeFileSync(path.join(PREMIUM_DIR, name), body);
  console.log(`json  ${urlPath} -> premium/${name} (${body.length} B)`);
}

for (const name of MODULE_TARGETS) {
  const { status, body } = await get(`${ORIGIN}/premium-catalogue/${name}`);
  if (status !== 200) {
    console.log(`skip module ${name} -> ${status}`);
    continue;
  }
  fs.writeFileSync(path.join(ASSET_DIR, name), body);
  console.log(`mod   /premium-catalogue/${name} (${body.length} B)`);
}

/*
 * Covers: one image per catalogue course.  Two shapes appear in the
 * catalogue — /premium-catalogue/covers/<key>.jpg and
 * /uploads/public/users/<user>/upload-<id>/image-0.jpg — and the second
 * one repeats the file name in every directory, so keep the whole URL path.
 */
const catalogue = JSON.parse(fs.readFileSync(path.join(PREMIUM_DIR, 'catalogue.json'), 'utf8'));
const covers = [...new Set((catalogue.courses || []).map((c) => c.coverUrl).filter(Boolean))];

let fetched = 0;
let missing = 0;
let reused = 0;
let totalBytes = 0;
const CONCURRENCY = 8;

async function fetchCover(rel) {
  const file = path.join(AFE, 'assets', rel.replace(/^\/+/, ''));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (fs.existsSync(file) && fs.statSync(file).size > 0) {
    reused++;
    return;
  }
  const { status, body } = await get(ORIGIN + rel);
  if (status !== 200 || !body) {
    missing++;
    return;
  }
  fs.writeFileSync(file, body);
  totalBytes += body.length;
  fetched++;
}

for (let i = 0; i < covers.length; i += CONCURRENCY) {
  await Promise.all(covers.slice(i, i + CONCURRENCY).map(fetchCover));
  process.stdout.write(`\r  covers ${Math.min(i + CONCURRENCY, covers.length)}/${covers.length}`);
}

console.log(
  `\ncovers: ${fetched} fetched (${(totalBytes / 1024 / 1024).toFixed(1)} MB), ` +
    `${reused} already present, ${missing} missing upstream`,
);
