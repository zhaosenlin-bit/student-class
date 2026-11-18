#!/usr/bin/env node
/*
 * Puts the wordmark of 乐启享 where the simulations of PhET keep the
 * mark of their own maker.
 *
 * The mark is written into the document as a picture, so it is taken
 * out there and the wordmark of this library is put in its place.  The
 * library does not show the name of another maker to the teacher.
 *
 *   node tools/brand-phet-logo.mjs [--dir mirror/phet/courseware]
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
const DIR = path.resolve(ROOT, arg('dir', 'mirror/phet/courseware'));
const MARK = path.join(ROOT, 'mirror', 'leqixiang', 'brand', 'brand-wordmark.png');

const ours = `data:image/png;base64,${fs.readFileSync(MARK).toString('base64')}`;

/* The picture of the mark is 273 by 108 pixels, and the one that was put
   there before was twice that; nothing else in these documents has one
   of those shapes. */
const SHAPES = [
  [273, 108],
  [546, 216],
];
const isMark = (payload) => {
  const buf = Buffer.from(payload, 'base64');
  if (buf.length < 24) return false;
  return SHAPES.some(
    ([w, h]) => buf.readUInt32BE(16) === w && buf.readUInt32BE(20) === h
  );
};

let changed = 0;
let total = 0;
let marks = 0;
for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith('.html'))) {
  const full = path.join(DIR, file);
  const html = fs.readFileSync(full, 'utf8');
  total++;
  let count = 0;
  const next = html.replace(/data:image\/png;base64,([A-Za-z0-9+/=]{2000,})/g, (m, payload) => {
    if (!isMark(payload)) return m;
    count++;
    return ours;
  });
  if (!count) continue;
  fs.writeFileSync(full, next, 'utf8');
  changed++;
  marks += count;
}
console.log(`角标已换成乐启享：${changed}/${total} 份模拟，共 ${marks} 处`);
