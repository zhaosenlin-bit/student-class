import fs from 'node:fs'; import path from 'node:path';
const dir='recon/scratch';
const LQ='mirror/leqixiang/courseware';
const still=new Map();
for(const f of fs.readdirSync(dir).filter(x=>/^lq-batch-report.*\.json$/.test(x))){
  for(const row of JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'))){
    for(const line of row.failed||[]){
      const m=/^\d{3} \/api\/program-assets\/([^/]+)\/(.+)$/.exec(line);
      if(!m) continue;
      const [,localId,rel]=m;
      if(rel.startsWith('_ext/')) continue;
      const t=path.join(LQ,`${localId}.assets`,rel);
      if(fs.existsSync(t)&&fs.statSync(t).size>0) continue;
      if(!still.has(localId)) still.set(localId,new Set());
      still.get(localId).add(rel);
    }
  }
}
let n=0;
for(const [k,v] of still){ console.log(k, v.size, [...v].slice(0,6).join(', ')); n+=v.size; }
console.log('仍缺的正文素材：',still.size,'门课件 /',n,'个文件');
