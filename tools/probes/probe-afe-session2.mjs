#!/usr/bin/env node
import fs from 'node:fs';
const ORIGIN='https://aifunengjiaoyu.com';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const TOKEN=fs.readFileSync('recon/scratch/afe-token.txt','utf8').trim();
const H={Authorization:`Bearer ${TOKEN}`,'Content-Type':'application/json',Origin:ORIGIN,Referer:`${ORIGIN}/play/841`,'Sec-Fetch-Site':'same-origin','Sec-Fetch-Mode':'cors','Sec-Fetch-Dest':'empty'};
function rid(){return Array.from(crypto.getRandomValues(new Uint8Array(24)),v=>v.toString(16).padStart(2,'0')).join('');}
async function post(url,body){
  const r=await fetch(ORIGIN+url,{method:'POST',headers:{...H,'User-Agent':UA},body:JSON.stringify(body||{})});
  const t=await r.text(); let j=null; try{j=JSON.parse(t)}catch{}
  return {status:r.status,json:j,text:t.slice(0,400)};
}
for(const pid of [841,811,842,1016,1360]){
  const r=await post(`/api/reviewed-course-session/${pid}/open`,{requestId:rid()});
  console.log(`open ${pid} ->`,r.status,JSON.stringify(r.json||r.text).slice(0,600));
  if(r.status===200&&r.json?.id){
    const opened=r.json;
    console.log('   adapter',opened.adapter,'accessType',opened.binding?.accessType,'trialRemaining',opened.trialRemaining,'uses',opened.uses);
    console.log('   allowed',JSON.stringify(opened.allowedEntryIds));
    console.log('   entries',(opened.descriptor?.entries||[]).map(e=>`${e.id}|${e.title}|${e.path}|keys=${JSON.stringify(e.keys)}`).join('\n     ').slice(0,900));
    const m=await post(`/api/reviewed-course-session/session/${opened.id}/mount`,{entry:opened.descriptor.defaultReturn});
    console.log('   mount ->',m.status,JSON.stringify(m.json||m.text).slice(0,400));
    if(m.json?.prefix){
      const entry=(opened.descriptor.entries||[]).find(e=>e.id===opened.descriptor.defaultReturn);
      const u=ORIGIN+m.json.prefix+entry.path.split('/').map(encodeURIComponent).join('/');
      const g=await fetch(u,{headers:{'User-Agent':UA,Referer:`${ORIGIN}/play/${pid}`}});
      const gt=await g.text();
      console.log('   frame GET',u.replace(ORIGIN,''),'->',g.status,g.headers.get('content-type'),gt.length);
      fs.writeFileSync(`recon/scratch/afe-${pid}-entry.html`,gt);
    }
    await post(`/api/reviewed-course-session/session/${opened.id}/close`,{});
  }
}
