#!/usr/bin/env node
/*
 * Find a mingw-w64 binutils package (it carries as.exe, which GNU dlltool
 * shells out to) on a reachable mirror.
 */
const MIRRORS = [
  'https://mirrors.tuna.tsinghua.edu.cn/msys2/mingw/mingw64/',
  'https://mirrors.ustc.edu.cn/msys2/mingw/mingw64/',
  'https://mirror.nju.edu.cn/msys2/mingw/mingw64/',
  'https://repo.msys2.org/mingw/mingw64/',
  'https://mirrors.sjtug.sjtu.edu.cn/msys2/mingw/mingw64/',
];

const want = 'binutils';

for (const base of MIRRORS) {
  try {
    const r = await fetch(base, { signal: AbortSignal.timeout(20000) });
    if (!r.ok) {
      console.log(`${r.status} ${base}`);
      continue;
    }
    const html = await r.text();
    const hits = [...html.matchAll(/href="([^"]*binutils[^"]*\.pkg\.tar\.zst)"/g)].map(
      (m) => m[1]
    );
    console.log(`${base}  -> ${hits.length} binutils package(s)`);
    for (const h of hits.slice(0, 4)) console.log(`    ${h}`);
  } catch (e) {
    console.log(`ERR ${base}: ${e.message}`);
  }
}
