#!/usr/bin/env node
/*
 * Completes the shared library of 3JCN.
 *
 * A library that is mirrored is rarely whole: a module of three.js asks
 * for the shaders that sit beside it, a shader asks for its own little
 * pieces.  The first pass found the libraries the pages name; this pass
 * walks what is already on disk and fetches whatever those files ask
 * for in turn, until nothing new is left.
 *
 *   node tools/close-3jcn.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'mirror', '3jcn');
const SHARED = path.join(OUT, 'shared');
const SCRATCH = path.join(ROOT, 'recon', 'scratch');
const CW = path.join(OUT, 'courseware');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/126 Safari/537.36';
const HOST = 'https://www.new3jcn.com';

const listFiles = (dir, base = dir) => {
  const out = [];
  let items = [];
  try {
    items = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const item of items) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) out.push(...listFiles(full, base));
    else out.push({ file: full, name: path.relative(base, full).split(path.sep).join('/') });
  }
  return out;
};

async function grab(url) {
  for (let i = 0; i < 4; i++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 45000);
      const res = await fetch(url, {
        headers: { 'user-agent': UA, referer: `${HOST}/` },
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (res.status === 503 || res.status === 429 || res.status === 502) {
        await new Promise((r) => setTimeout(r, 1200 * (i + 1)));
        continue;
      }
      if (!res.ok) return { status: res.status, body: '' };
      return { status: 200, body: await res.text() };
    } catch {
      await new Promise((r) => setTimeout(r, 900 * (i + 1)));
    }
  }
  return { status: 0, body: '' };
}

/* The address a mirrored file came from: the folder names the host. */
const remoteOf = (rel) => `https://${rel}`;
const localOf = (url) => {
  const u = new URL(url);
  return path.join(SHARED, u.host, ...u.pathname.replace(/^\//, '').split('/'));
};

const JS_IMPORTS = [
  /(?:from|import)\s*["']([^"'\n]{1,240})["']/g,
  /import\s*\(\s*["']([^"'\n]{1,240})["']\s*\)/g,
];
const CSS_IMPORTS = [
  /url\(\s*["']?([^"')]+)["']?\s*\)/gi,
  /@import\s+(?:url\()?\s*["']([^"')]+)["']/gi,
];

function refsOf(text, kind) {
  const out = new Set();
  const list = kind === 'css' ? CSS_IMPORTS : JS_IMPORTS;
  for (const re of list) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) {
      const v = m[1].trim();
      if (!v || v.startsWith('#') || v.startsWith('data:')) continue;
      if (/\s/.test(v)) continue;
      out.add(v);
    }
  }
  return [...out];
}

/* A short name inside a library: only three.js uses one. */
const isBare = (ref) => !/^[./]/.test(ref) && !/^https?:/i.test(ref);

const bare = [];
const wanted = new Map();

function note(url) {
  if (!wanted.has(url)) wanted.set(url, { url });
}

/* The three.js release a file of the library belongs to. */
const threeVersion = (url) => {
  const m = /unpkg\.com\/three@([\d.]+)\//.exec(url);
  return m ? m[1] : null;
};

const have = new Set();
for (const f of listFiles(SHARED)) have.add(f.name);
let added = 0;
let asked = 0;
const misses = [];

/*
 * 0. The sheets of work.  A page of the site offers a worksheet from a
 *    button, and the address of that button is written inside the code
 *    of the button, so the scan of the tags never sees it.  Those files
 *    are found here and fetched.
 */
const PAGES_DIR = path.join(SCRATCH, '3jcn-pages');
const PROGRAMS = fs.existsSync(path.join(SCRATCH, '3jcn-programs.json'))
  ? JSON.parse(fs.readFileSync(path.join(SCRATCH, '3jcn-programs.json'), 'utf8'))
  : [];
const PAGE_HOSTS = [
  'www.new3jcn.com',
  'new3jcn.com',
  'gwosc.org',
  'unpkg.com',
  'cdnjs.cloudflare.com',
  'cdn.jsdelivr.net',
  'threejs.org',
  'fonts.gstatic.com',
];
const DEAD = [];

const PAGE_REFS = [
  /(?:src|href)\s*=\s*["']([^"']+)["']/gi,
  /url\(\s*["']?([^"')]+)["']?\s*\)/gi,
  /(?:location\.href|window\.open)\s*[=(]\s*["']([^"']+)["']/gi,
  /["']([A-Za-z0-9_./-]+\.(?:pdf|docx?|xlsx?|pptx?|zip|mp3|wav|ogg|glb|gltf|hdr|jpg|jpeg|png|gif|svg|webp|json|txt|csv|mp4|webm))["']/gi,
];

for (const program of PROGRAMS) {
  const file = path.join(PAGES_DIR, `${program.slug}.html`);
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, 'utf8');
  const base = program.url;
  const seen = new Set();
  for (const re of PAGE_REFS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(html))) {
      const ref = m[1].trim();
      if (!ref || ref.startsWith('#') || ref.startsWith('data:')) continue;
      if (/\s/.test(ref)) continue;
      if (seen.has(ref)) continue;
      seen.add(ref);
      let abs;
      try {
        abs = new URL(ref, base).href;
      } catch {
        continue;
      }
      if (!/^https?:/i.test(abs)) continue;
      const u = new URL(abs);
      if (!PAGE_HOSTS.includes(u.host)) continue;
      /* A page that is another program is not a file. */
      if (u.host.endsWith('new3jcn.com') && /\.html?$/i.test(u.pathname)) continue;
      const rel = `${u.host}${u.pathname.replace(/^\//, '')}`;
      if (have.has(rel)) continue;
      note(u.href);
      const got = await fetchOne(u.href);
      if (got) {
        have.add(rel);
      } else {
        DEAD.push(u.href);
      }
    }
  }
}
if (DEAD.length) {
  fs.writeFileSync(
    path.join(SCRATCH, '3jcn-dead-links.json'),
    JSON.stringify([...new Set(DEAD)], null, 2)
  );
}
console.log(`worksheets asked for: ${[...wanted.keys()].length}, dead: ${new Set(DEAD).size}`);

