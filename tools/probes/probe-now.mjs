#!/usr/bin/env node
/* 当前线上通道还有哪些是通的 */
import fs from 'node:fs';
const ORIGIN = 'https://aifunengjiaoyu.com';
const TOKEN = fs.readFileSync('recon/scratch/afe-token.txt','utf8').trim();
const H = { Authorization:`Bearer ${TOKEN}`, Origin: ORIGIN, 'X-Premium-Catalogue-Intent':'cataloguing' };

async function j(url, opts={}) {
  const r = await fetch(url, { ...opts, headers: { ...H, ...(opts.headers||{}) } });
  const t = await r.text();
  let p=null; try{p=JSON.parse(t)}catch{}
  return { status:r.status, json:p, text:t.slice(0,300) };
}

// 1) token 身份
const me = await j(`${ORIGIN}/api/me`);
console.log('me:', me.status, JSON.stringify(me.json||me.text).slice(0,400));

// 2) premium access 现状
const acc = await j(`${ORIGIN}/api/premium/access`);
console.log('access:', acc.status);
const courses = acc.json?.courses || {};
const keys = Object.keys(courses);
const reasons = {};
for (const k of keys) { const r = String(courses[k].reason); reasons[r]=(reasons[r]||0)+1; }
console.log('access reason histogram:', JSON.stringify(reasons));
console.log('access other keys:', JSON.stringify(Object.fromEntries(Object.entries(acc.json||{}).filter(([k])=>k!=='courses'))).slice(0,1200));
const sampleIds = keys.filter(k=>courses[k].sampleAvailable);
console.log('sampleAvailable:', sampleIds.length, sampleIds.join(','));
