#!/usr/bin/env node
/* /uploads 下的正文路径 */
import fs from 'node:fs';
const ORIGIN='https://aifunengjiaoyu.com';
const TOKEN=fs.readFileSync('recon/scratch/afe-token.txt','utf8').trim();
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const cat=await (await fetch(`${ORIGIN}/api/premium/catalogue`)).json();
const c=cat.courses.find(x=>x.programId===849);
const ik=c.inventoryKey,pkg=c.packageId;
async function go(p,auth){
  const headers={'User-Agent':UA,Referer:`${ORIGIN}/`};
  if(auth) headers.Authorization=`Bearer ${auth}`;
  try{
    const r=await fetch(ORIGIN+p,{headers});
    const t=await r.text();
    return `${r.status} ct=${r.headers.get('content-type')} len=${t.length} :: ${t.slice(0,120).replace(/\n/g,' ')}`;
  }catch(e){return 'ERR '+e.message}
}
const paths=[
 `/uploads/premium/849.html`,
 `/uploads/premium/${ik}.html`,
 `/uploads/premium/${pkg}/849.html`,
 `/uploads/premium/${pkg}/${ik}.html`,
 `/uploads/public/users/oHsVr29yks-hA6rQ_1avQM-lFPRQ/upload-617aa2254e1f1e6906b70944f7554046/image-0.png`,
 `/uploads/premium/`,
 `/uploads/premium`,
];
for(const p of paths){ console.log('NOAUTH',p,'->',await go(p)); console.log('  AUTH ->',await go(p,TOKEN)); }
