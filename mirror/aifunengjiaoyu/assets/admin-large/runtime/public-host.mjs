import {prepareReviewedSession} from './reviewed-session.mjs';
import {registerFrame} from './message-bridge.mjs';
import {createWebsiteAuthority} from './website-authority.mjs';
import {createPublicLease} from './public-lease.mjs';
import {createHostAdapter as franceAdapter} from './adapters/france-navigation.mjs';

const adapters={'france-1789-v1':franceAdapter,'basic-v1':()=>({reset(){},project:(_entry,values)=>values,navigate:async()=>''})};
const element=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};

// This is a trusted website module. Course bytes run only in the sandboxed
// frame; they never choose a policy, identity, storage namespace or asset URL.
export async function mountPublicRuntime(container,programId,request,{opened:provided=null}={}){
 const storageKey='turing-reviewed-session:'+programId;
 const pendingKey='turing-reviewed-launch:'+programId;
 const storageFailure=()=>Error('浏览器无法保存播放状态，请允许本站会话存储后再打开课件');
 function stopped(error){
  if(error.message!=='REVIEWED_PUBLIC_DENIED')return error;
  const result=Error('本次播放已结束或权益已变化。刷新不会重新计次；主动重新开始可能使用一次试用。');
  result.resetPlayback=()=>{
   try{sessionStorage.removeItem(storageKey);sessionStorage.removeItem(pendingKey);
    if(sessionStorage.getItem(storageKey)||sessionStorage.getItem(pendingKey))throw storageFailure();
   }catch{throw storageFailure();}
  };
  return result;
 }
 let storedId=null;
 try{const value=sessionStorage.getItem(storageKey);if(/^[a-f0-9]{48}$/.test(value))storedId=value;}catch{}
 let opened=provided;
 if(provided)storedId=null;
 else if(storedId){
  // Never fall through to a new trial-consuming launch after a refused
  // continuation. A later explicit reopen can begin a new session.
  try{opened=await request('/api/reviewed-course-session/session/'+storedId+'/resume',{programId:Number(programId)});}
  catch(error){
   throw stopped(error);
  }
 }else{
  let requestId=null;
  try{const value=sessionStorage.getItem(pendingKey);if(/^[a-f0-9]{48}$/.test(value))requestId=value;}catch{}
  if(!requestId)requestId=Array.from(crypto.getRandomValues(new Uint8Array(24)),v=>v.toString(16).padStart(2,'0')).join('');
  // Save only an opaque attempt ID before I/O. A refresh before the launch
  // response arrives replays that attempt rather than spending another trial.
  try{sessionStorage.setItem(pendingKey,requestId);if(sessionStorage.getItem(pendingKey)!==requestId)throw storageFailure();}
  catch{throw storageFailure();}
  try{opened=await request('/api/reviewed-course-session/'+encodeURIComponent(programId)+'/open',{requestId});}
  catch(error){throw stopped(error);}
 }
 if(opened.adapter==='long-march-v1'){
  if(!provided){sessionStorage.setItem(storageKey,opened.id);sessionStorage.removeItem(pendingKey);}
  const {mountVersionLongMarch}=await import('./version-long-march-host.mjs');
  return mountVersionLongMarch(container,opened,request,()=>{if(!provided&&sessionStorage.getItem(storageKey)===opened.id)sessionStorage.removeItem(storageKey);});
 }
 const config=opened.descriptor,allowed=new Set(opened.allowedEntryIds);
 if(!Array.isArray(opened.allowedEntryIds)||!config?.entries?.length||
    opened.allowedEntryIds.some(id=>!config.entries.some(entry=>entry.id===id))||
    !['test','prod'].includes(opened.environment))throw Error('PUBLIC_RUNTIME_PROFILE');
 const adapter=adapters[opened.adapter]?.(config);if(!adapter)throw Error('PUBLIC_RUNTIME_ADAPTER');
 try{if(!provided){sessionStorage.setItem(storageKey,opened.id);if(sessionStorage.getItem(storageKey)===opened.id)sessionStorage.removeItem(pendingKey);}}catch{}
 let active=true,current=null,busy=false;
 const box=element('section'),bar=element('div'),selector=element('select'),status=element('p'),slot=element('div');
 box.className='reviewed-public-player';bar.className='reviewed-public-controls';slot.className='reviewed-public-stage';
 selector.setAttribute('aria-label','选择课件章节');status.setAttribute('role','status');
 for(const entry of config.entries){
  const option=element('option',entry.title);option.value=entry.id;if(!allowed.has(entry.id))option.textContent='🔒 '+entry.title+' · 购买或会员解锁';
  selector.append(option);
 }
 const report=message=>{status.textContent=message;};
 const lockDialog=element('dialog');lockDialog.className='reviewed-public-lock-dialog';
 lockDialog.style.cssText='max-width:520px;padding:32px;border:1px solid #b29257;border-radius:18px;background:#20231f;color:#f5ead4;text-align:center;font:16px/1.8 system-ui';
 lockDialog.setAttribute('aria-label','解锁后续章节');
 const lockTitle=element('h2','🔒 解锁后续章节'),lockText=element('p','请购买作品或者成为会员解锁后续的章节。');
 const lockHelp=element('p','回到网站作品详情页购买或开通会员，完成后重新进入课件。'),lockClose=element('button','继续试用');
 lockClose.type='button';lockClose.style.cssText='padding:10px 24px;border:0;border-radius:9px;background:#e5c98f;color:#282119;font:inherit;cursor:pointer';
 lockClose.onclick=()=>lockDialog.close();lockDialog.append(lockTitle,lockText,lockHelp,lockClose);box.append(lockDialog);
 const showLocked=()=>{if(!lockDialog.open)lockDialog.showModal();};
 selector.onchange=()=>{if(!allowed.has(selector.value)){showLocked();if(current)selector.value=current.id;}};
 const declaration={schema:'turing-reviewed-runtime/v1',entries:[
  {id:config.defaultReturn,path:'_turing_runtime/launch.html',keys:[],destinations:config.entries.map(e=>e.id)},
  ...config.entries.map(e=>({id:e.id,path:e.path,keys:e.keys,destinations:[config.defaultReturn,...config.entries.map(r=>r.id)]}))]};
 const live=mount=>active&&box.isConnected&&current===mount;
 const command=(action,body={})=>request('/api/reviewed-course-session/session/'+opened.id+'/'+action,body);
 let leaseInterrupted=false;
 const lease=createPublicLease({binding:opened.binding,renew:()=>command('renew'),onStatus:(ok,revoked)=>{
  if(!active)return;
  if(revoked){retire();report('登录或课程权益已变化，请重新打开课件');return;}
  if(!ok){leaseInterrupted=true;report('正在恢复播放连接，请稍候…');}
  else if(leaseInterrupted){leaseInterrupted=false;report('');}
 }});
 function retire(){const old=current;current=null;old?.authority?.close();old?.prepared?.close();old?.registration?.close();slot.replaceChildren();}
 async function checkpoint(){
  const session=current?.registration?.session();if(!session||session.status()!=='ready')throw Error('课件尚未准备好保存');
  await session.control('checkpoint');report('进度已保存');
 }
 async function mount(id,query=''){
  if(id!==config.defaultReturn&&!allowed.has(id)){showLocked();return;}
  retire();await command('unmount');if(!active)return;
  if(id===config.defaultReturn){report('已返回课件目录');return;}
  if(!allowed.has(id))throw Error('此章节尚未解锁');
  const entry=config.entries.find(e=>e.id===id);if(!entry)throw Error('章节不存在');
  const frame=element('iframe');frame.title=entry.title;frame.setAttribute('sandbox','allow-scripts');
  frame.allow='autoplay; fullscreen';frame.referrerPolicy='no-referrer';frame.loading='eager';
  const mountState={id,prepared:null,registration:null,authority:null,pending:null,session:crypto.randomUUID()};current=mountState;
  const context={environment:opened.environment,principalId:opened.principalId,programId:opened.binding.programId,
   revision:opened.binding.revision,policyDigest:opened.binding.policyDigest,chapter:id,session:mountState.session};
  const authorityFor=chapter=>{
   let closed=false;
   return {close(){closed=true;},authorize:input=>lease.withBinding(async binding=>{
    const authority=createWebsiteAuthority({declaration,context:{...context,chapter},binding,
     isCurrent:()=>!closed&&live(mountState),checkEntry:({path,signal})=>{
      if(signal?.aborted)throw Error('REVOKED');const target=declaration.entries.find(e=>e.path===path);
      if(!target)throw Error('ENTRY');return command('check',{entry:target.id});
     }});
    try{return await authority.authorize(input);}finally{authority.close();}
   })};
  };
  const read=async chapter=>{
   // Projection may ask for peers to summarize progress. Never read a paid
   // chapter's local record from a trial session, even on this same browser.
   if(!allowed.has(chapter))return {};
   const authority=authorityFor(chapter);let prepared;
   try{prepared=await prepareReviewedSession({declaration,context:{...context,chapter},storage:localStorage,locks:navigator.locks,
    authorize:authority.authorize,isCurrent:()=>live(mountState),onNavigate:async()=>{throw Error('READ_ONLY');}});
    return {...prepared.hostOptions.snapshot};}
   finally{authority.close();prepared?.close();}
  };
  try{
   mountState.authority=authorityFor(id);
   mountState.prepared=await prepareReviewedSession({declaration,context,storage:localStorage,locks:navigator.locks,
    authorize:mountState.authority.authorize,isCurrent:()=>live(mountState),
    projectSnapshot:values=>adapter.project(entry,values,read),
    onNavigate:async(target,{signal})=>{
     if(!allowed.has(target.id))throw Error('CHAPTER_LOCKED');
     const nextQuery=await adapter.navigate(id,target,read);
     if(!live(mountState)||signal.aborted)throw Error('REVOKED');
     mountState.pending={id:target.id,query:nextQuery};
    }});
   // A manual checkpoint can wait behind an autosave. Its outer acknowledgement
   // budget must exceed the nested, independently bounded save operations.
   mountState.registration=registerFrame(window,frame,{...mountState.prepared.hostOptions,controlTimeoutMs:15000,onStatus:code=>{
    if(!live(mountState))return;
    if(code==='ready')report('');
    if(code==='closed'&&mountState.pending){const next=mountState.pending;mountState.pending=null;queueMicrotask(()=>run(()=>mount(next.id,next.query)));}
   }});
   const grant=await command('mount',{entry:id});if(!live(mountState))throw Error('REVOKED');
   frame.src=grant.prefix+entry.path.split('/').map(encodeURIComponent).join('/')+query;
   slot.append(frame);selector.value=id;report('正在打开章节…');
  }catch(error){if(current===mountState){retire();await command('unmount').catch(()=>{});}throw error;}
 }
 async function run(work){if(busy||!active)return;busy=true;try{await work();}catch(error){report(error.message==='SAVE_FAILED'?'进度暂未保存，请保持当前页面，稍后点击“保存进度”重试。':'章节未能打开或保存：'+error.message);}finally{busy=false;}}
 const openButton=element('button','打开章节'),saveButton=element('button','保存进度'),returnButton=element('button','返回课件首页');
 for(const button of [openButton,saveButton,returnButton])button.type='button';
 openButton.onclick=()=>void run(async()=>{if(!allowed.has(selector.value)){showLocked();return;}if(current)await checkpoint();adapter.reset();await mount(selector.value);});
 saveButton.onclick=()=>void run(checkpoint);
 returnButton.onclick=()=>void run(async()=>{if(current)await checkpoint();adapter.reset();await mount(config.courseReturn);});
 bar.append(selector,openButton,saveButton,returnButton,status);box.append(bar,slot);container.append(box);
 const resume=()=>{if(active&&document.visibilityState!=='hidden')void lease.refresh().catch(()=>{});};
 window.addEventListener('online',resume);document.addEventListener('visibilitychange',resume);
 let observer;
 function dispose(retainSession){if(!active)return;active=false;lease.close();observer?.disconnect();retire();box.remove();window.removeEventListener('pagehide',pagehide);window.removeEventListener('pageshow',resume);window.removeEventListener('online',resume);document.removeEventListener('visibilitychange',resume);
  if(!retainSession){try{if(sessionStorage.getItem(storageKey)===opened.id)sessionStorage.removeItem(storageKey);}catch{}void command('close').catch(()=>{});}}
 function close(){dispose(false);}
 function pagehide(event){if(!event.persisted)dispose(true);}
 observer=new MutationObserver(()=>{if(!box.isConnected)close();});observer.observe(document.body,{childList:true,subtree:true});
 window.addEventListener('pagehide',pagehide);window.addEventListener('pageshow',resume);
 // A launch may have succeeded even if the first chapter mount lost its
 // response. Retain its grant so refresh cannot consume another trial.
 try{await mount(config.courseReturn);}catch(error){dispose(true);throw stopped(error);}
 return {close,accessType:opened.binding.accessType,trialRemaining:opened.trialRemaining,uses:opened.uses};
}
