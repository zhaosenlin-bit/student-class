#!/usr/bin/env node
/*
 * Pictures that are borrowed from a picture service are not part of the
 * course.  They fail when the machine is offline, and the page that
 * holds them has to look for them first.
 *
 * A picture that already carries a drawn stand-in is given that stand-in
 * straight away, so the copy never reaches for the network.
 *
 *   node tools/patch-afe-hotlink.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CW = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'courseware');

const IMG = /<img\b([^>]*?)\bsrc\s*=\s*"(https?:\/\/[^"]+)"([^>]*?)\bonerror\s*=\s*"this\.src\s*=\s*'([^']+)'"([^>]*)>/gi;

let touched = 0;
for (const file of fs.readdirSync(CW)) {
  if (!file.endsWith('.html')) continue;
  const full = path.join(CW, file);
  const html = fs.readFileSync(full, 'utf8');
  let changed = false;
  const next = html.replace(
    IMG,
    (m, a, src, b, stand, c) => {
      changed = true;
      return `<img${a}src="${stand}"${b}${c}>`;
    }
  );
  if (!changed) continue;
  fs.writeFileSync(full, next, 'utf8');
  touched++;
  console.log(`${file}: ${(html.match(IMG) || []).length} pictures stood in`);
}
console.log(`patched ${touched} files`);
