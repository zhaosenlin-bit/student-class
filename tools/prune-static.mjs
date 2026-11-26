#!/usr/bin/env node
/*
 * Takes away the lessons that do not open.
 *
 * A lesson is only worth keeping if a reader can open it, see it and
 * take it away.  A lesson that stays in the copy of the library and
 * cannot be opened is a hole in it: the directory promises a lesson
 * and the reader finds nothing.
 *
 * This reads the report of the last acceptance run and takes away
 * every lesson in it: the lesson leaves the directory, the folder of
 * its files goes with it, and the list of what the library holds is
 * written again without it.
 *
 *   node tools/prune-static.mjs --site dist --receipts receipts/static-site.json
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
const SITE = path.resolve(ROOT, arg('site', 'dist'));
const RECEIPTS = arg('receipts', '');
const EVERY = args.includes('--every');

if (!RECEIPTS) {
  console.error('要用 --receipts 指明验收记录。');
  process.exit(1);
}

const receipts = JSON.parse(fs.readFileSync(path.resolve(ROOT, RECEIPTS), 'utf8'));

/*
 * A lesson that cannot be shown is a hole in the library and goes.
 * A lesson that shows but has one picture missing is not: the reader
 * still gets a lesson, and the missing picture is fixed where it can
 * be fixed.  So only the lessons with nothing to show are taken.
 */
function dead(f) {
  return (f.failed || []).some((line) =>
    /课件没有画面|index\.html|no browser|跑出目录/.test(line)
  );
}

const failures = receipts.failures || [];
const broken = new Set(
  (EVERY ? failures : failures.filter(dead)).map((f) => f.id)
);
const spared = failures.filter((f) => !broken.has(f.id));
if (!broken.size) {
  console.log('没有需要拿走的课件。');
  process.exit(0);
}

/* The directory of the library. */
const catalogFile = path.join(SITE, 'catalog.json');
const catalog = JSON.parse(fs.readFileSync(catalogFile, 'utf8'));
const before = catalog.products.length;
catalog.products = catalog.products.filter((p) => !broken.has(p.id));
fs.writeFileSync(catalogFile, JSON.stringify(catalog));

/* The list of what the library holds. */
const coursesFile = path.join(SITE, 'courses.json');
if (fs.existsSync(coursesFile)) {
  const courses = JSON.parse(fs.readFileSync(coursesFile, 'utf8'));
  courses.courses = (courses.courses || []).filter((c) => !broken.has(c.id));
  courses.count = courses.courses.length;
  fs.writeFileSync(coursesFile, JSON.stringify(courses));
}

/* The folders of the lessons that are gone. */
let folders = 0;
for (const id of broken) {
  const dir = path.join(SITE, 'courseware', id);
  if (!fs.existsSync(dir)) continue;
  fs.rmSync(dir, { recursive: true, force: true });
  folders++;
}

console.log(
  `拿走了 ${broken.size} 门课件（目录 ${before} -> ${catalog.products.length}），` +
    `清掉了 ${folders} 个文件夹。`
);
for (const id of broken) console.log('  -', id);
if (spared.length) {
  console.log(`留下了 ${spared.length} 门仍有问题、但还能打开的课件。`);
  for (const f of spared) console.log('  *', f.id, (f.failed || []).join('；'));
}
