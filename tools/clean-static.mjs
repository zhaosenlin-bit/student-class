#!/usr/bin/env node
/*
 * The last sweep of an exported folder.
 *
 * The lessons are written as they were built, so a few names of the
 * building site are still inside them.  Nothing of another house may
 * show through, so the folder is put in order once more: the covers
 * are moved into a plainly named folder, and the tags that name
 * somebody else's studio are taken away.
 *
 *   node tools/clean-static.mjs --site dist
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const argOf = (name, fallback) => {
  const at = args.indexOf(name);
  return at >= 0 && args[at + 1] ? args[at + 1] : fallback;
};

const SITE = path.resolve(argOf('--site', 'dist'));
if (!fs.existsSync(SITE)) {
  console.error('没有这个文件夹：', SITE);
  process.exit(1);
}

let moved = 0;
let patched = 0;
let cleaned = 0;

/* ------------------------------------------------- covers in a plain folder */

const oldCovers = path.join(SITE, 'premium-catalogue');
if (fs.existsSync(oldCovers)) {
  const from = path.join(oldCovers, 'covers');
  const to = path.join(SITE, 'covers');
  if (fs.existsSync(from)) {
    if (fs.existsSync(to)) {
      for (const name of fs.readdirSync(from)) {
        fs.renameSync(path.join(from, name), path.join(to, name));
      }
      fs.rmSync(oldCovers, { recursive: true, force: true });
    } else {
      fs.renameSync(from, to);
      fs.rmSync(oldCovers, { recursive: true, force: true });
    }
    moved += 1;
    console.log('封面 -> covers/');
  }
}

/* ---------------------------------------------------------- names in the data */

for (const name of ['catalog.json', 'courses.json']) {
  const file = path.join(SITE, name);
  if (!fs.existsSync(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  const next = text
    .split('premium-catalogue/covers/')
    .join('covers/')
    .split('/premium-catalogue/covers/')
    .join('/covers/');
  if (next === text) continue;
  fs.writeFileSync(file, next, 'utf8');
  patched += 1;
  console.log('名字 ->', name);
}

/* ------------------------------------------------------- tags of other studios */

function walk(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/\.html?$/i.test(e.name)) out.push(full);
  }
  return out;
}

for (const file of walk(path.join(SITE, 'courseware'))) {
  const text = fs.readFileSync(file, 'utf8');
  const next = text
    .replace(/\s*<meta\s+name=["']copyright["'][^>]*>/gi, '')
    .replace(/\s*<meta\s+name=["']signature["'][^>]*>/gi, '');
  if (next === text) continue;
  fs.writeFileSync(file, next, 'utf8');
  cleaned += 1;
}

console.log(
  `收尾完成：改名 ${moved} 处，数据 ${patched} 个，课件页 ${cleaned} 个`
);

/* ------------------------------------- names that stand for a language -- */

/*
 * A few names are not files at all: they are the words with which a
 * document says "this part of me is written in HTML".  A browser
 * knows them already; no lesson ever asks for them as a file, and no
 * file of that name belongs in the pack.  They are dropped here, and
 * the list of files that is packed for download is corrected with
 * them, so that the lesson and its download stay the same thing.
 */
const NAMESPACE_DIRS = ['www.w3.org', 'purl.org', 'xmlns.org', 'openoffice.org'];

let dropped = 0;
let manifests = 0;

for (const lesson of fs.readdirSync(path.join(SITE, 'courseware'), { withFileTypes: true })) {
  if (!lesson.isDirectory()) continue;
  const lessonDir = path.join(SITE, 'courseware', lesson.name);
  const extRoot = path.join(lessonDir, 'assets', '_ext');
  if (!fs.existsSync(extRoot)) continue;

  const gone = [];
  for (const host of fs.readdirSync(extRoot)) {
    if (!NAMESPACE_DIRS.includes(host)) continue;
    fs.rmSync(path.join(extRoot, host), { recursive: true, force: true });
    gone.push(`assets/_ext/${host}/`);
  }
  if (!gone.length) continue;
  dropped += gone.length;

  const manifest = path.join(lessonDir, 'download.json');
  if (fs.existsSync(manifest)) {
    const data = JSON.parse(fs.readFileSync(manifest, 'utf8'));
    if (Array.isArray(data.entries)) {
      const before = data.entries.length;
      data.entries = data.entries.filter(
        (entry) => !gone.some((prefix) => String(entry[0]).startsWith(prefix))
      );
      if (data.entries.length !== before) {
        fs.writeFileSync(manifest, JSON.stringify(data), 'utf8');
        manifests += 1;
      }
    }
  }
}

console.log(`名号文件：删除 ${dropped} 处，下载清单修正 ${manifests} 个`);
