#!/usr/bin/env node
import fs from 'node:fs';
const ORIGIN='https://aifunengjiaoyu.com';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const TOKEN=fs.readFileSync('recon/scratch/afe-token.txt','utf8').trim();
const H={Authorization:`Bearer ${TOKEN}`,'User-Agent':UA,Referer:`${ORIGIN}/`};
const id=180;
const r=await fetch(`${ORIGIN}/api/programs/${id}/access-token`,{headers:H});
const j=await r.json();
let url=`${ORIGIN}/api/program-file/${id}?token=${encodeURIComponent(j.token)}`;
for(let hop=0;hop<4;hop++){
  const b=await fetch(url,{headers:H});
  const t=await b.text();
  console.log('hop',hop,b.status,'len',t.length,'url',url.replace(ORIGIN,''));
  const next=t.match(/window\.location\.replace\(["']([^"']+)["']\)/);
  if(!next){ console.log('--- body head ---'); console.log(t.slice(0,700)); break; }
  url=next[1].startsWith('http')?next[1]:ORIGIN+next[1];
}
