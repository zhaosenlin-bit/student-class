#!/usr/bin/env node
/*
 * Some works borrow the same libraries from a public CDN. When one of
 * them could not be mirrored in full, the library is copied from a work
 * that has it, so the page still runs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CW = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'courseware');

/* Where a borrowed library can be taken from. */
const SOURCES = {
  '196': '193',
};

/* A file that is missing from the borrowed tree can be taken from anywhere
   it was mirrored before. */
const LOOSE = [
  {
    target: '196',
    file: 'GLTFLoader.js',
    from: 'mirror/aifunengjiaoyu/courseware/26.assets/_ext/unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js',
    to: '196.assets/_ext/cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js',
  },
];

const copyTree = (from, to) => {
  fs.mkdirSync(to, { recursive: true });
  let count = 0;
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) count += copyTree(src, dst);
    else {
      fs.copyFileSync(src, dst);
      count++;
    }
  }
  return count;
};

for (const [target, source] of Object.entries(SOURCES)) {
  const from = path.join(CW, `${source}.assets`, '_ext');
  const to = path.join(CW, `${target}.assets`, '_ext');
  if (!fs.existsSync(from)) {
    console.log(`${target}: no source folder`);
    continue;
  }
  const count = copyTree(from, to);
  console.log(`${target}: copied ${count} library files from ${source}`);
}

for (const item of LOOSE) {
  const from = path.join(ROOT, item.from);
  const to = path.join(CW, item.to);
  if (!fs.existsSync(from)) {
    console.log(`${item.target}: ${item.file} source missing`);
    continue;
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  console.log(`${item.target}: ${item.file} placed`);
}
