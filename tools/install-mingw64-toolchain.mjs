#!/usr/bin/env node
/*
 * Install a self-contained mingw-w64 GCC.
 *
 * The `ring` crate compiles C, so the Rust build needs a working gcc on this
 * machine and there is none.  We pull the pieces out of the MSYS2 mingw64
 * repository and lay them out as a normal mingw64 tree
 * (mingw64/bin, mingw64/lib, mingw64/include) so the gcc driver finds its
 * own headers and import libraries by relative path.
 */
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { promisify } from 'node:util';
import { zstdDecompressSync } from 'node:zlib';

const run = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = path.join(ROOT, 'tools', '.cache');
const DEST = path.join(ROOT, 'tools', 'mingw64');
const MIRRORS = [
  'https://mirrors.tuna.tsinghua.edu.cn/msys2/mingw/mingw64/',
  'https://mirrors.sjtug.sjtu.edu.cn/msys2/mingw/mingw64/',
  'https://mirror.nju.edu.cn/msys2/mingw/mingw64/',
];

const PACKAGES = [
  'gcc',
  'headers',
  'crt',
  'windows-default-manifest',
  'winpthreads',
  'libgcc',
  'isl',
  'mpc',
  'mpfr',
  'gmp',
  'zlib',
  'libiconv',
  'gettext-runtime',
];

fs.mkdirSync(CACHE, { recursive: true });
fs.mkdirSync(DEST, { recursive: true });

let base = null;
let index = null;
for (const m of MIRRORS) {
  try {
    const r = await fetch(m, { signal: AbortSignal.timeout(25000) });
    if (!r.ok) continue;
    index = await r.text();
    base = m;
    break;
  } catch {
    /* next mirror */
  }
}
if (!index) throw new Error('no package index on any mirror');
console.log(`mirror ${base}`);

for (const name of PACKAGES) {
  const hits = [
    ...new Set(
      [
        ...index.matchAll(
          new RegExp(
            `href="([^"]*mingw-w64-x86_64-${name}-[0-9][^"]*\\.pkg\\.tar\\.zst)"`,
            'g'
          )
        ),
      ].map((m) => m[1])
    ),
  ];
  if (!hits.length) {
    console.warn(`  no package ${name}`);
    continue;
  }
  hits.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const file = hits[hits.length - 1].split('/').pop();

  const archive = path.join(CACHE, file);
  if (!fs.existsSync(archive)) {
    const r = await fetch(base + file, { signal: AbortSignal.timeout(600000) });
    if (!r.ok) {
      console.warn(`  ${file}: HTTP ${r.status}`);
      continue;
    }
    fs.writeFileSync(archive, Buffer.from(await r.arrayBuffer()));
  }
  const plainTar = archive.replace(/\.zst$/, '.tar');
  if (!fs.existsSync(plainTar)) {
    fs.writeFileSync(plainTar, zstdDecompressSync(fs.readFileSync(archive)));
  }
  // Strip the leading "mingw64/" so the tree lands directly in DEST.
  await run('tar', ['-xf', plainTar, '-C', DEST, '--strip-components=1', 'mingw64']);
  console.log(`  ${file}`);
}

const gcc = path.join(DEST, 'bin', 'gcc.exe');
if (!fs.existsSync(gcc)) throw new Error('gcc.exe missing after install');
console.log(`installed into ${DEST}`);
