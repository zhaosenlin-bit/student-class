import fs from 'node:fs';
const h=fs.readFileSync('mirror/leqixiang/courseware/afe-180.html','utf8');
for(const n of ['nezha','wukong','erlang']){
  const i=h.indexOf(n);
  console.log('---',n, i>=0? h.slice(Math.max(0,i-260), i+120).replace(/\s+/g,' ') : 'not found');
}
