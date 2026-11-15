/*
 * "本地可用" 这一档：把线上还没买、但本地已经有正文的那批课件挑出来。
 * 站点原本只有 全部 / 免费 / 付费 三档，本地库里多了一档"直接就能用"。
 */
import fs from 'node:fs';
const p='tools/build-leqixiang.mjs';
let s=fs.readFileSync(p,'utf8');
const anchor = `  /*
   * The subject filter ran to sixty chips and pushed the catalogue off the`;
if(!s.includes(anchor)) { console.error('anchor missed'); process.exit(1); }

const block = `  /*
   * The catalogue holds everything the two platforms publish, but only the
   * bodies that were pulled down can actually be opened here. A fourth
   * filter lets a teacher separate the two without reading every card.
   */
  js = js.replace(
    ".filter(p=>priceFilter==='全部'||p.mode===(priceFilter==='免费'?'free':'paid'))",
    ".filter(p=>priceFilter==='本地'?!!p.localInstalled:priceFilter==='全部'||p.mode===(priceFilter==='免费'?'free':'paid'))"
  );
  js = js.replace(
    "const shown=browseCatalog(info.downloadMode&&originFilter!=='教师课件'?catalog.filter(p=>matchesDownloadEdition(p,editionFilter)):catalog,{origin:originFilter,stage,subject:filter,price:priceFilter,",
    "const shown=browseCatalog((info.downloadMode&&originFilter!=='教师课件'?catalog.filter(p=>matchesDownloadEdition(p,editionFilter)):catalog).filter(p=>priceFilter!=='本地'||p.localInstalled),{origin:originFilter,stage,subject:filter,price:priceFilter==='本地'?'全部':priceFilter,"
  );

`;
s = s.replace(anchor, block + anchor);

// 校验标记
s = s.replace(
  `    'download-subject-more',
    'subjectsOpen=false',`,
  `    'download-subject-more',
    'subjectsOpen=false',
    "priceFilter==='本地'?!!p.localInstalled",
    "priceFilter!=='本地'||p.localInstalled",`
);

fs.writeFileSync(p,s);
console.log('build script patched');
