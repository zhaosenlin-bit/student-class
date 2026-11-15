/*
 * 本地库里的"暂未开放"要说清楚是本地还没有这份正文，
 * 而不是站点没开放。卡片与详情页的措辞都跟着改。
 */
import fs from 'node:fs';
const p='tools/build-leqixiang.mjs';
let s=fs.readFileSync(p,'utf8');
const anchor=`  /* The card in the catalogue carries the same wording. */
  js = js.replace(
    "const state=p.mode==='free'?'免费下载'",
    "const state=p.downloadable===false?'暂未开放':p.mode==='free'?'免费下载'"
  );`;
if(!s.includes(anchor)){ console.error('anchor missed'); process.exit(1); }

const replacement = `  /* The card in the catalogue carries the same wording. */
  js = js.replace(
    "const state=p.mode==='free'?'免费下载'",
    "const state=p.downloadable===false?'本地未收录':p.mode==='free'?'免费下载':p.localInstalled?'本地可用':'待补齐'"
  );
  /* The detail panel: a missing body is a local gap, not a site decision. */
  js = js.replace(
    "const status=unavailable(p)?'这份资源暂未开放下载。'",
    "const status=unavailable(p)?'本地库还没有这份课件的正文，暂时不能预览或下载。'"
  );
  js = js.replace(
    "\${unavailable(p)?'暂未开放下载'",
    "\${unavailable(p)?'本地未收录'"
  );`;

s=s.replace(anchor,replacement);
s=s.replace(
  `  for (const marker of ['本地课件可直接下载', "const state=p.downloadable===false?'暂未开放'"]) {`,
  `  for (const marker of [
    '本地课件可直接下载',
    "const state=p.downloadable===false?'本地未收录'",
    '本地库还没有这份课件的正文',
    "unavailable(p)?'本地未收录'",
  ]) {`
);
fs.writeFileSync(p,s);
console.log('store patched');
