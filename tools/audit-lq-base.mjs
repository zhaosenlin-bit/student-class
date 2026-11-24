/*
 * A course that points its base at the platform's asset address asks for
 * its files relative to that address.  Check that the local copy can
 * answer them.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CW = path.join(ROOT, 'mirror', 'leqixiang', 'courseware');

const rows = [];
for (const name of fs.readdirSync(CW).filter((n) => n.endsWith('.html'))) {
  const id = name.replace(/\.html$/, '');
  const text = fs.readFileSync(path.join(CW, name), 'utf8');
  const m = text.match(/<base href="\/api\/program-assets\/[^"]*">/);
  if (!m) continue;
  const base = m[0];
  const tail = base.match(/\/api\/program-assets\/[A-Za-z0-9_\-]+\/t\/[A-Za-z0-9_\-]+\/?(.*?)">/);
  const under = tail ? tail[1] : '';
  const assets = path.join(CW, `${id}.assets`);

  /* The files the page names, relative to the base. */
  const wanted = new Set();
  for (const r of text.matchAll(/["'`](\.\/)?([A-Za-z0-9_\-][^"'`\s]*\.[A-Za-z0-9]{2,5})["'`]/g)) {
    if (/^https?:/.test(r[2]) || /^[a-z]+:[^/]/.test(r[2])) continue;
    if (/^[-\d.]+$/.test(r[2])) continue;
    wanted.add(r[2]);
  }
  const importMap = (text.match(/<script[^>]*type=["']importmap["'][^>]*>([\s\S]*?)<\/script>/i) || [])[1];
  if (importMap) {
    try {
      const map = JSON.parse(importMap).imports || {};
      for (const [prefix, target] of Object.entries(map)) {
        if (!target.startsWith('./')) continue;
        const dir = target.replace(/\/?$/, '/');
        for (const w of wanted) {
          if (prefix.endsWith('/') && w.startsWith(prefix)) wanted.add(dir + w.slice(prefix.length));
        }
      }
    } catch {}
  }

  const missing = [];
  for (const w of wanted) {
    const clean = w.replace(/^\.\//, '');
    if (!/[/.]/.test(clean)) continue;
    const atRoot = path.join(assets, clean);
    const underBase = path.join(assets, under, clean);
    if (!fs.existsSync(atRoot) && !fs.existsSync(underBase)) missing.push(clean);
  }
  rows.push({ id, under, wanted: [...wanted].length, missing });
}

const bad = rows.filter((r) => r.missing.length);
console.log(`courses with a platform base: ${rows.length}`);
console.log(`  of those, missing files: ${bad.length}`);
for (const r of bad) console.log(`  ${r.id.padEnd(12)} base-under=${r.under} missing: ${r.missing.join(', ')}`);

const withUnder = rows.filter((r) => r.under);
console.log(`\ncourses whose base points at a sub folder: ${withUnder.length}`);
for (const r of withUnder) console.log(`  ${r.id.padEnd(12)} ${r.under}`);
