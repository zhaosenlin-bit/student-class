import {browserAccount,mountLongMarchSaveHost} from './long-march-save-host.mjs';
// Trusted website only; the login credential never reaches courseware.
export async function prepareLongMarchPlayback(programId) {
  if(![498,754].includes(Number(programId)))return null;
  const account=browserAccount(),bearer=localStorage.getItem('aiedu_token');
  if(!account||!bearer)throw Error('请先登录后打开课件。');
  const current=()=>browserAccount()===account&&localStorage.getItem('aiedu_token')===bearer;
  const request=async(action,body)=>{
    if(!current())throw Error('PUBLIC_LEASE');
    const r=await fetch('/api/programs/'+programId+'/long-march-playback/'+action,{method:'POST',credentials:'same-origin',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+bearer},body:JSON.stringify(body)});
    const data=await r.json();
    if(data.error==='LONG_MARCH_TRIAL_EXHAUSTED')throw Error('LONG_MARCH_TRIAL_EXHAUSTED');
    if(!current()||!r.ok)throw Error(r.status===403||r.status===401?'PUBLIC_LEASE':'播放连接暂时不可用，请稍后重试。');return data;
  };
  const status=await request('status',{});if(status.enabled===false)return null;if(status.enabled!==true)throw Error('PUBLIC_LEASE');
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([account,bearer,programId])));
  const key='turing.longMarch.playback.v1:'+Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  let saved=null;try{saved=JSON.parse(sessionStorage.getItem(key)||'null');}catch{throw Error('播放记录无法读取，请关闭本页后重新打开。');}
  const restart=()=>sessionStorage.removeItem(key);
  if(!saved){saved={requestId:Array.from(crypto.getRandomValues(new Uint8Array(24)),b=>b.toString(16).padStart(2,'0')).join('')};sessionStorage.setItem(key,JSON.stringify(saved));}
  if(!/^[a-f0-9]{48}$/.test(saved.requestId||'')||(saved.id!==undefined&&!/^[a-f0-9]{48}$/.test(saved.id)))throw Error('播放记录无法读取，请关闭本页后重新打开。');
  let opened;
  try{opened=await request(saved.id?'resume':'open',saved.id?{id:saved.id}:{requestId:saved.requestId});}
  catch(error){
    if(error.message==='LONG_MARCH_TRIAL_EXHAUSTED'){restart();const e=Error('三次试用已用完，请购买作品或成为会员后继续使用。');e.trialExhausted=true;throw e;}
    if(error.message==='PUBLIC_LEASE'){const e=Error('上次播放会话已结束或当前权限已变化。可重新开始播放；试用会按现有规则计次。');e.resetPlayback=restart;throw e;}throw error;
  }
  if(!/^[a-f0-9]{48}$/.test(opened.id||'')||opened.binding?.programId!==Number(programId)||
    !new RegExp('^/api/program-file/'+programId+'/body\\?token=lm1\\.'+opened.id+'\\.[a-f0-9]{48}$').test(opened.url||''))throw Error('PUBLIC_LEASE');
  saved.id=opened.id;sessionStorage.setItem(key,JSON.stringify(saved));
  const {createPublicLease}=await import('/admin-large/runtime/public-lease.mjs');
  let mounted=false,disposed=false;
  const control=(action)=>request(action,{id:opened.id});
  return {...opened,async mount(frame){
    if(mounted||disposed||!current())throw Error('PUBLIC_LEASE');mounted=true;
    const save=await mountLongMarchSaveHost(frame,account,()=>current()?account:'');
    const notice=document.createElement('div');notice.setAttribute('role','alert');notice.hidden=true;
    notice.style='position:absolute;top:8px;left:50%;transform:translateX(-50%);z-index:30;background:#59251d;color:#fff3db;padding:8px 14px;border-radius:8px';frame.parentElement.append(notice);
    const lease=createPublicLease({binding:opened.binding,renew:()=>control('renew'),onStatus:(ok,revoked)=>{
      notice.hidden=ok;notice.textContent=revoked?'播放权限已变化，请关闭课件并核对登录或购买状态。':'正在恢复播放连接，请稍候。';
    }});
    const resume=()=>{if(!disposed&&document.visibilityState!=='hidden')void lease.refresh().catch(()=>{});};
    const stop=()=>{if(disposed)return;disposed=true;lease.close();save.close();notice.remove();window.removeEventListener('pageshow',resume);window.removeEventListener('online',resume);window.removeEventListener('pagehide',stop);document.removeEventListener('visibilitychange',resume);};
    window.addEventListener('pageshow',resume);window.addEventListener('online',resume);window.addEventListener('pagehide',stop);document.addEventListener('visibilitychange',resume);
    return {checkpoint:save.checkpoint,flush:save.flush,close(){stop();try{if(JSON.parse(sessionStorage.getItem(key)||'null')?.id===opened.id)restart();}catch{}void control('close').catch(()=>{});}};
  }};
}
