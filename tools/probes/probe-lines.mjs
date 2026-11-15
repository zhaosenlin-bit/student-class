import fs from 'node:fs';
const h=fs.readFileSync('mirror/leqixiang/site/app.js','utf8').split(/\r?\n/);
for(const n of [166,237]) console.log(n+': '+h[n-1]);
