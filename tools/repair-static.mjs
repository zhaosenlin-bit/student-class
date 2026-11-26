#!/usr/bin/env node
/*
 * Puts back the files that a lesson asks for while it runs.
 *
 * A lesson that is opened from a folder of files asks for the files
 * it needs by the names it knows.  Most of those names are written
 * down in the lesson, and they are found when the copy is made.  A
 * few are put together while the lesson runs — a folder it keeps in
 * one place and a picture it names in another — and those names are
 * nowhere in the text of the lesson.
 *
 * This reads the list of the names the browser could not find, looks
 * for each of them in the library, and puts the file where the
 * browser asked for it.  The file is also written into the list that
 * says what the lesson is handed over as, so that a reader who takes
 * the lesson away has it as well.
 *
 *   node tools/repair-static.mjs --site work/dist-test --receipts receipts/full.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LQ = path.join(ROOT, 'mirror', 'leqixiang');
const SHARED = path.join(LQ, '_shared-ext');
const SHARED_ROOT = path.join(LQ, '_shared-root');

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const SITE = path.resolve(ROOT, arg('site', 'dist'));
const RECEIPTS = arg('receipts', '');

const isFile = (p) => {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
};
const isDir = (p) => {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
};

let families = [];
try {
  families = fs
    .readdirSync(path.join(SHARED, 'vendor'), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
} catch {
  families = [];
}

/*
 * The very same picture, spelled a little differently on the disk: a
 * hyphen where the disk has none, or the letters in another order.
 * The folder is looked at as a whole, so nothing is guessed and
 * nothing outside the folder is ever reached.
 */
const RELAXED = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'jfif', 'webp',
  'svg', 'mp3', 'wav', 'ogg', 'mp4', 'woff', 'woff2', 'ttf',
]);

/*
 * A picture that is asked for under one name and kept under another
 * is copied over and made to be the kind of picture it is asked for,
 * so that the browser is not given one kind of picture under the name
 * of another.
 */
const PICTURES = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp']);
function isPicture(name) {
  const dot = name.lastIndexOf('.');
  return dot > 0 && PICTURES.has(name.slice(dot + 1).toLowerCase());
}
const CONVERT = [
  'import sys',
  'from PIL import Image',
  'src, dst = sys.argv[1], sys.argv[2]',
  'im = Image.open(src)',
  'ext = dst.lower().rsplit(".", 1)[-1]',
  'if ext in ("jpg", "jpeg"):',
  '    im.convert("RGB").save(dst, optimize=True, quality=88)',
  'elif ext == "png":',
  '    if im.mode == "RGBA":',
  '        im.save(dst, optimize=True)',
  '    else:',
  '        im.convert("RGB").quantize(colors=256, method=Image.MEDIANCUT).save(dst, optimize=True)',
  'elif ext == "gif":',
  '    im.convert("P").save(dst, optimize=True)',
  'else:',
  '    im.save(dst)',
].join('\n');
function placePicture(from, to) {
  const a = from.slice(from.lastIndexOf('.') + 1).toLowerCase();
  const b = to.slice(to.lastIndexOf('.') + 1).toLowerCase();
  if (a === b) {
    fs.copyFileSync(from, to);
    return true;
  }
  try {
    execFileSync('python', ['-c', CONVERT, from, to], { stdio: 'ignore' });
    return true;
  } catch {
    fs.copyFileSync(from, to);
    return false;
  }
}
function nameKey(name) {
  const dot = name.lastIndexOf('.');
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
  return {
    stem: stem.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, ''),
    ext,
    loose: RELAXED.has(ext),
  };
}

function nearFile(dir, want) {
  const slash = want.lastIndexOf('/');
  const wantDir = slash >= 0 ? want.slice(0, slash) : '';
  const wantBase = slash >= 0 ? want.slice(slash + 1) : want;
  const key = nameKey(wantBase);
  if (!key.stem) return null;
  const folder = wantDir ? path.join(dir, wantDir) : dir;
  let list = [];
  try {
    list = fs.readdirSync(folder);
  } catch {
    return null;
  }
  for (const entry of list) {
    const other = nameKey(entry);
    if (other.stem !== key.stem) continue;
    if (other.ext !== key.ext && !(other.loose && key.loose)) continue;
    const hit = path.join(folder, entry);
    if (isFile(hit)) return hit;
  }
  return null;
}

/* The names a missing file may really have. */
function candidates(rel) {
  const out = [rel];
  const add = (name) => {
    if (name && !out.includes(name)) out.push(name);
  };
  if (rel.startsWith('assets/assets/')) add(rel.slice('assets/'.length));
  if (rel.startsWith('assets/')) add(rel.slice('assets/'.length));
  if (rel.startsWith('_ext/')) add(rel.slice('_ext/'.length));
  if (rel.startsWith('assets/_ext/')) add(rel.slice('assets/_ext/'.length));
  if (rel.startsWith('assets/') && rel.slice(7).startsWith('assets/')) {
    add(rel.slice(7));
  }
  return out;
}

