#!/usr/bin/env node
/*
 * Some course folders are empty on disk.  That is only a problem if the
 * body page actually reaches out for files it does not have.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CW = path.join(ROOT, 'mirror', 'leqixiang', 'courseware');

const empties = fs
  .readdirSync(CW)
  .filter((n) => n.endsWith('.assets'))
  .filter((n) => fs.readdirSync(path.join(CW, n)).length === 0);

for (const name of empties) {
  const id = name.replace(/\.assets$/, '');
  const file = path.join(CW, `${id}.html`);
  if (!fs.existsSync(file)) {
    console.log(`${id}  NO BODY`);
    continue;
  }
  const src = fs.readFileSync(file, 'utf8');
  const refs = [
    ...new Set(
      [...src.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/g)]
        .map((m) => m[1])
        .filter((u) => !u.startsWith('data:') && !u.startsWith('#') && !u.startsWith('javascript:'))
    ),
  ];
  console.log(`${id}  ${(src.length / 1024).toFixed(0)}KB  external-refs=${refs.length}  ${refs.slice(0, 8).join(' ')}`);
}
