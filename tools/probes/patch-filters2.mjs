import fs from 'node:fs';
const p='tools/lq-gallery-filters.js';
let s=fs.readFileSync(p,'utf8');
const before=s;

s=s.replace(
  "    if(priceFilter==='本地'&&!p.localInstalled)continue;\n    if(!['全部','本地'].includes(priceFilter)&&p.mode!==(priceFilter==='免费'?'free':'paid'))continue;",
  "    if(priceFilter==='本地'&&!p.localInstalled)continue;\n    if(priceFilter==='待补齐'&&p.localInstalled)continue;\n    if(!['全部','本地','待补齐'].includes(priceFilter)&&p.mode!==(priceFilter==='免费'?'free':'paid'))continue;"
);

s=s.replace(
  "const localCount=catalog.filter(p=>matchesOrigin(p,originFilter)&&(!authorFilter||String(p.creatorId)===authorFilter)&&p.localInstalled).length;",
  "const localCount=catalog.filter(p=>matchesOrigin(p,originFilter)&&(!authorFilter||String(p.creatorId)===authorFilter)&&p.localInstalled).length;\n  const missingCount=catalog.filter(p=>matchesOrigin(p,originFilter)&&(!authorFilter||String(p.creatorId)===authorFilter)&&!p.localInstalled).length;"
);

s=s.replace(
  "${[['全部','全部资源'],['本地','本地可用'],['免费','免费下载'],['付费','付费资源']]",
  "${[['全部','全部资源 '+catalog.length],['本地','本地可用 '+localCount],['待补齐','待补齐 '+missingCount]]"
);

if(s===before){ console.error('no change'); process.exit(1); }
for(const m of ["priceFilter==='待补齐'&&p.localInstalled","missingCount","待补齐 '"]){
  if(!s.includes(m)){ console.error('missed: '+m); process.exit(1); }
}
fs.writeFileSync(p,s);
console.log('filters updated');
