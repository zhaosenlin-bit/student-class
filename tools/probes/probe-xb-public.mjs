#!/usr/bin/env node
/* xb: 静态 /courseware/<id> 路线对未落地资源是否开放 */
import fs from 'node:fs';
const ORIGIN='https://xbjiaoyu.com';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const cat=JSON.parse(fs.readFileSync('mirror/xbjiaoyu/catalog.json','utf8'));
const products=cat.products||[];
const missing=products.filter(p=>{
  const m=JSON.parse(fs.readFileSync('mirror/xbjiaoyu/manifest.json','utf8'));
  return m.courses?.[p.id]?.status!=='ok';
});
console.log('xb products',products.length,'missing',missing.length);
const sample=missing.slice(0,8);
for(const p of sample){
  const r=await fetch(`${ORIGIN}/courseware/${encodeURIComponent(p.id)}`,{headers:{'User-Agent':UA,Referer:`${ORIGIN}/`}});
  const t=await r.text();
  console.log(p.id,'->',r.status,'len',t.length,'ct',r.headers.get('content-type'), t.slice(0,80).replace(/\n/g,' '));
}
