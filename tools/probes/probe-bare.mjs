import fs from 'node:fs'; import path from 'node:path';
const CW='mirror/leqixiang/courseware';
const hits=new Map();
for(const f of fs.readdirSync(CW).filter(x=>x.endsWith('.html'))){
  const h=fs.readFileSync(path.join(CW,f),'utf8');
  for(const m of h.matchAll(/https:\/\/[A-Za-z0-9._-]+(?:\/[^\s"'`)<>]*)?/g)){
    const u=m[0];
    if(/^https:\/\/[A-Za-z0-9._-]+\/?$/.test(u)){
      const i=h.indexOf(u);
      const ctx=h.slice(Math.max(0,i-70),i+u.length+20).replace(/\s+/g,' ');
      hits.set(u,(hits.get(u)||new Set()).add(ctx.slice(0,140)));
    }
  }
}
for(const [u,set] of hits){ console.log('###',u); for(const c of set) console.log('   ',c); }
