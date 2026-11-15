#!/usr/bin/env node
import fs from 'node:fs';
const ORIGIN='https://aifunengjiaoyu.com';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const TOKEN=fs.readFileSync('recon/scratch/afe-token.txt','utf8').trim();
const r=await fetch(`${ORIGIN}/play/841`,{headers:{'User-Agent':UA,Referer:`${ORIGIN}/`,Authorization:`Bearer ${TOKEN}`}});
const t=await r.text();
const i=t.indexOf('<script');
fs.writeFileSync('recon/scratch/afe-play-841.html',t);
console.log(t.slice(i, i+6000));
