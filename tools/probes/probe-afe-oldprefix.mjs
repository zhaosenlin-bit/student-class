/* Try the mount addresses that were taken earlier; they may still serve
   the files the chapters point at. */
const ORIGIN = 'https://aifunengjiaoyu.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const SID = 'e547484ae39c1c50abdb4d69dde927f3b3375f6d79b0461c';
const PREFIXES = [
  'a6b766b8a09812995a0d25aa600d3feffe5e6f76541e7e11',
  '7e0eefd6bbde4340821e60b0e824a81877daffc30d5bb6d5',
  'eaaddefa70c96b4328c518356bf2964a28a44304dcf38306',
  'd8200f208aa31c0f256fb1b0c6c921347cc7c1edc351d758',
  '4ae2477c36f17bb642331425c974e1ffb66a7ecf69bf33cb',
  '013f31a78dc60f11829db3062dda656cb3e4c01860852756',
];
const FILES = [
  'assets/index-Df_Pctd-.js',
  'delivery/20260912/chapters.html',
  'delivery/20260912/chapter01.js',
  'delivery/20260912/chapter01.mjs',
  'delivery/20260912/styles.css',
  'delivery/20260912/music-manager.js',
];

for (const hash of PREFIXES) {
  const prefix = `/api/reviewed-course-assets/${SID}/${hash}/`;
  const row = [];
  for (const file of FILES) {
    const res = await fetch(ORIGIN + prefix + file, {
      headers: { 'User-Agent': UA, Referer: `${ORIGIN}/` },
    });
    row.push(`${res.status} ${file.split('/').pop()}`);
  }
  console.log(hash.slice(0, 8), row.join('  '));
}
