#!/usr/bin/env node
/* 深挖精品课还有没有别的口子 */
import fs from 'node:fs';
const ORIGIN='https://aifunengjiaoyu.com';
const TOKEN=fs.readFileSync('recon/scratch/afe-token.txt','utf8').trim();
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const H={Authorization:`Bearer ${TOKEN}`,Origin:ORIGIN,'X-Premium-Catalogue-Intent':'cataloguing'};
async function raw(url,opts={}){
  const r=await fetch(url,{...opts,headers:{'User-Agent':UA,Referer:`${ORIGIN}/`,...H,...(opts.headers||{})}});
  const t=await r.text(); return {status:r.status,text:t};
}
function jparse(t){try{return JSON.parse(t)}catch{return null}}

// catalogue 结构
const cat=await raw(`${ORIGIN}/api/premium/catalogue`);
const cj=jparse(cat.text);
console.log('catalogue status',cat.status,'keys',cj?Object.keys(cj).join(','):cat.text.slice(0,200));
if(cj&&cj.courses){
  const one=cj.courses.find(x=>!x.freeSample);
  console.log('paid course sample:',JSON.stringify(one,null,1).slice(0,1500));
  const free=cj.courses.find(x=>x.freeSample);
  console.log('free course sample:',JSON.stringify(free,null,1).slice(0,1500));
}
// 拿一个付费课 id 试各种口子
const paid=(cj&&cj.courses||[]).find(x=>!x.freeSample&&x.programId);
const pid=paid&&paid.programId;
console.log('paid programId',pid,paid&&paid.title);
// 1) 直接 body（带账号 token，不带租约）
for(const u of [
  `${ORIGIN}/api/program-file/${pid}/body`,
  `${ORIGIN}/api/program-file/${pid}/body?token=${TOKEN}`,
  `${ORIGIN}/api/premium/program-file/${pid}/body`,
  `${ORIGIN}/api/premium/sample/${pid}`,
  `${ORIGIN}/api/premium/preview/${pid}`,
  `${ORIGIN}/api/premium/catalogue/${pid}`,
  `${ORIGIN}/api/programs/${pid}`,
  `${ORIGIN}/api/programs/file-content/${pid}`,
]){
  const r=await raw(u);
  console.log('GET',u.replace(ORIGIN,''),'->',r.status,r.text.slice(0,160).replace(/\n/g,' '));
}
