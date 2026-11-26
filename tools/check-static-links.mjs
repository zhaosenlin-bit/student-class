#!/usr/bin/env node
/*
 * Do the links of the written-out site still lead somewhere?
 *
 * Every page of a copy that is put inside another site counts its
 * names from its own folder, so a name that is written from the root
 * of a site breaks the moment the copy is moved.  This looks at every
 * page of the copy, takes out the names that point at a file of the
 * copy, and asks whether that file is really there.
 *
 *   node tools/check-static-links.mjs --root dist
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const DIST = path.resolve(arg('root', path.join(ROOT, 'dist')));

const pages = [];
const walk = (dir) => {
  for (const it of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, it.name);
    if (it.isDirectory()) {
      if (it.name === '_ext') continue;
      walk(p);
    } else if (/\.html?$/i.test(it.name)) {
      pages.push(p);
    }
  }
};
walk(DIST);

const NAME =
  /(?:\bhref|\bsrc|\bposter|\baction)\s*=\s*["']([^"'\s>]{1,600})["']/gi;

const missing = [];
let checked = 0;
let outer = 0;
const kinds = new Map();
const note = (kind, key) => {
  const entry = kinds.get(kind) || { count: 0, keys: new Set() };
  entry.count += 1;
  if (entry.keys.size < 6) entry.keys.add(key);
  kinds.set(kind, entry);
};

for (const page of pages) {
  /*
   * A comment speaks about names; it does not use them.  So the
   * comments are taken away before the names are looked at.
   */
  const html = fs
    .readFileSync(page, 'utf8')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  /*
   * A page may say where its names are counted from; when it does,
   * that place is the one the names belong to.
   */
  const baseMatch = /<base\b[^>]*\bhref\s*=\s*["']([^"']+)["']/i.exec(html);
  const dir = baseMatch
    ? path.resolve(path.dirname(page), baseMatch[1])
    : path.dirname(page);
  let m;
  NAME.lastIndex = 0;
  while ((m = NAME.exec(html))) {
    let ref = m[1].trim();
    const attr = (/\b(href|src|data-src|poster|action)\s*=/i.exec(m[0]) || [])[1] || '?';
    if (!ref) continue;
    /* A name that a script fills in later is not a name yet. */
    if (/\{\{|\$\{/.test(ref)) continue;
    if (/^(?:https?:)?\/\//i.test(ref)) {
      outer += 1;
      continue;
    }
    if (/^(?:data:|blob:|about:|mailto:|tel:|javascript:|#)/i.test(ref)) continue;
    const hash = ref.indexOf('#');
    if (hash >= 0) ref = ref.slice(0, hash);
    if (!ref) continue;
    const query = ref.indexOf('?');
    if (query >= 0) ref = ref.slice(0, query);
    if (!ref) continue;
    /*
     * A name that stands at the root of a site names something that is
     * not in this copy — it is a name the copy cannot keep.
     */
    if (ref.startsWith('/')) {
      missing.push({ page: path.relative(DIST, page), ref, why: '根路径', kind: '根路径' });
      note('根路径', ref);
      continue;
    }
    let plain = ref;
    try {
      plain = decodeURIComponent(ref);
    } catch {
      /* a name that is not a code is already plain */
    }
    const target = path.resolve(dir, plain);
    if (!target.startsWith(DIST)) continue;
    checked += 1;
    let ok = false;
    try {
      ok = fs.existsSync(target) || fs.existsSync(path.join(target, 'index.html'));
    } catch {
      ok = false;
    }
    if (!ok) missing.push({ page: path.relative(DIST, page), ref, why: '文件不存在' });
    if (!ok) note('文件不存在', ref);
  }
}

console.log(`页面 ${pages.length} 个，检查了 ${checked} 个本地名字，站外 ${outer} 个`);
console.log(`走不通的 ${missing.length} 个`);
for (const [kind, entry] of kinds) {
  console.log(`   ${kind}：${entry.count} 次，例如 ${[...entry.keys].join(' , ')}`);
}
const byRef = new Map();
for (const x of missing) {
  const key = `${x.ref}`;
  const entry = byRef.get(key) || { count: 0, pages: new Set() };
  entry.count += 1;
  entry.pages.add(x.page);
  byRef.set(key, entry);
}
const top = [...byRef.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 25);
console.log('最常见的走不通的名字：');
for (const [ref, entry] of top) {
  console.log(`   ${entry.count} 次 / ${entry.pages.size} 个页面 -> ${ref}`);
}
const lessons = new Set();
for (const x of missing) {
  const parts = x.page.split(/[\\/]/);
  if (parts[0] === 'courseware' && parts[1]) lessons.add(parts[1]);
}
console.log(`受影响的课件 ${lessons.size} 门（共 ${pages.length} 个页面）`);
const seen = new Set();
for (const x of missing) {
  const key = x.page + '|' + x.ref;
  if (seen.has(key)) continue;
  seen.add(key);
  if (seen.size <= 25) console.log(`   ! ${x.page} -> ${x.ref} (${x.why})`);
}
console.log(`去重后 ${seen.size} 个`);
process.exit(seen.size ? 1 : 0);
