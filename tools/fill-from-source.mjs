#!/usr/bin/env node
/*
 * 把最后还缺着的文件从原站取回来。
 *
 * 目录里记着每一门课在原站的地址，那些课里写着的相对写法
 * （"textures/elevator-out.png"）放到原站上就是另一个地址。
 * 这里照着原站的地址把缺的文件一个个要回来，存进共用库；
 * 线上、离线、下载下来的压缩包都指得到同一处。
 *
 *   node tools/fill-from-source.mjs          # 查
 *   node tools/fill-from-source.mjs --fetch  # 取
 */
import fs from 'node:fs';
import path from 'node:path';

const CW = 'mirror/leqixiang/courseware';
const VENDOR = 'mirror/leqixiang/_shared-ext/vendor';
const CATALOG = 'mirror/3jcn/catalog.json';
const fetchIt = process.argv.includes('--fetch');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const slug = (s) =>
  s
    .toLowerCase()
    .replace(/\.html$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/* local id -> the page it came from */
const sourceOf = new Map();
try {
  const cat = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
  for (const p of cat.products || cat) {
    const url = p.sourceUrl || p.source;
    if (!url) continue;
    const key = p.slug || slug(new URL(url).pathname);
    if (!sourceOf.has(key)) sourceOf.set(key, url);
  }
} catch {
  console.log('没有目录文件，改用通用地址');
}

/* The shared library already has these under a name of their own. */
const vendorFiles = new Set();
{
  const walk = (d) => {
    let es;
    try {
      es = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of es) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else vendorFiles.add(path.relative(VENDOR, p).split(path.sep).join('/').toLowerCase());
    }
  };
  walk(VENDOR);
}

const REF =
  /(["'(])((?:\.\.\/)?[A-Za-z0-9_.\-\/一-鿿]+\.(?:png|jpe?g|gif|webp|svg|bmp|obj|fbx|gltf|glb|mp3|mp4|wav|ogg|json|txt|css|js|wasm))\1/g;

const ROOT_REFS = new Set([
  'models/Boat.fbx',
  'models/table/table.obj',
  'models/cat/Cat_Export.obj',
  'models/simple-flash/scene.gltf',
  'models/dancer/scene.gltf',
  'models/spaceship/scene.gltf',
  'textures/smoke.png',
  'PBlanco/models/mustang.js',
]);

const jobs = new Map();

/* root-level names: they sat at the root of the original server */
for (const rel of ROOT_REFS) {
  jobs.set(rel, {
    candidates: [
      `https://www.new3jcn.com/${rel}`,
      `http://www.new3jcn.com/${rel}`,
    ],
    into: rel,
  });
}

/* course-relative names: they sat next to the page that asked for them */
for (const name of fs.readdirSync(CW).filter((n) => n.endsWith('.html'))) {
  const id = name.replace(/\.html$/, '');
  const source =
    sourceOf.get(id.replace(/^lab-/, '')) ||
    sourceOf.get(slug(id.replace(/^lab-/, '')));
  if (!source) continue;
  let text;
  try {
    text = fs.readFileSync(path.join(CW, name), 'utf8');
  } catch {
    continue;
  }
  for (const m of text.matchAll(REF)) {
    const rel = m[2];
    if (/^(?:https?:|data:|blob:|\/\/)/i.test(rel)) continue;
    if (rel.startsWith('./') || rel.startsWith('../')) continue;
    let abs;
    try {
      abs = new URL(rel, source);
    } catch {
      continue;
    }
    if (abs.host !== 'www.new3jcn.com' && abs.host !== 'new3jcn.com') continue;
    const pathIn = abs.pathname.replace(/^\/+/, '');
    /* Only the shared folders are ours to fill. */
    if (!/^(?:Phyc\d+|Simulation|mechanics|models|textures|PBlanco|quantum-mechanics|electricity-magnetism|Cloth|Audio|pictures|video)\//i.test(pathIn))
      continue;
    const into = pathIn.replace(/^(?:www\.)?new3jcn\.com\//, '');
    if (vendorFiles.has(into.toLowerCase())) continue;
    if (jobs.has(into)) continue;
    jobs.set(into, {
      candidates: [
        `https://www.new3jcn.com/${into}`,
        `http://www.new3jcn.com/${into}`,
      ],
      into,
    });
  }
}

console.log(`还缺 ${jobs.size} 个文件`);
if (!fetchIt) {
  for (const [rel, j] of [...jobs].sort()) console.log(`  ${rel}`);
  process.exit(0);
}

let ok = 0;
let no = 0;
for (const [rel, job] of jobs) {
  let got = null;
  for (const url of job.candidates) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: '*/*' },
        redirect: 'follow',
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (!buf.length) continue;
      const type = String(res.headers.get('content-type') || '');
      if (/^text\/html/i.test(type) && !/\.html?$/i.test(job.into)) continue;
      got = buf;
      break;
    } catch {
      /* try the next address */
    }
  }
  if (!got) {
    no++;
    console.log(`  取不到 ${rel}`);
    continue;
  }
  const file = path.join(VENDOR, ...job.into.split('/'));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, got);
  ok++;
  console.log(`  取回 ${rel}  ${got.length} 字节`);
}

console.log(`\n取回 ${ok}，取不到 ${no}`);
