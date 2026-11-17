#!/usr/bin/env node
/*
 * The pages that were cached next to a lesson.
 *
 * A lesson sometimes keeps a copy of a page it points at: the mirror
 * of a textbook chapter, a manual, a table of formulas.  Those copies
 * are read from disk, so the pictures they show have to sit next to
 * them as well — otherwise the page opens with an empty frame and a
 * teacher has no way of telling that from a broken lesson.
 *
 * This finds every address such a page asks for, checks whether the
 * file is already on this disk, and fetches the ones that are missing
 * into the very place the server and the archive expect them.
 *
 *   node tools/localize-ext-pages.mjs           # fetch what is missing
 *   node tools/localize-ext-pages.mjs --check   # only report
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');

/* The hosts whose pages may be cached next to a lesson. */
const HOSTS = [
  'images.szxuexiao.com',
  'zxkeben.szxuexiao.com',
  'keben.szxuexiao.com',
  'appsj.szxuexiao.com',
  'www.szxuexiao.com',
  'www.webassign.net',
  'science.clemson.edu',
  'www.mathopenref.com',
  'mathworld.wolfram.com',
  'www.mathsisfun.com',
  'mathcs.clarku.edu',
  'www.acs.org',
];

const walk = (dir, out = []) => {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
};

/* Every mirror holds lessons; every lesson may hold cached pages. */
const roots = [];
for (const dir of fs.readdirSync(path.join(ROOT, 'mirror'), { withFileTypes: true })) {
  if (!dir.isDirectory() || dir.name === 'leqixiang') continue;
  const folder = path.join(ROOT, 'mirror', dir.name, 'courseware');
  if (!fs.existsSync(folder)) continue;
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.endsWith('.assets')) continue;
    const ext = path.join(folder, entry.name, '_ext');
    if (fs.existsSync(ext)) roots.push(ext);
  }
}

const wanted = new Map(); // url -> local path
for (const root of roots) {
  for (const file of walk(root)) {
    if (!/\.(?:html?|js|mjs|css|json)$/i.test(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    for (const m of text.matchAll(/https?:\/\/([A-Za-z0-9.-]+)\/([^\s"'`)<>\\]+)/g)) {
      const host = m[1];
      if (!HOSTS.includes(host)) continue;
      const rel = m[2].split('?')[0].split('#')[0];
      if (!rel) continue;
      const target = path.join(root, host, rel);
      if (!wanted.has(m[0])) wanted.set(m[0], target);
    }
  }
}

const missing = [];
for (const [url, target] of wanted) {
  if (fs.existsSync(target)) continue;
  missing.push({ url, target });
}

console.log(`缓存页面引用的地址：${wanted.size}`);
console.log(`本机还缺：${missing.length}`);

if (!CHECK && missing.length) {
  let ok = 0;
  let bad = 0;
  for (const { url, target } of missing) {
    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = Buffer.from(await res.arrayBuffer());
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, data);
      ok++;
      if (ok % 10 === 0) console.log(`  已取回 ${ok} / ${missing.length}`);
    } catch (err) {
      bad++;
      console.log(`  取不到 ${url} —— ${err.message}`);
    }
  }
  console.log(`取回 ${ok} 个，取不到 ${bad} 个`);
}

for (const { url, target } of missing.slice(0, 40)) {
  console.log('  ' + url + '  →  ' + path.relative(ROOT, target).replace(/\\/g, '/'));
}
