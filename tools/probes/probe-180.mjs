import fs from 'node:fs';
const h=fs.readFileSync('mirror/aifunengjiaoyu/courseware/180.html','utf8');
const base=h.match(/<base[^>]*href="([^"]+)"/i)?.[1];
console.log('stored base:',base);
if(base){
  const lease=base.match(/\/t\/([^/]+)\//)?.[1];
  const payload=lease?JSON.parse(Buffer.from(lease.split('.')[0],'base64url').toString()):null;
  console.log('lease exp:',payload&&new Date(payload.exp*1000).toISOString(),'now:',new Date().toISOString());
  for(const f of ['nezha.png','wukong.png']){
    const u='https://aifunengjiaoyu.com'+base+f;
    const r=await fetch(u,{headers:{'User-Agent':'Mozilla/5.0'}});
    console.log(f,'->',r.status,r.headers.get('content-type'),r.headers.get('content-length'));
  }
}
