#!/usr/bin/env node
/*
 * Mirror every publicly reachable media file of the 12 guest-visible 图灵智赋
 * works (covers, description screenshots, admin-note images and the demo
 * videos).
 *
 * The catalogue payload already hands out the absolute CDN URLs, so the file
 * list never has to be guessed.  Every asset keeps its URL path under
 * mirror/aifunengjiaoyu/public/, which is exactly how the local server
 * exposes /prod/uploads/... .
 *
 * The CDN only answers requests that carry a Referer, hence the header.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AFE = path.join(ROOT, 'mirror', 'aifunengjiaoyu');
const PUBLIC = path.join(AFE, 'public');
const ORIGIN = 'https://aifunengjiaoyu.com';
const CDN = 'https://static.aifunengjiaoyu.com';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36',
  Referer: `${ORIGIN}/`,
};

async function get(url, attempts = 4) {
  let last;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { headers: HEADERS, redirect: 'follow' });
      if (!res.ok) return { status: res.status, body: null };
      return { status: res.status, body: Buffer.from(await res.arrayBuffer()) };
    } catch (error) {
      last = error;
      await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
  }
  throw last;
}

/* Collect the media URLs straight out of the live catalogue payload. */
const res = await fetch(`${ORIGIN}/api/programs`, { headers: HEADERS });
const payload = await res.json();
const programs = payload.programs || [];

const urls = new Map();
const add = (raw, note) => {
  if (!raw) return;
  const abs = /^https?:\/\//i.test(raw) ? raw : ORIGIN + (raw.startsWith('/') ? raw : '/' + raw);
  if (!urls.has(abs)) urls.set(abs, note);
};

for (const p of programs) {
  add(p.cover_url, `cover:${p.id}`);
  add(p.video_url, `video:${p.id}`);
  let desc = [];
  try {
    desc = JSON.parse(p.desc_images || '[]');
  } catch {}
  for (const d of desc) add(d, `desc:${p.id}`);
  let notes = [];
  try {
    notes = JSON.parse(p.admin_note_images || '[]');
  } catch {}
  for (const n of notes) add(n, `note:${p.id}`);
}

console.log(`catalogue: ${programs.length} works, ${urls.size} media URLs`);

const CONCURRENCY = 6;
const queue = [...urls.entries()];
let fetched = 0;
let reused = 0;
let failed = 0;
let bytes = 0;

async function pull([url, note]) {
  const parsed = new URL(url);
  const rel = decodeURIComponent(parsed.pathname).replace(/^\/+/, '');
  const file = path.join(PUBLIC, rel);
  if (fs.existsSync(file) && fs.statSync(file).size > 0) {
    reused++;
    return;
  }
  const { status, body } = await get(url);
  if (status !== 200 || !body) {
    failed++;
    console.log(`  MISS ${status} ${note} ${url}`);
    return;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body);
  fetched++;
  bytes += body.length;
}

for (let i = 0; i < queue.length; i += CONCURRENCY) {
  await Promise.all(queue.slice(i, i + CONCURRENCY).map(pull));
  process.stdout.write(`\r  media ${Math.min(i + CONCURRENCY, queue.length)}/${queue.length}`);
}

console.log(
  `\nmedia: ${fetched} fetched (${(bytes / 1024 / 1024).toFixed(1)} MB), ` +
    `${reused} already present, ${failed} unavailable upstream`,
);

/*
 * The CDN cannot list a bucket, so the long-march picture folder is swept by
 * name pattern: the catalogue names 介绍图1..N and 场景1..N.
 */
const sweep = [];
for (let i = 1; i <= 30; i++) {
  sweep.push(`介绍图${i}.jpg`);
  sweep.push(`场景${i}.jpg`);
}
sweep.push('封面.jpg');

const longMarch = `${CDN}/prod/uploads/public/long-march/v1/${encodeURIComponent('长征图片')}`;
let swept = 0;
let sweepMiss = 0;
for (const name of sweep) {
  const rel = `prod/uploads/public/long-march/v1/${'长征图片'}/${name}`;
  const file = path.join(PUBLIC, rel);
  if (fs.existsSync(file) && fs.statSync(file).size > 0) continue;
  const { status, body } = await get(`${longMarch}/${encodeURIComponent(name)}`);
  if (status !== 200 || !body) {
    sweepMiss++;
    continue;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body);
  swept++;
  console.log(`  sweep  + 长征图片/${name} (${body.length} B)`);
}
console.log(`long-march sweep: ${swept} added, ${sweepMiss} names not present`);
