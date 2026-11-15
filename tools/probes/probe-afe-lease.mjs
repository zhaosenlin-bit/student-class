#!/usr/bin/env node
/* 还能不能拿到新的整包租约 */
import fs from 'node:fs';
const ORIGIN='https://aifunengjiaoyu.com';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const TOKEN=fs.readFileSync('recon/scratch/afe-token.txt','utf8').trim();
const H={Authorization:`Bearer ${TOKEN}`,'User-Agent':UA,Referer:`${ORIGIN}/`};
for(const id of [180,506,501,558,754,7,1363]){
  const r=await fetch(`${ORIGIN}/api/programs/${id}/access-token`,{headers:H});
  const t=await r.text();
  let j=null; try{j=JSON.parse(t)}catch{}
  console.log(id,'->',r.status,t.slice(0,200));
  if(j?.token){
    const b=await fetch(`${ORIGIN}/api/program-file/${id}?token=${encodeURIComponent(j.token)}`,{headers:H});
    const bt=await b.text();
    const base=(bt.match(/<base[^>]*href="([^"]+)"/i)||[])[1];
    console.log('   body',b.status,'len',bt.length,'base',base?base.slice(0,120):null);
  }
}
