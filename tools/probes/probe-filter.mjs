import fs from 'node:fs';
const h=fs.readFileSync('mirror/leqixiang/site/app.js','utf8');
const lines=h.split(/\r?\n/);
lines.forEach((l,i)=>{ if(/priceFilter|originFilter|editionFilter/.test(l) && /filter|match|const |=>|function/.test(l)) console.log((i+1)+': '+l.slice(0,240)); });
