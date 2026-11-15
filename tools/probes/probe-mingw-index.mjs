#!/usr/bin/env node
/* Show how the mirror lists the packages we want. */
const base = 'https://mirrors.tuna.tsinghua.edu.cn/msys2/mingw/mingw64/';
const html = await (await fetch(base)).text();
console.log('index bytes', html.length);
const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
console.log('hrefs', hrefs.length);
for (const needle of ['gcc', 'isl', 'mpfr', 'winpthreads', 'zlib']) {
  const hits = hrefs.filter((h) => h.includes(needle)).slice(0, 8);
  console.log(`\n${needle}:`);
  for (const h of hits) console.log(`   ${h}`);
}

console.log('\nexact x86_64-gcc:');
for (const h of hrefs
  .filter((h) => /^mingw-w64-x86_64-gcc-[0-9]/.test(h))
  .slice(0, 10)) {
  console.log(`   ${h}`);
}
console.log('\nexact x86_64-headers/crt/libgcc/mpc/gmp:');
for (const n of ['headers', 'crt', 'libgcc', 'mpc', 'gmp', 'zlib']) {
  const hits = hrefs.filter((h) => new RegExp(`^mingw-w64-x86_64-${n}-[0-9]`).test(h));
  console.log(`   ${n}: ${hits.length} -> ${hits.slice(-2).join(', ')}`);
}

console.log('\nmanifest:');
for (const h of hrefs.filter((h) => h.includes('manifest')).slice(0, 12)) {
  console.log(`   ${h}`);
}
