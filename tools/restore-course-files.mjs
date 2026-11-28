#!/usr/bin/env node
/*
 * Put back into a lesson the files the browser could not find.
 *
 * When the same material is kept once for the whole library, a lesson
 * sometimes goes looking for it by the name it had before it was
 * gathered in.  The browser then says the file is not there, and the
 * lesson opens with a hole in it.
 *
 * The file that is put back is the very same file that is kept for the
 * library — the same bytes, not a copy that looks like it.  The list of
 * what the lesson hands over when it is downloaded is told about it
 * too, so that the copy a reader keeps is whole.
 *
 *   node tools/restore-course-files.mjs --root dist --receipts receipts/course-health-local.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d;
};
const ROOT = path.resolve(arg('root', path.join(HERE, '..', 'dist')));
const SHARED = path.join(ROOT, 'shared');
const RECEIPTS = arg('receipts', path.join(HERE, '..', 'receipts', 'course-health-local.json'));
const DRY = args.includes('--dry');

if (!fs.existsSync(ROOT)) {
  console.error('没有找到成品：' + ROOT);
  process.exit(1);
}
if (!fs.existsSync(RECEIPTS)) {
  console.error('没有找到验收记录：' + RECEIPTS);
  process.exit(1);
}

/* Everything the library keeps, by the path it is known under. */
const shared = new Map();
(function walk(dir, rel = '') {
  for (const it of fs.readdirSync(dir, { withFileTypes: true })) {
    const r = rel ? rel + '/' + it.name : it.name;
    const abs = path.join(dir, it.name);
    if (it.isDirectory()) walk(abs, r);
    else shared.set(r, abs);
  }
})(SHARED);

/* The same file may be kept under a name of its own; find it by the tail. */
function findBySuffix(suffix) {
  const hits = [];
  for (const [rel, abs] of shared) {
    if (rel === suffix || rel.endsWith('/' + suffix)) hits.push(abs);
  }
  hits.sort((a, b) => a.length - b.length);
  return hits[0] || null;
}

const data = JSON.parse(fs.readFileSync(RECEIPTS, 'utf8'));

/* The record says which lesson asked for which file and did not get it. */
const wanted = new Map();
for (const course of data.bad || data.failures || []) {
  const lines = [];
  for (const b of course.bad || []) {
    if (String(b.status) === 'failed') continue;
    lines.push(String(b.url || ''));
  }
  for (const why of course.failed || []) {
    const m = /^(?:404|403|500)\s+\/courseware\/([^/]+)\/(.+)$/.exec(why);
    if (m) lines.push(`/courseware/${m[1]}/${m[2]}`);
  }
  for (const url of lines) {
    const m = /\/courseware\/([^/]+)\/(.+)$/.exec(url);
    if (!m) continue;
    const [, id, rel] = m;
    if (!wanted.has(id)) wanted.set(id, new Set());
    wanted.get(id).add(decodeURIComponent(rel.split('?')[0]));
  }
}

if (!wanted.size) {
  console.log('验收记录里没有缺文件的课件。');
  process.exit(0);
}

let restored = 0;
let notFound = 0;
let bytes = 0;
const unresolved = [];

for (const [id, files] of wanted) {
  const dir = path.join(ROOT, 'courseware', id);
  const manifestPath = path.join(dir, 'download.json');
  let manifest = null;
  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch {
      manifest = null;
    }
  }
  for (const rel of files) {
    const target = path.join(dir, rel);
    if (fs.existsSync(target)) continue;

    /*
     * The file the lesson had before it was gathered in is the one the
     * library still keeps under the same tail.
     */
    const tail = rel.replace(/^.*?_ext\//, '_ext/');
    let source = null;
    if (manifest && Array.isArray(manifest.entries)) {
      for (const entry of manifest.entries) {
        const p = String((entry && entry[1]) || '');
        if (!p) continue;
        if (!p.endsWith(tail) && !p.endsWith(rel)) continue;
        const abs = path.resolve(dir, p);
        if (abs.startsWith(ROOT + path.sep) && fs.existsSync(abs)) {
          source = abs;
          break;
        }
      }
    }
    if (!source) source = shared.get(rel) || findBySuffix(tail);
    if (!source || !fs.existsSync(source)) {
      notFound++;
      unresolved.push(`${id} ${rel}`);
      continue;
    }
    if (DRY) {
      console.log(`会放回 ${id} ${rel}`);
      restored++;
      continue;
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    /*
     * The same bytes, and the same file on disk: a hard link keeps the
     * library from growing by a second copy of the same material.
     */
    try {
      fs.linkSync(source, target);
    } catch {
      fs.copyFileSync(source, target);
    }
    bytes += fs.statSync(target).size;
    restored++;

    if (manifest && Array.isArray(manifest.entries)) {
      const clean = rel.replace(/\\/g, '/');
      const known = manifest.entries.findIndex(
        (e) => Array.isArray(e) && path.posix.normalize(String(e[1] || '')) === clean
      );
      if (known >= 0) manifest.entries[known] = [clean, clean];
      else manifest.entries.push([clean, clean]);
    }
  }
  if (!DRY && manifest && Array.isArray(manifest.entries)) {
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  }
}

if (DRY) {
  console.log(`\n会放回 ${restored} 个文件，另有 ${notFound} 个找不到。`);
} else {
  console.log(
    `放回 ${restored} 个文件（${(bytes / 1024 / 1024).toFixed(1)} MB），另有 ${notFound} 个找不到。`
  );
  for (const u of unresolved.slice(0, 20)) console.log('  找不到：' + u);
  console.log('下载清单也一并补上了。');
}
