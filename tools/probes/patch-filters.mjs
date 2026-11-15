import fs from 'node:fs';
const p='tools/lq-gallery-filters.js';
let s=fs.readFileSync(p,'utf8');
const before=s;

s=s.replace(
  "    if(priceFilter!=='全部'&&p.mode!==(priceFilter==='免费'?'free':'paid'))continue;",
  "    if(priceFilter==='本地'&&!p.localInstalled)continue;\n    if(!['全部','本地'].includes(priceFilter)&&p.mode!==(priceFilter==='免费'?'free':'paid'))continue;"
);

s=s.replace(
  '<div class="download-usage-tabs" role="group" aria-label="按下载方式筛选">${[[\'全部\',\'全部资源\'],[\'免费\',\'免费下载\'],[\'付费\',\'付费资源\']]',
  '<div class="download-usage-tabs" role="group" aria-label="按可用性筛选">${[[\'全部\',\'全部资源\'],[\'本地\',\'本地可用\'],[\'免费\',\'免费下载\'],[\'付费\',\'付费资源\']]'
);

if(s===before){ console.error('no change'); process.exit(1); }
if(!s.includes("['本地','本地可用']")){ console.error('tabs patch missed'); process.exit(1); }
if(!s.includes("priceFilter==='本地'&&!p.localInstalled")){ console.error('counts patch missed'); process.exit(1); }
fs.writeFileSync(p,s);
console.log('filters patched');
