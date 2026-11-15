import fs from 'node:fs'; import path from 'node:path';
const CW='mirror/leqixiang/courseware';
const set=new Map();
for(const f of fs.readdirSync(CW).filter(x=>x.endsWith('.html'))){
  const h=fs.readFileSync(path.join(CW,f),'utf8');
  for(const m of h.matchAll(/fonts\.googleapis\.com\/[^"'\s<>)]+/g)){
    const u=m[0];
    const i=h.indexOf(u);
    set.set(u,(h.slice(Math.max(0,i-60),i+u.length+10)).replace(/\s+/g,' '));
  }
}
for(const [u,ctx] of set) console.log('*',u,'\n   ctx:',ctx.slice(0,150));
