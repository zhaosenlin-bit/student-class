/* camera-launch 这条路还能不能拿到正文 */
import fs from 'node:fs';
const ORIGIN='https://aifunengjiaoyu.com';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const TOKEN=fs.readFileSync('recon/scratch/afe-token.txt','utf8').trim();
const H={Authorization:`Bearer ${TOKEN}`,'User-Agent':UA,Referer:`${ORIGIN}/`,'Content-Type':'application/json'};
for(const id of [633,469,616,180,506,624]){
  const a=await fetch(`${ORIGIN}/api/programs/${id}/access-token`,{headers:H});
  const at=await a.text();
  console.log(id,'access-token ->',a.status,at.slice(0,150));
  const c=await fetch(`${ORIGIN}/api/programs/${id}/camera-launch`,{method:'POST',headers:H,body:'{}'});
  const ct=await c.text();
  console.log('   camera-launch ->',c.status,ct.slice(0,220));
}
