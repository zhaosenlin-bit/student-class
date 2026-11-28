#!/usr/bin/env node
/*
 * Take a lesson out of the library.
 *
 * A lesson is only worth keeping if a reader can open it, see it and
 * take it away.  Some lessons are missing the part that carries the
 * lesson itself — the ground the map is drawn on, or the text the
 * reader is meant to read — and nothing can be done about that from
 * the files that are left.  Such a lesson is a hole in the library:
 * the list promises a lesson and the reader finds an empty stage.
 *
 * This takes the lesson out of the list, out of the folder of lessons,
 * and out of the copy that was kept of the original site, so that it
 * does not come back the next time the library is written out.
 *
 *   node tools/remove-course.mjs --site dist --mirror mirror --course lq-842,lq-1016
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const SITE = path.resolve(ROOT, arg('site', 'dist'));
const MIRROR = path.resolve(ROOT, arg('mirror', 'mirror'));
const CATALOG = path.resolve(ROOT, arg('catalog', 'catalog/catalog.json'));
const IDS = arg('course', '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

if (!IDS.length) {
  console.error('要用 --course 指明要拿走的课件。');
  process.exit(1);
}

/* The list of what the library holds. */
const catalogFile = path.join(SITE, 'catalog.json');
const catalog = JSON.parse(fs.readFileSync(catalogFile, 'utf8'));
const before = catalog.products.length;
const gone = new Set(IDS);
const kept = catalog.products.filter((p) => !gone.has(p.id));
const taken = catalog.products.filter((p) => gone.has(p.id)).map((p) => p.id);
catalog.products = kept;
fs.writeFileSync(catalogFile, JSON.stringify(catalog));

const coursesFile = path.join(SITE, 'courses.json');
if (fs.existsSync(coursesFile)) {
  const courses = JSON.parse(fs.readFileSync(coursesFile, 'utf8'));
  courses.courses = (courses.courses || []).filter((c) => !gone.has(c.id));
  courses.count = courses.courses.length;
  fs.writeFileSync(coursesFile, JSON.stringify(courses));
}

/* The list the repository keeps, so that it does not bring the lesson back. */
let catalogList = 0;
if (fs.existsSync(CATALOG)) {
  const list = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
  const before = list.products.length;
  list.products = list.products.filter((p) => !gone.has(p.id));
  catalogList = before - list.products.length;
  fs.writeFileSync(CATALOG, JSON.stringify(list));
}

/* The folders of the lessons that are gone. */
let folders = 0;
let bytes = 0;
const size = (dir) => {
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) total += size(p);
    else total += fs.statSync(p).size;
  }
  return total;
};
for (const id of IDS) {
  const dir = path.join(SITE, 'courseware', id);
  if (!fs.existsSync(dir)) continue;
  bytes += size(dir);
  fs.rmSync(dir, { recursive: true, force: true });
  folders += 1;
}

/* The copy that was kept of the original site. */
let mirrors = 0;
for (const id of IDS) {
  const number = id.replace(/^lq-/, '');
  for (const name of [`${number}.assets`, `${number}.html`]) {
    const p = path.join(MIRROR, 'studio', 'courseware', name);
    if (fs.existsSync(p)) {
      fs.rmSync(p, { recursive: true, force: true });
      mirrors += 1;
    }
  }
}

console.log(
  `拿走了 ${taken.length} 门课件（目录 ${before} -> ${kept.length}），` +
    `清掉了 ${folders} 个文件夹（${(bytes / 1024 / 1024).toFixed(1)} MB）、` +
    `${mirrors} 份留底、目录数据 ${catalogList} 条。`
);
for (const id of taken) console.log('  -', id);
