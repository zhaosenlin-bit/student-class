#!/usr/bin/env node
/*
 * Mirror the one third-party script the 图灵智赋 shell loads on demand:
 * html2canvas, used to rasterise an HTML preview into a cover image.
 *
 * The shell points at cdn.jsdelivr.net, which is unreachable from this
 * machine, so the file comes from unpkg instead and the shell is repointed
 * at the local copy.
 */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHELL = path.join(
  ROOT, 'mirror', 'aifunengjiaoyu', 'assets', 'assets', 'app.17e3fb394175.min.js'
);
const VENDOR_DIR = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'assets', 'vendor');
const DEST = path.join(VENDOR_DIR, 'html2canvas.min.js');

const REMOTE = 'https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js';
const ORIGINAL = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
const LOCAL = '/assets/vendor/html2canvas.min.js';

fs.mkdirSync(VENDOR_DIR, { recursive: true });

if (!fs.existsSync(DEST)) {
  const r = await fetch(REMOTE);
  if (!r.ok) throw new Error(`html2canvas: HTTP ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  fs.writeFileSync(DEST, buf);
  console.log(`downloaded html2canvas ${(buf.length / 1024).toFixed(0)} KB`);
}

const shell = fs.readFileSync(SHELL, 'utf8');
if (!shell.includes(ORIGINAL)) {
  console.log('shell does not reference the CDN url (already patched?)');
} else {
  fs.writeFileSync(SHELL, shell.split(ORIGINAL).join(LOCAL), 'utf8');
  console.log('repointed the shell to ' + LOCAL);
}