/* 1. What the mirrored libraries ask for. */
const queue = [];
for (const f of listFiles(SHARED)) {
  if (!/\.(?:m?js|css)$/i.test(f.name)) continue;
  queue.push(f);
}

async function fetchOne(url) {
  const res = await grab(url);
  if (res.status !== 200) {
    misses.push(`${url} (${res.status})`);
    return null;
  }
  const file = localOf(url);
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, res.body, 'utf8');
  } catch {
    return null;
  }
  added++;
  return { file, text: res.body };
}

async function walkFile(rel, text, kind) {
  const base = remoteOf(rel);
  for (const ref of refsOf(text, kind)) {
    asked++;
    if (isBare(ref)) {
      bare.push({ rel, ref });
      continue;
    }
    let abs;
    try {
      abs = new URL(ref, base).href;
    } catch {
      continue;
    }
    if (!/^https?:/i.test(abs)) continue;
    const target = path.join(
      SHARED,
      new URL(abs).host,
      ...new URL(abs).pathname.replace(/^\//, '').split('/')
    );
    const relTarget = path
      .relative(SHARED, target)
      .split(path.sep)
      .join('/');
    if (have.has(relTarget)) continue;
    note(abs);
    const got = await fetchOne(abs);
    if (!got) continue;
    have.add(relTarget);
    queue.push({ name: relTarget, file: got.file });
    await walkFile(relTarget, got.text, /\.css$/i.test(relTarget) ? 'css' : 'js');
  }
}

for (const f of queue.slice()) {
  let text = '';
  try {
    text = fs.readFileSync(f.file, 'utf8');
  } catch {
    continue;
  }
  await walkFile(f.name, text, /\.css$/i.test(f.name) ? 'css' : 'js');
}

/* 2. The short names: three.js asks for its own core. */
const cores = new Set();
for (const { rel, ref } of bare) {
  if (ref !== 'three' && !ref.startsWith('three/')) continue;
  const v = threeVersion(remoteOf(rel));
  if (!v) continue;
  cores.add(v);
}
/* The pages that name a release in their import map need its core too. */
for (const f of listFiles(CW)) {
  let text = '';
  try {
    text = fs.readFileSync(f.file, 'utf8');
  } catch {
    continue;
  }
  for (const m of text.matchAll(/three@([\d.]+)\/build\/three\.module\.js/g)) {
    cores.add(m[1]);
  }
}
for (const v of cores) {
  const url = `https://unpkg.com/three@${v}/build/three.module.js`;
  const target = path.join(SHARED, 'unpkg.com', `three@${v}`, 'build', 'three.module.js');
  const rel = path.relative(SHARED, target).split(path.sep).join('/');
  if (have.has(rel)) continue;
  note(url);
  const got = await fetchOne(url);
  if (got) have.add(rel);
}

/* 3. The list of the shared library is written again. */
const indexFile = path.join(OUT, 'shared.json');
let index = [];
try {
  index = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
} catch {
  index = [];
}
const byUrl = new Map(index.map((e) => [e.url, e]));
for (const url of wanted.keys()) byUrl.set(url, byUrl.get(url) || { url });
const next = [...byUrl.values()];
for (const entry of next) {
  const target = localOf(entry.url);
  if (!entry.rel && fs.existsSync(target) && fs.statSync(target).isFile()) {
    entry.rel = path.relative(SHARED, target).split(path.sep).join('/');
    entry.bytes = fs.statSync(target).size;
    entry.file = path.relative(OUT, target).split(path.sep).join('/');
  }
}
next.sort((a, b) => a.url.localeCompare(b.url));
fs.writeFileSync(indexFile, JSON.stringify(next, null, 2));

console.log(`asked ${asked} times, fetched ${added} files`);
console.log(`short names: ${[...new Set(bare.map((b) => b.ref))].join(', ') || 'none'}`);
console.log(`three cores: ${[...cores].join(', ')}`);
if (misses.length) {
  console.log(`missed ${misses.length}:`);
  for (const m of misses.slice(0, 20)) console.log(`  ${m}`);
}
