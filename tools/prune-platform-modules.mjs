#!/usr/bin/env node
/*
 * Takes away the shop's own machinery from the lessons.
 *
 * A lesson that was made on a platform comes with the platform's
 * shop window attached: the price list, the membership papers, the
 * invoices, the back office, the points wallet, and the whole
 * application that ties them together.  None of that is part of the
 * lesson.  None of it is ever asked for.  But it is written into
 * the folder, it is listed in the manifest that says what a reader
 * takes away, and it goes out over the network with every download.
 *
 * This removes exactly those files, and rewrites the manifests so
 * the list a reader gets matches the folder that is really there.
 * Nothing else is touched: the files that carry the lesson stay.
 *
 *   node tools/prune-platform-modules.mjs --root dist
 *   node tools/prune-platform-modules.mjs --root dist --archive ../archive/platform
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isPlatformFile } from './platform-files.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const ROOT = path.resolve(arg('root', path.join(HERE, '..', 'dist')));
const ARCHIVE = arg('archive', '');
const DRY = args.includes('--dry');
const LIST = args.includes('--list');

/*
 * The lessons live under courseware/, and the shared pool of assets
 * lives one level up under shared/assets/.  Both are addressed by
 * the same names, because one is the copy that goes with a lesson
 * and the other is the copy the lessons share.
 */
const walk = (dir, out = []) => {
  let items = [];
  try {
    items = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const it of items) {
    const full = path.join(dir, it.name);
    if (it.isDirectory()) walk(full, out);
    else if (it.isFile()) out.push(full);
  }
  return out;
};

const copyToArchive = (file, rel) => {
  if (!ARCHIVE) return;
  const dest = path.join(ARCHIVE, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(file, dest);
};

let removedFiles = 0;
let removedBytes = 0;
const removedByLesson = new Map();
const removedNames = [];

/*
 * The lessons each carry their own copy of the platform's files, so
 * the name is taken relative to the lesson.
 */
const courseware = path.join(ROOT, 'courseware');
if (fs.existsSync(courseware)) {
  for (const lesson of fs.readdirSync(courseware)) {
    const dir = path.join(courseware, lesson);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const file of walk(dir)) {
      const rel = path.relative(dir, file).split(path.sep).join('/');
      if (!isPlatformFile(rel)) continue;
      const size = fs.statSync(file).size;
      removedFiles++;
      removedBytes += size;
      removedByLesson.set(lesson, (removedByLesson.get(lesson) || 0) + 1);
      removedNames.push(`courseware/${lesson}/${rel}`);
      copyToArchive(file, path.join('courseware', lesson, rel));
      if (!DRY) fs.rmSync(file);
    }
  }
}

/*
 * The shared pool holds the same files once for all the lessons that
 * use them.  A lesson that keeps its own copy points its manifest at
 * that copy; a lesson that shares points at the pool.  Both are
 * named the same way inside the file a reader takes away, so the
 * rule is written once and used for both.
 */
const sharedPool = path.join(ROOT, 'shared', 'assets');
if (fs.existsSync(sharedPool)) {
  for (const file of walk(sharedPool)) {
    const rel = `assets/${path.relative(sharedPool, file).split(path.sep).join('/')}`;
    if (!isPlatformFile(rel)) continue;
    const size = fs.statSync(file).size;
    removedFiles++;
    removedBytes += size;
    removedByLesson.set('shared/assets', (removedByLesson.get('shared/assets') || 0) + 1);
    removedNames.push(`shared/assets/${path.relative(sharedPool, file).split(path.sep).join('/')}`);
    copyToArchive(file, path.join('shared', 'assets', path.relative(sharedPool, file)));
    if (!DRY) fs.rmSync(file);
  }
}

/* The empty folders the files were in go as well. */
if (!DRY) {
  for (const base of [courseware, sharedPool]) {
    if (!fs.existsSync(base)) continue;
    for (const sub of ['assets/premium-catalogue', 'assets/finance', 'assets/invoices', 'premium-catalogue', 'finance', 'invoices']) {
      const p = path.join(base, sub);
      try {
        if (fs.existsSync(p) && fs.readdirSync(p).length === 0) fs.rmdirSync(p);
      } catch {
        /* a folder that will not go is not worth stopping for */
      }
    }
  }
}

/*
 * The manifest says what a reader takes away.  If a file is no
 * longer in the folder, it must not be in the list either.
 */
let manifests = 0;
let manifestEntries = 0;
if (fs.existsSync(courseware)) {
  for (const lesson of fs.readdirSync(courseware)) {
    const dj = path.join(courseware, lesson, 'download.json');
    if (!fs.existsSync(dj)) continue;
    const manifest = JSON.parse(fs.readFileSync(dj, 'utf8'));
    const before = manifest.entries.length;
    const kept = manifest.entries.filter(
      ([name]) => !isPlatformFile(String(name).split('/').join('/'))
    );
    if (kept.length === before) continue;
    manifest.entries = kept;
    manifest.single = kept.length === 1;
    manifests++;
    manifestEntries += before - kept.length;
    if (!DRY) {
      fs.writeFileSync(dj, JSON.stringify(manifest));
    }
  }
}

const mb = (n) => (n / 1024 / 1024).toFixed(2);
console.log(ROOT);
console.log(`  拿走的文件      ${removedFiles} 个（${mb(removedBytes)} MB）`);
console.log(`  改写的清单      ${manifests} 份，少了 ${manifestEntries} 条`);
if (removedByLesson.size) {
  console.log('');
  for (const [lesson, n] of [...removedByLesson].sort()) {
    console.log(`    ${lesson}  ${n} 个`);
  }
}
if (LIST) {
  console.log('');
  for (const name of removedNames.sort()) {
    console.log(`    ${name}`);
  }
}
if (ARCHIVE) {
  console.log('');
  console.log('归档到', ARCHIVE);
}
