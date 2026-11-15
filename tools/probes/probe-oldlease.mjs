/* 旧租约还能不能读素材 */
import fs from 'node:fs';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
for(const id of [633,469,616,180,506,624]){
  const h=fs.readFileSync(`mirror/aifunengjiaoyu/courseware/${id}.html`,'utf8');
  const base=h.match(/<base[^>]*href="([^"]+)"/i)?.[1];
  if(!base){ console.log(id,'no base'); continue; }
  for(const f of ['model.glb','bg/quanguo.png','nezha.png','src/main.js']){
    const u='https://aifunengjiaoyu.com'+base+f;
    const r=await fetch(u,{headers:{'User-Agent':UA}});
    const len=r.headers.get('content-length');
    console.log(id,f,'->',r.status,len,r.headers.get('content-type'));
  }
}
