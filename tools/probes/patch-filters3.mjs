import fs from 'node:fs';
const p='tools/lq-gallery-filters.js';
let s=fs.readFileSync(p,'utf8');
const anchor="  return `<div class=\"download-gallery-controls\">";
if(!s.includes(anchor)){ console.error('anchor missed'); process.exit(1); }
const decl = [
  "  const visible=catalog.filter(p=>matchesOrigin(p,originFilter)&&(!authorFilter||String(p.creatorId)===authorFilter));",
  "  const localCount=visible.filter(p=>p.localInstalled).length;",
  "  const missingCount=visible.length-localCount;",
  "",
].join("\n");
s=s.replace(anchor, decl + anchor);
if(!s.includes("const localCount=visible.filter")){ console.error('insert failed'); process.exit(1); }
fs.writeFileSync(p,s);
console.log('declared');
