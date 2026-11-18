#!/usr/bin/env node
/*
 * 把物理仿真课里写死的相对地址改成共用库里真正的位置。
 *
 * 那些课写着 "textures/ammeter.png"、"models/Boat.fbx" 这样的相对
 * 写法 —— 在原来的服务器上，这些文件就摆在根目录，浏览器是照着
 * 页面所在的位置去找的（这里就是 /courseware/），于是全都扑空。
 *
 * 共用库里其实都有，只是按科目分了目录（Phyc140、Phyc240……）。
 * 这里照着文件名在库里找一遍，找到就把地址改成库里的真位置；线上
 * 走 /api/program-assets/…/_ext/vendor/…，下载下来的压缩包里也是
 * 同一个相对位置，两边都对得上。
 *
 *   node tools/resolve-course-assets.mjs          # 查
 *   node tools/resolve-course-assets.mjs --fix    # 改
 */
import fs from 'node:fs';
import path from 'node:path';

const CW = 'mirror/leqixiang/courseware';
const CW_SRC = 'mirror/aifunengjiaoyu/courseware';
const VENDOR = 'mirror/leqixiang/_shared-ext/vendor';
const fix = process.argv.includes('--fix');

const listFiles = (dir, out = []) => {
  let es;
  try {
    es = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of es) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) listFiles(p, out);
    else out.push(p);
  }
  return out;
};

/* ---- the library, indexed ------------------------------------------- */

const vendorFiles = listFiles(VENDOR).map((p) => path.relative(VENDOR, p).split(path.sep).join('/'));
const byRel = new Set(vendorFiles);
const byBase = new Map();
for (const rel of vendorFiles) {
  const base = rel.slice(rel.lastIndexOf('/') + 1).toLowerCase();
  if (!byBase.has(base)) byBase.set(base, []);
  byBase.get(base).push(rel);
}

/* Which subject a course belongs to; the library is sorted the same way. */
function familyOf(id) {
  const m = id.match(/phyc(\d+)/i);
  if (m) return `Phyc${m[1]}`;
  if (/3jcn/i.test(id)) return '3jcn-labs';
  return '';
}

/**
 * Find the file the page is really asking for.
 * The name is known; where it sits in the library is not.
 */
function resolve(id, rel) {
  const clean = rel.replace(/^\/+/, '').split('?')[0].split('#')[0];
  if (!clean || clean.includes('..')) return null;
  if (byRel.has(clean)) return clean;

  const fam = familyOf(id);
  const dir = clean.includes('/') ? clean.slice(0, clean.lastIndexOf('/') + 1) : '';
  const segs = clean.split('/');
  const base = segs[segs.length - 1].toLowerCase();
  const hits = byBase.get(base) || [];
  if (!hits.length) return null;

  const score = (cand) => {
    const parts = cand.split('/');
    const parent = parts[parts.length - 2] || '';
    let s = 0;
    /*
     * The file has to sit where the page expects it: the last folders
     * of the name have to be the last folders of the place.  A page
     * that says "pond/duck/style.css" is not asking for the one
     * "style.css" that happens to be in the library.
     */
    const tail = parts.slice(-segs.length).join('/').toLowerCase();
    if (tail !== clean.toLowerCase()) {
      /*
       * A name on its own ("charged-plane.png") may sit in a folder of
       * the subject's own; that one is allowed to differ.
       */
      if (segs.length > 1) return -Infinity;
      if (!(fam && parts.includes(fam))) return -Infinity;
      s += 5;
    }
    if (fam && parts.includes(fam)) s += 60;
    if (parent.toLowerCase() === dir.slice(0, -1).toLowerCase()) s += 40;
    if (parts.length === 2) s += 10;
    s -= parts.length;
    return s;
  };
  const best = [...hits].sort((a, b) => score(b) - score(a));
  if (!best.length || score(best[0]) === -Infinity) return null;
  if (best.length > 1 && score(best[0]) === score(best[1])) return null;
  return best[0];
}

/* ---- the pages ------------------------------------------------------ */

const REF =
  /(["'(])((?:\.\.\/)?[A-Za-z0-9_.\-\/一-鿿]+\.(?:png|jpe?g|gif|webp|svg|bmp|obj|fbx|gltf|glb|mp3|mp4|wav|ogg|json|txt|css|js))\1/g;

let changed = 0;
let fixed = 0;
const seen = new Map();

function repairBody(file, id) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return;
  }
  const out = text.replace(REF, (m, q, rel) => {
    if (/^(?:https?:|data:|blob:|\/\/)/i.test(rel)) return m;
    /* A path relative to the page itself is already right. */
    if (rel.startsWith('./') || rel.startsWith('../')) return m;
    /* A path that already names the library is left alone. */
    if (rel.startsWith('/api/') || rel.startsWith('/_shared/')) return m;
    const hit = resolve(id, rel);
    if (!hit) return m;
    const abs = path.join(VENDOR, ...hit.split('/'));
    if (!fs.existsSync(abs)) return m;
    const to = `/api/program-assets/${id}/_ext/vendor/${hit}`;
    seen.set(`${rel} -> ${to}`, (seen.get(`${rel} -> ${to}`) || 0) + 1);
    fixed++;
    return q + to + q;
  });
  if (out !== text) {
    changed++;
    if (fix) fs.writeFileSync(file, out);
  }
}

for (const dir of [CW, CW_SRC]) {
  if (!fs.existsSync(dir)) continue;
  for (const name of fs.readdirSync(dir).filter((n) => n.endsWith('.html'))) {
    repairBody(path.join(dir, name), name.replace(/\.html$/, ''));
  }
}

for (const [k, n] of [...seen].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(3)}  ${k}`);
}
console.log(`\n改了 ${changed} 门课件；共 ${fixed} 处`);
