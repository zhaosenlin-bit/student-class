#!/usr/bin/env node
/* inventoryKey 能不能直接推出正文路径 */
import fs from 'node:fs';
const ORIGIN='https://aifunengjiaoyu.com';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
async function head(u){
  try{
    const r=await fetch(u,{headers:{'User-Agent':UA,Referer:`${ORIGIN}/`}});
    const buf=r.headers.get('content-length');
    return `${r.status} len=${buf} ct=${r.headers.get('content-type')}`;
  }catch(e){return 'ERR '+e.message}
}
const cat=await (await fetch(`${ORIGIN}/api/premium/catalogue`)).json();
console.log('phase',cat.phase,'revision',cat.revision);
console.log('packages:',JSON.stringify(cat.packages).slice(0,900));
console.log('categories:',JSON.stringify(cat.categories).slice(0,600));
const c=cat.courses.find(x=>x.programId===849);
const ik=c.inventoryKey, pkg=c.packageId, pid=c.programId;
const cands=[
 `/premium-catalogue/covers/${ik}.jpg`,
 `/premium-catalogue/${ik}.html`,
 `/premium-catalogue/${ik}.zip`,
 `/premium-catalogue/${ik}/${ik}.html`,
 `/premium-catalogue/${pkg}/${ik}.html`,
 `/premium-catalogue/${pkg}/${ik}.zip`,
 `/premium-catalogue/bodies/${ik}.html`,
 `/premium-catalogue/${pkg}/index.html`,
 `/api/premium/catalogue/${pkg}`,
 `/api/premium/packages/${pkg}`,
 `/api/premium/package/${pkg}`,
 `/api/premium/inventory/${ik}`,
];
for(const p of cands){ console.log(p,'->',await head(ORIGIN+p)); }
// 用 programId 试
for(const p of [`/premium-catalogue/${pid}.html`,`/premium-catalogue/bodies/${pid}.html`,`/uploads/premium/${pid}.html`]){
  console.log(p,'->',await head(ORIGIN+p));
}
