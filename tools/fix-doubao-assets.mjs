#!/usr/bin/env node
/*
 * The pictures of the 图小灵 assistant were fetched into a flat folder,
 * while the address that asks for them has a path of its own.  The
 * folder is given that path, so the local copy can answer the address.
 *
 *   node tools/fix-doubao-assets.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOST_DIR = path.join(ROOT, 'mirror', 'leqixiang', '_shared-ext', 'media.doubao.com');
const TAIL = path.join('space', 'api', 'box', 'stream', 'download', 'all_by_mount_point');

if (!fs.existsSync(HOST_DIR)) {
  console.log('nothing to do');
  process.exit(0);
}
const target = path.join(HOST_DIR, TAIL);
fs.mkdirSync(target, { recursive: true });
let moved = 0;
for (const name of fs.readdirSync(HOST_DIR)) {
  const from = path.join(HOST_DIR, name);
  if (!fs.statSync(from).isFile()) continue;
  fs.renameSync(from, path.join(target, name));
  moved++;
}
console.log(`moved ${moved} pictures into ${TAIL}`);
