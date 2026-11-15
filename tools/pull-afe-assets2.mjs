/*
 * Second pass: pull the external files the 图灵智赋 bodies still point at.
 *
 * The first pass only walked the <base> tree of each body. These works also
 * borrow libraries straight from a CDN — MediaPipe, three.js add-ons, the
 * Tailwind play CDN, a hand-landmark model and the tarot art. jsdelivr is not
 * reachable from this machine, so every jsdelivr path is fetched from the
 * unpkg mirror and stored under the original host name, which keeps the
 * server side rewrite (/api/program-assets/<id>/_ext/<host>/…) valid.
 */
import fs from 'node:fs';
import path from 'node:path';

const DIR = 'mirror/leqixiang/courseware';
const IDS = ['afe-11', 'afe-13', 'afe-15', 'afe-668'];

const MEDIAPIPE_WASM = [
  'vision_wasm_internal.js',
  'vision_wasm_internal.wasm',
  'vision_wasm_nosimd_internal.js',
  'vision_wasm_nosimd_internal.wasm',
];

const TAROT_MAJOR = Array.from({ length: 22 }, (_, i) => `ar${String(i).padStart(2, '0')}.jpg`);
const TAROT_SUITS = ['wa', 'cu', 'sw', 'pe'];
const TAROT_RANKS = ['ac', '02', '03', '04', '05', '06', '07', '08', '09', '10', 'pa', 'kn', 'qu', 'ki'];
const TAROT_MINOR = [];
for (let i = 0; i < 30; i++) {
  TAROT_MINOR.push(`${TAROT_SUITS[i % 4]}${TAROT_RANKS[Math.floor(i / 4)]}.jpg`);
}

/* url -> {fetch, local} */
const PLAN = new Map();
const add = (url, fetchUrl, local, target) => PLAN.set(url, { fetchUrl, local, target });

const JSDELIVR = /^https:\/\/cdn\.jsdelivr\.net\/npm\/(.+)$/;

function planFor(id, url) {
  if (url === 'https://cdn.tailwindcss.com') {
    return { fetchUrl: url, local: `_ext/cdn.tailwindcss.com/tailwind.js` };
  }
  if (url.startsWith('https://storage.googleapis.com/')) {
    return { fetchUrl: url, local: `_ext/${url.replace('https://', '')}` };
  }
  if (url.startsWith('https://www.sacred-texts.com/tarot/pkt/img/')) {
    return { fetchUrl: url, local: `_ext/www.sacred-texts.com/tarot/pkt/img/${path.basename(url)}` };
  }
  const m = url.match(JSDELIVR);
  if (m) {
    const rest = m[1];
    let fetchPath = rest;
    if (rest.endsWith('/+esm')) {
      fetchPath = rest.replace(/\/\+esm$/, '/vision_bundle.mjs');
    }
    const localPath = rest.replace(/\/\+esm$/, '/vision_bundle.mjs');
    return {
      fetchUrl: `https://unpkg.com/${fetchPath}`,
      local: `_ext/cdn.jsdelivr.net/npm/${localPath}`,
    };
  }
  const cdn = url.match(/^https:\/\/(cdnjs\.cloudflare\.com\/.*)$/);
  if (cdn) return { fetchUrl: url, local: `_ext/${cdn[1]}` };
  return null;
}

const urlRx = /https?:\/\/[^\s"'`)<>]+/g;
const attrRx = /(?:src|href)\s*=\s*["']([^"']+)["']/g;
const impRx = /["'](https?:\/\/[^"']+)["']/g;

const wanted = new Map();
for (const id of IDS) {
  const t = fs.readFileSync(path.join(DIR, `${id}.html`), 'utf8');
  const urls = new Set();
  for (const rx of [urlRx, attrRx, impRx]) {
    for (const m of t.matchAll(rx)) urls.add(String(m[1] ?? m[0]).replace(/[),;]+$/, ''));
  }
  wanted.set(id, [...urls]);
}

let ok = 0;
let failed = 0;
for (const [id, urls] of wanted) {
  for (const url of urls) {
    if (url.endsWith('/')) continue;
    if (/^(https?:\/\/(www\.w3\.org|jcgt\.org))/i.test(url)) continue;
    if (/^https:\/\/images\.weserv\.nl/.test(url)) continue;
    if (/^https:\/\/static\.aifunengjiaoyu\.com/.test(url)) continue;

    let plan = planFor(id, url);
    /* The MediaPipe wasm folder is addressed as a directory. */
    if (url.match(/@mediapipe\/tasks-vision@[\d.]+\/wasm$/)) {
      const base = url.match(/^(https:\/\/cdn\.jsdelivr\.net\/npm\/@mediapipe\/tasks-vision@[\d.]+\/wasm)$/)[1];
      for (const f of MEDIAPIPE_WASM) {
        add(
          `${base}/${f}`,
          `https://unpkg.com/@mediapipe/tasks-vision@0.10.9/wasm/${f}`,
          `_ext/cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm/${f}`,
          id
        );
      }
      continue;
    }
    if (!plan) continue;
    add(url, plan.fetchUrl, plan.local, id);
  }
}

/* The tarot art is addressed through a CORS proxy at runtime; mirror the
   files themselves so the copy works offline. */
for (const id of IDS) {
  if (id !== 'afe-11') continue;
  for (const f of [...TAROT_MAJOR, ...TAROT_MINOR]) {
    const url = `https://www.sacred-texts.com/tarot/pkt/img/${f}`;
    add(url, url, `_ext/www.sacred-texts.com/tarot/pkt/img/${f}`, id);
  }
}

for (const [url, plan] of PLAN) {
  const target = plan.target;
  const out = path.join(DIR, `${target}.assets`, plan.local);
  if (fs.existsSync(out) && fs.statSync(out).size > 0) {
    ok++;
    continue;
  }
  try {
    const r = await fetch(plan.fetchUrl, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36' },
    });
    if (!r.ok) throw new Error('status ' + r.status);
    const buf = Buffer.from(await r.arrayBuffer());
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, buf);
    ok++;
    console.log('ok  ', String(buf.length).padStart(9), plan.local);
  } catch (e) {
    failed++;
    console.log('FAIL', plan.local, e.message);
  }
}
console.log(`\npulled ${ok}, failed ${failed}`);
