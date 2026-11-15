import fs from 'node:fs'; import path from 'node:path';
const CW='mirror/leqixiang/courseware';
const set=new Set();
for(const f of fs.readdirSync(CW).filter(x=>x.endsWith('.html'))){
  const h=fs.readFileSync(path.join(CW,f),'utf8');
  for(const m of h.matchAll(/https:\/\/cdn\.tailwindcss\.com[^\s"'`)<>]*/g)) set.add(m[0]);
}
console.log([...set].join('\n')||'(none)');
