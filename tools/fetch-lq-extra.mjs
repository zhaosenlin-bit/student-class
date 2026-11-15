#!/usr/bin/env node
/*
 * A few public files the courseware asks for indirectly.
 *
 * The scanner reads the course bodies, so it sees the stylesheet that
 * names the font and the module that imports the helper — but not the
 * font file or the helper itself. These are written by hand into the
 * shared folder, where the local server serves them to every course.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SHARED = path.join(ROOT, 'mirror', 'leqixiang', '_shared-ext');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

/*
 * Each entry is where the file belongs, followed by where it can be
 * fetched from. The second address is a different CDN that serves the
 * same npm package — the local server hands the file out by path, not
 * by origin, so the copy is the same whichever mirror it comes from.
 */
const FILES = [
  [
    'cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/utils/BufferGeometryUtils.js',
    'https://unpkg.com/three@0.161.0/examples/jsm/utils/BufferGeometryUtils.js',
  ],
  [
    'cdn.jsdelivr.net/npm/font-awesome@4.7.0/fonts/fontawesome-webfont.woff2',
    'https://unpkg.com/font-awesome@4.7.0/fonts/fontawesome-webfont.woff2',
  ],
  [
    'cdn.jsdelivr.net/npm/font-awesome@4.7.0/fonts/fontawesome-webfont.woff',
    'https://unpkg.com/font-awesome@4.7.0/fonts/fontawesome-webfont.woff',
  ],
  [
    'cdn.jsdelivr.net/npm/font-awesome@4.7.0/fonts/fontawesome-webfont.ttf',
    'https://unpkg.com/font-awesome@4.7.0/fonts/fontawesome-webfont.ttf',
  ],
  [
    'cdn.jsdelivr.net/npm/font-awesome@4.7.0/fonts/fontawesome-webfont.eot',
    'https://unpkg.com/font-awesome@4.7.0/fonts/fontawesome-webfont.eot',
  ],
  [
    'cdn.jsdelivr.net/npm/font-awesome@4.7.0/fonts/fontawesome-webfont.svg',
    'https://unpkg.com/font-awesome@4.7.0/fonts/fontawesome-webfont.svg',
  ],
  [
    'i.pinimg.com/236x/9d/22/6f/9d226f0b470b5b9a4a2e4c7d4f0a3c1e.jpg',
    'https://i.pinimg.com/236x/9d/22/6f/9d226f0b470b5b9a4a2e4c7d4f0a3c1e.jpg',
  ],
  [
    'i.pinimg.com/236x/8c/8f/0a/8c8f0a3f3b2c5c7d4f0b6e6f8c9f0e3a.jpg',
    'https://i.pinimg.com/236x/8c/8f/0a/8c8f0a3f3b2c5c7d4f0b6e6f8c9f0e3a.jpg',
  ],
];

let ok = 0;
let missing = 0;
for (const [rel, url] of FILES) {
  const target = path.join(SHARED, rel);
  if (fs.existsSync(target) && fs.statSync(target).size > 0) {
    console.log('已有  ', rel);
    ok++;
    continue;
  }
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Referer: 'https://aifunengjiaoyu.com/' },
    });
    if (!res.ok) {
      console.log('取不到', rel, res.status);
      missing++;
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length) {
      console.log('空文件', rel);
      missing++;
      continue;
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, buf);
    console.log('存下  ', rel, buf.length);
    ok++;
  } catch (e) {
    console.log('失败  ', rel, e.message);
    missing++;
  }
}
console.log(`\n存下 ${ok} 个，取不到 ${missing} 个`);
