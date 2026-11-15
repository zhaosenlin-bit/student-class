/*
 * 「本地可用 / 待补齐」两档：本地库里每一份课件要么已经能打开，
 * 要么还没拉下来，这一刀比原来的免费/付费有信息量。
 */
import fs from 'node:fs';
const p='tools/build-leqixiang.mjs';
let s=fs.readFileSync(p,'utf8');

const oldAvail = `  js = js.replace(
    ".filter(p=>priceFilter==='全部'||p.mode===(priceFilter==='免费'?'free':'paid'))",
    ".filter(p=>priceFilter==='本地'?!!p.localInstalled:priceFilter==='全部'||p.mode===(priceFilter==='免费'?'free':'paid'))"
  );`;
const newAvail = `  js = js.replace(
    ".filter(p=>priceFilter==='全部'||p.mode===(priceFilter==='免费'?'free':'paid'))",
    ".filter(p=>priceFilter==='本地'?!!p.localInstalled:priceFilter==='待补齐'?!p.localInstalled:priceFilter==='全部'||p.mode===(priceFilter==='免费'?'free':'paid'))"
  );`;
if(!s.includes(oldAvail)){ console.error('avail block missed'); process.exit(1); }
s=s.replace(oldAvail,newAvail);

const oldPool = `  js = js.replace(
    "const shown=browseCatalog(info.downloadMode&&originFilter!=='教师课件'?catalog.filter(p=>matchesDownloadEdition(p,editionFilter)):catalog,{origin:originFilter,stage,subject:filter,price:priceFilter,",
    "const shown=browseCatalog((info.downloadMode&&originFilter!=='教师课件'?catalog.filter(p=>matchesDownloadEdition(p,editionFilter)):catalog).filter(p=>priceFilter!=='本地'||p.localInstalled),{origin:originFilter,stage,subject:filter,price:priceFilter==='本地'?'全部':priceFilter,"
  );`;
const newPool = `  js = js.replace(
    "const shown=browseCatalog(info.downloadMode&&originFilter!=='教师课件'?catalog.filter(p=>matchesDownloadEdition(p,editionFilter)):catalog,{origin:originFilter,stage,subject:filter,price:priceFilter,",
    "const shown=browseCatalog((info.downloadMode&&originFilter!=='教师课件'?catalog.filter(p=>matchesDownloadEdition(p,editionFilter)):catalog).filter(p=>priceFilter==='本地'?p.localInstalled:priceFilter==='待补齐'?!p.localInstalled:true),{origin:originFilter,stage,subject:filter,price:['本地','待补齐'].includes(priceFilter)?'全部':priceFilter,"
  );`;
if(!s.includes(oldPool)){ console.error('pool block missed'); process.exit(1); }
s=s.replace(oldPool,newPool);

s=s.replace(
  `    "priceFilter==='本地'?!!p.localInstalled",
    "priceFilter!=='本地'||p.localInstalled",`,
  `    "priceFilter==='本地'?!!p.localInstalled",
    "priceFilter==='待补齐'?!p.localInstalled:true",
    "priceFilter==='待补齐'?!p.localInstalled:true",`
);

fs.writeFileSync(p,s);
console.log('app patches updated');
