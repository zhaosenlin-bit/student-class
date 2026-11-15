#!/usr/bin/env node
/*
 * Install GNU as.exe, which GNU dlltool shells out to when it builds the
 * import libraries that raw-dylib links need.
 *
 * The Rust windows-gnu toolchain ships dlltool.exe but no assembler, and
 * the assembler is not on this machine either, so we pull the matching
 * mingw-w64 binutils package off a mirror and unpack just the binaries.
 */
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { zstdDecompressSync } from 'node:zlib';

const run = promisify(execFile);
const ROOT = 'C:/kaifa/xiaobai-class';
const DEST = path.join(ROOT, 'tools', 'mingw-binutils');
const CACHE = path.join(ROOT, 'tools', '.cache');
const MIRRORS = [
  'https://mirrors.tuna.tsinghua.edu.cn/msys2/mingw/mingw64/',
  'https://mirrors.sjtug.sjtu.edu.cn/msys2/mingw/mingw64/',
  'https://mirror.nju.edu.cn/msys2/mingw/mingw64/',
];

fs.mkdirSync(CACHE, { recursive: true });
fs.mkdirSync(DEST, { recursive: true });

// The binutils binaries need the mingw runtime DLLs (libintl, libiconv,
// zlib, winpthread); they ship as separate packages.
const WANTED = [
  { pkg: 'x86_64-binutils', take: ['as.exe', 'ld.exe', 'dlltool.exe', 'ar.exe', 'nm.exe', 'objdump.exe'] },
  { pkg: 'x86_64-gettext-runtime', take: ['libintl-8.dll'] },
  { pkg: 'x86_64-libiconv', take: ['libiconv-2.dll'] },
  { pkg: 'x86_64-zlib', take: ['zlib1.dll'] },
  { pkg: 'x86_64-libwinpthread', take: ['libwinpthread-1.dll'] },
  { pkg: 'x86_64-libssp', take: ['libssp-0.dll'] },
];

// Find the newest package for each name on the first mirror that answers.
let base = null;
let index = null;
for (const m of MIRRORS) {
  try {
    const r = await fetch(m, { signal: AbortSignal.timeout(25000) });
    if (!r.ok) continue;
    const html = await r.text();
    index = html;
    base = m;
    break;
  } catch {
    /* try the next mirror */
  }
}

if (!index) throw new Error('no package index found on any mirror');
console.log(`mirror ${base}`);

for (const { pkg, take } of WANTED) {
  const hits = [
    ...new Set(
      [...index.matchAll(new RegExp(`href="([^"]*${pkg}[^"]*\\.pkg\\.tar\\.zst)"`, 'g'))].map(
        (m) => m[1]
      )
    ),
  ];
  if (!hits.length) {
    console.warn(`  no package for ${pkg}`);
    continue;
  }
  // Sort by version so the newest one wins.
  hits.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const file = hits[hits.length - 1].split('/').pop();

  const archive = path.join(CACHE, file);
  if (!fs.existsSync(archive)) {
    const r = await fetch(base + file, { signal: AbortSignal.timeout(300000) });
    if (!r.ok) {
      console.warn(`  ${file}: HTTP ${r.status}`);
      continue;
    }
    fs.writeFileSync(archive, Buffer.from(await r.arrayBuffer()));
  }

  // bsdtar needs an external zstd binary, which this machine does not have;
  // node's zlib can decompress the stream on its own.
  const plainTar = archive.replace(/\.zst$/, '.tar');
  if (!fs.existsSync(plainTar)) {
    fs.writeFileSync(plainTar, zstdDecompressSync(fs.readFileSync(archive)));
  }
  await run('tar', ['-xf', plainTar, '-C', CACHE, '--strip-components=2', 'mingw64/bin/']);

  for (const f of take) {
    const from = path.join(CACHE, f);
    if (fs.existsSync(from)) {
      fs.copyFileSync(from, path.join(DEST, f));
      console.log(`  ${f}`);
    } else {
      console.warn(`  missing ${f} in ${file}`);
    }
  }
}
console.log(`installed into ${DEST}`);
