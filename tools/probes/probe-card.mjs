import fs from 'node:fs';
for(const f of ['app.js','catalog-browse.js','library-view.js','catalog-search.js','download-store.js']){
  const p='mirror/leqixiang/site/'+f;
  const h=fs.readFileSync(p,'utf8');
  const lines=h.split(/\r?\n/);
  lines.forEach((l,i)=>{ if(/priceText|catalogBuyText|product-card/.test(l)) console.log(f+':'+(i+1)+': '+l.slice(0,300)); });
}
