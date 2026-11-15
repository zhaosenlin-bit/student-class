#!/usr/bin/env node
/*
 * Pull the cover picture of every 精品课 into the mirror, so the merged
 * catalogue never reaches for the live site.
 *
 * Two shapes of address are in use:
 *   /premium-catalogue/covers/<hash>.jpg   a file of its own
 *   /uploads/public/users/<id>/upload-<h>/image-0.jpg
 *                                          the platform's own upload tree,
 *                                          which the CDN serves under
 *                                          /prod/uploads/public/...
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'mirror/aifunengjiaoyu';
const COVERS = path.join(ROOT, 'assets', 'premium-catalogue', 'covers');
const UPLOADS = path.join(ROOT, 'public', 'prod', 'uploads');
const ORIGIN = 'https://aifunengjiaoyu.com';
const CDN = 'https://static.aifunengjiaoyu.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const catalogue = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'premium', 'catalogue.json'), 'utf8')
);

let ok = 0;
let missed = 0;
let bytes = 0;

for (const course of catalogue.courses || []) {
  const cover = course.coverUrl;
  if (!cover) continue;

  let file;
  let url;
  if (cover.startsWith('/uploads/')) {
    /* The same file the CDN serves under /prod/uploads. */
    file = path.join(UPLOADS, cover.replace(/^\/uploads\//, ''));
    url = CDN + '/prod' + cover;
  } else {
    file = path.join(COVERS, path.basename(cover));
    url = ORIGIN + cover;
  }

  if (fs.existsSync(file) && fs.statSync(file).size > 0) {
    ok++;
    continue;
  }
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Referer: ORIGIN + '/' },
    });
    if (!res.ok) throw new Error('status ' + res.status);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, buf);
    ok++;
    bytes += buf.length;
  } catch (e) {
    missed++;
    if (missed < 8) console.log(' miss', cover, e.message);
  }
}

console.log(
  'mirrored ' + ok + ' covers (' + Math.round(bytes / 1024) + ' KB), missing ' + missed
);
