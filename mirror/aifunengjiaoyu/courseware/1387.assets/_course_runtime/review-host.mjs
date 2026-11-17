import {prepareReviewedSession} from './reviewed-session.mjs';
import {registerFrame} from './message-bridge.mjs';
const root=new URL('../',import.meta.url),config=await (await fetch(new URL('./adapter.json',import.meta.url))).json();
const selector=document.querySelector('#entry'),status=document.querySelector('#status'),slot=document.querySelector('#frame');
const declaration={schema:'leqixiang-reviewed-runtime/v1',entries:[
 {id:config.defaultReturn,path:'_review.html',keys:[],destinations:config.entries.map(row=>row.id)},
 ...config.entries.map(row=>({id:row.id,path:row.path,keys:row.keys,destinations:[config.defaultReturn,...config.entries.map(e=>e.id)]}))]};
for(const entry of config.entries){const option=document.createElement('option');option.value=entry.id;option.textContent=entry.title;selector.append(option);}
const adapter=(await import(new URL(config.navigationModule,import.meta.url))).createHostAdapter(config);
const logs=[];let current=null,busy=false;
const report=value=>{logs.push(value);if(logs.length>30)logs.shift();status.textContent=logs.join('\n');};
function retire(){const old=current;current=null;old?.prepared.close();old?.registration.close();slot.replaceChildren();}
async function resourceSession(action,body={}){
 if(!config.resourcePolicy)return {prefix:root.pathname};
 const response=await fetch(new URL('../_session/'+action,import.meta.url),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 if(!response.ok)throw Error('RESOURCE_SESSION');return response.json();
}
async function mount(id,query=''){
 if(busy)throw Error('BUSY');busy=true;
 try{
  retire();await resourceSession('revoke');if(id===config.defaultReturn){report('已保存并返回本地目录');return;}
  const entry=config.entries.find(row=>row.id===id);if(!entry)throw Error('ENTRY');
  const frame=document.createElement('iframe');frame.title=entry.title;frame.setAttribute('sandbox','allow-scripts');frame.allow='autoplay; fullscreen';
  const mount={id,prepared:null,registration:null,pending:null,session:crypto.randomUUID()};current=mount;
  const context={environment:'local',principalId:'local-owner-simulation',programId:config.profile,
   revision:config.runtimeDigest,policyDigest:config.runtimeDigest,chapter:id,session:mount.session};
  const read=async chapter=>{const prepared=await prepareReviewedSession({declaration,context:{...context,chapter},storage:localStorage,locks:navigator.locks,isCurrent:()=>current===mount,authorize:async()=>current===mount,onNavigate:async()=>{throw Error('READ_ONLY');}});try{return {...prepared.hostOptions.snapshot};}finally{prepared.close();}};
  mount.prepared=await prepareReviewedSession({declaration,context,storage:localStorage,locks:navigator.locks,
   projectSnapshot:values=>adapter.project(entry,values,read),
   isCurrent:()=>current===mount,authorize:async()=>current===mount,
   onNavigate:async target=>{if(current!==mount)throw Error('REVOKED');const nextQuery=await adapter.navigate(id,target,read);if(current!==mount)throw Error('REVOKED');mount.pending={id:target.id,query:nextQuery};},settings:{volume:.5,muted:true}});
  mount.registration=registerFrame(window,frame,{...mount.prepared.hostOptions,onStatus:value=>{
   if(current!==mount)return;report(entry.title+'：'+value);
   if(value==='closed'&&mount.pending){const next=mount.pending;mount.pending=null;queueMicrotask(()=>run(()=>mountEntry(next.id,next.query)));}
  }});
  const grant=await resourceSession('mount',{entry:id});
  frame.src=new URL(grant.prefix+entry.path+query,location.origin);slot.append(frame);report('已打开：'+entry.title);
 }catch(error){retire();await resourceSession('revoke').catch(()=>{});throw error;}finally{busy=false;}
}
const mountEntry=(id,query)=>mount(id,query);
async function checkpoint(){if(!current)throw Error('NO_ACTIVE_ENTRY');const session=current.registration?.session();if(!session||session.status()!=='ready')throw Error('ENTRY_NOT_READY');await session.control('checkpoint');report('保存已确认：'+current.id);}
async function run(fn){try{await fn();}catch(error){report('未完成：'+error.message);}}
document.querySelector('#open').onclick=()=>run(async()=>{if(current)await checkpoint();adapter.reset();await mount(selector.value);});
document.querySelector('#save').onclick=()=>run(checkpoint);
document.querySelector('#home').onclick=()=>run(async()=>{await checkpoint();retire();await resourceSession('revoke');adapter.reset();report('已保存并返回本地目录');});
window.addEventListener('pagehide',()=>{retire();if(config.resourcePolicy)fetch(new URL('../_session/revoke',import.meta.url),{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',keepalive:true}).catch(()=>{});});
report('仅本机管理员完整预览；根地图/返回适配为本地候选，试用章节权限尚未验收。');
