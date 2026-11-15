#!/usr/bin/env node
/* 抓 /play/<id> 页面自己的脚本，找"刷新版本"的接口 */
import fs from 'node:fs';
const ORIGIN='https://aifunengjiaoyu.com';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const TOKEN=fs.readFileSync('recon/scratch/afe-token.txt','utf8').trim();
async function get(u,auth){
  const h={'User-Agent':UA,Referer:`${ORIGIN}/`};
  if(auth)h.Authorization=`Bearer ${auth}`;
  const r=await fetch(u,{headers:h});
  return {status:r.status,text:await r.text(),ct:r.headers.get('content-type')};
}
for(const id of [841,811,842,1016,1360]){
  const p=await get(`${ORIGIN}/play/${id}`,TOKEN);
  console.log(`--- /play/${id}`,p.status,p.ct,p.text.length);
  // 页面里出现的 api 路径
  const apis=[...p.text.matchAll(/['"`](\/api\/[A-Za-z0-9_\-\/:.{}]+)['"`]/g)].map(m=>m[1]);
  console.log(' apis:',[...new Set(apis)].join(' '));
  const scripts=[...p.text.matchAll(/<script[^>]+src=["']([^"']+)["']/g)].map(m=>m[1]);
  console.log(' scripts:',scripts.join(' '));
}
