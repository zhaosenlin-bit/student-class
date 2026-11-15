import fs from 'node:fs'; import path from 'node:path';
const SHARED='mirror/leqixiang/_shared-ext';
const css=fs.readFileSync(path.join(SHARED,'fonts.googleapis.com','css2'),'utf8');
const set=new Set();
for(const m of css.matchAll(/url\(\/_shared\/fonts\.gstatic\.com\/([^)]+)\)/g)) set.add(m[1]);
let missing=[];
for(const rel of set){
  const t=path.join(SHARED,'fonts.gstatic.com',rel.split('?')[0]);
  if(!fs.existsSync(t)||fs.statSync(t).size===0) missing.push(rel);
}
console.log('样式表引用字形',set.size,'本地缺',missing.length);
if(missing.length) console.log(missing.slice(0,10).join('\n'));
