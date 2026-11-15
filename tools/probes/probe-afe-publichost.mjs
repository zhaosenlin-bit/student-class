#!/usr/bin/env node
import fs from 'node:fs';
const ORIGIN='https://aifunengjiaoyu.com';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const r=await fetch(`${ORIGIN}/admin-large/runtime/public-host.mjs`,{headers:{'User-Agent':UA,Referer:`${ORIGIN}/play/841`}});
const t=await r.text();
fs.writeFileSync('recon/scratch/afe-public-host.mjs',t);
console.log('status',r.status,'len',t.length);
console.log(t.slice(0,6000));
