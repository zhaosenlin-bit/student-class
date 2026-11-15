#!/usr/bin/env node
/* 试看会话：全新 requestId 重开 */
import fs from 'node:fs';
const ORIGIN='https://aifunengjiaoyu.com';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const TOKEN=fs.readFileSync('recon/scratch/afe-token.txt','utf8').trim();
const H={Authorization:`Bearer ${TOKEN}`,'Content-Type':'application/json'};
function rid(){return Array.from(crypto.getRandomValues(new Uint8Array(24)),v=>v.toString(16).padStart(2,'0')).join('');}

async function post(url,body){
  const r=await fetch(ORIGIN+url,{method:'POST',headers:{...H,'User-Agent':UA,Referer:`${ORIGIN}/`},body:JSON.stringify(body||{})});
  const t=await r.text(); let j=null; try{j=JSON.parse(t)}catch{}
  return {status:r.status,json:j,text:t.slice(0,300)};
}
async function get(url){
  const r=await fetch(ORIGIN+url,{headers:{...H,'User-Agent':UA,Referer:`${ORIGIN}/`}});
  const t=await r.text(); let j=null; try{j=JSON.parse(t)}catch{}
  return {status:r.status,json:j,text:t.slice(0,300)};
}

const trials=await get('/api/trials');
console.log('trials:',trials.status,JSON.stringify(trials.json||trials.text).slice(0,600));

for(const pid of [841,811,842,1016,1360]){
  const r=await post(`/api/reviewed-course-session/${pid}/open`,{requestId:rid()});
  console.log(`open ${pid} ->`,r.status,JSON.stringify(r.json||r.text).slice(0,500));
  if(r.status===200&&r.json){
    const opened=r.json;
    const entries=opened.descriptor?.entries||[];
    console.log('   adapter',opened.adapter,'accessType',opened.binding?.accessType,'trialRemaining',opened.trialRemaining,'uses',opened.uses,'allowed',JSON.stringify(opened.allowedEntryIds));
    console.log('   entries',entries.map(e=>e.id+'|'+e.title+'|'+e.path).join(' ; ').slice(0,600));
    const m=await post(`/api/reviewed-course-session/session/${opened.id}/mount`,{entry:opened.descriptor.defaultReturn});
    console.log('   mount ->',m.status,JSON.stringify(m.json||m.text).slice(0,300));
  }
}
