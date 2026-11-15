#!/usr/bin/env node
import fs from 'node:fs';
const ORIGIN='https://aifunengjiaoyu.com';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const TOKEN=fs.readFileSync('recon/scratch/afe-token.txt','utf8').trim();
const H={Authorization:`Bearer ${TOKEN}`,Origin:ORIGIN,'User-Agent':UA,Referer:`${ORIGIN}/`};
for(const u of ['/api/user/stats','/api/pay/vip-prices','/api/auth/verify','/api/user/purchases','/api/programs']){
  const r=await fetch(ORIGIN+u,{headers:H});
  const t=await r.text();
  console.log(u,'->',r.status,t.slice(0,700).replace(/\s+/g,' '));
  console.log('');
}