/* The file a name stands for, in the library. */
function findFile(rel, id) {
  for (const name of candidates(rel)) {
    const tries = [];
    if (id) tries.push(path.join(LQ, 'courseware', `${id}.assets`, name));
    tries.push(path.join(SHARED, name));
    tries.push(path.join(SHARED, 'vendor', name));
    for (const family of families) {
      tries.push(path.join(SHARED, 'vendor', family, name));
    }
    tries.push(path.join(SHARED_ROOT, name));
    for (const file of tries) {
      if (isFile(file)) return file;
    }
    /* The same file, spelled a little differently. */
    const dirs = [];
    if (id) dirs.push(path.join(LQ, 'courseware', `${id}.assets`));
    dirs.push(path.join(SHARED, 'vendor'));
    for (const family of families) {
      dirs.push(path.join(SHARED, 'vendor', family));
    }
    for (const dir of dirs) {
      const hit = nearFile(dir, name);
      if (hit) return hit;
    }
  }
  return null;
}

/*
 * A work often builds the name of a file while it runs, so the name is
 * nowhere in the text of the work.  Such a name is looked for in the
 * library by the tail of it: the last folders and the name of the file
 * are the same ones the work had in mind, even though the work
 * counted them from another place.
 */
const indexCache = new Map();
function indexOf(dir) {
  if (indexCache.has(dir)) return indexCache.get(dir);
  const index = new Map();
  const walk = (root, base = '') => {
    let list = [];
    try {
      list = fs.readdirSync(root, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of list) {
      const full = path.join(root, entry.name);
      const rel = base ? `${base}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(full, rel);
        continue;
      }
      if (!index.has(rel)) index.set(rel, full);
    }
  };
  walk(dir);
  indexCache.set(dir, index);
  return index;
}

/* The file whose name ends the way the name in the work ends. */
function byTail(rel, id) {
  const dirs = [];
  if (id) dirs.push(path.join(LQ, 'courseware', `${id}.assets`));
  dirs.push(SHARED);
  dirs.push(path.join(SHARED, 'vendor'));
  dirs.push(SHARED_ROOT);
  const parts = rel.split('/').filter(Boolean);
  for (const dir of dirs) {
    const index = indexOf(dir);
    for (let k = parts.length; k >= 2; k--) {
      const suffix = parts.slice(parts.length - k).join('/');
      const hit = index.get(suffix);
      if (hit) return hit;
    }
  }
  return null;
}

/* The list of what a lesson is handed over as. */
function readManifest(dir) {
  const file = path.join(dir, 'download.json');
  if (!isFile(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function addToManifest(dir, name) {
  const manifest = readManifest(dir);
  if (!manifest) return false;
  if (manifest.entries.some((e) => e[0] === name)) return false;
  manifest.entries.push([name, name]);
  fs.writeFileSync(path.join(dir, 'download.json'), JSON.stringify(manifest));
  return true;
}

let receipts = [];
for (const file of RECEIPTS.split(',').map((s) => s.trim()).filter(Boolean)) {
  const full = path.resolve(ROOT, file);
  if (!isFile(full)) continue;
  const data = JSON.parse(fs.readFileSync(full, 'utf8'));
  receipts.push(...(data.failures || []));
}

const done = new Map();
let repaired = 0;
let hopeless = 0;
/* Courses whose pictures are asked for under one kind of name. */
const wantedKind = new Map();

for (const failure of receipts) {
  const id = failure.id;
  for (const why of failure.failed || []) {
    const m = /^404\s+(\S+)/.exec(why);
    if (!m) continue;
    const url = m[1];
    /* The address of the missing file, counted from the site. */
    const inSite = url.replace(/^\/?/, '');
    const inside = /^courseware\/([A-Za-z0-9_-]+)\/(.+)$/.exec(inSite);
    if (!inside) continue;
    const [, course, rel] = inside;
    const file = findFile(rel, course) || byTail(rel, course);
    if (!file) {
      hopeless++;
      console.log(`  ! ${course} ${rel} — 库里没有这个文件`);
      continue;
    }
    const to = path.join(SITE, 'courseware', course, rel);
    if (!isFile(to)) {
      fs.mkdirSync(path.dirname(to), { recursive: true });
      if (isPicture(rel) && isPicture(file)) {
        placePicture(file, to);
        /*
         * The lesson asks for its pictures under one kind of name,
         * while the folder keeps them under another.  All of them are
         * made the kind that is asked for, so that the ones that are
         * shown later are found as well.
         */
        const ext = rel.slice(rel.lastIndexOf('.') + 1).toLowerCase();
        if (ext !== file.slice(file.lastIndexOf('.') + 1).toLowerCase()) {
          wantedKind.set(course, ext);
        }
      } else {
        fs.copyFileSync(file, to);
      }
      addToManifest(path.join(SITE, 'courseware', course), rel);
      repaired++;
      done.set(`${course} ${rel}`, true);
    }
  }
}

/*
 * The pictures of a lesson that are asked for under one kind of name
 * are all made that kind, so that the lesson is shown whole and not
 * with holes in it.
 */
for (const [course, ext] of wantedKind) {
  const dir = path.join(SITE, 'courseware', course, 'assets');
  let list = [];
  try {
    list = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    continue;
  }
  for (const entry of list) {
    if (!entry.isFile()) continue;
    const name = entry.name;
    if (!isPicture(name)) continue;
    const from = path.join(dir, name);
    const to = path.join(dir, `${name.slice(0, name.lastIndexOf('.'))}.${ext}`);
    if (fs.existsSync(to)) continue;
    if (!placePicture(from, to)) continue;
    addToManifest(path.join(SITE, 'courseware', course), `assets/${path.basename(to)}`);
    repaired++;
  }
}

console.log(`补回 ${repaired} 个文件，找不到的有 ${hopeless} 个。`);
