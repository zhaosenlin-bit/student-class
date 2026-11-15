import fs from 'node:fs';
for(const f of ['catalog-browse.js','library-view.js','catalog-search.js','app.js']){
  const p='mirror/leqixiang/site/'+f;
  const h=fs.readFileSync(p,'utf8');
  const i=h.indexOf('function browseCatalog');
  if(i>=0){ console.log('=== '+f); console.log(h.slice(i, i+2200)); }
}
