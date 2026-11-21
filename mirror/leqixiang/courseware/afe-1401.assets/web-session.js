/* Course-owned compatibility for the existing isolated, authenticated device page.
 * It does not mint tokens, grant rights, load fetched scripts, or upload recordings.
 * Existing /run reads also log a use; they do not consume another trial without
 * a new launch token. This adapter does not extend the parent session lifetime. */
(function(){
 'use strict';
 const match=/^\/run\/(\d+)$/.exec(location.pathname);
 if(!match||!['','testplay.localhost'].includes(location.hostname))return;
 const id=match[1],base=document.querySelector('head > base');if(!base)return;
 let pending=null,lastError=false;
 function inspect(raw){
  const url=new URL(raw,location.origin),prefix='/api/program-assets/'+id+'/t/';
  if(url.origin!==location.origin||url.username||url.password||url.search||url.hash||!url.pathname.startsWith(prefix))throw Error('资源入口不匹配');
  // ZIP staging adds a package/ directory. Preserve the server-provided entry
  // directory instead of treating it as part of the credential or dropping it.
  const parts=url.pathname.slice(prefix.length).split('/');
  if(parts.pop()!=='')throw Error('资源入口格式不匹配');
  const token=parts.shift();if(!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token||''))throw Error('资源入口格式不匹配');
  for(const segment of parts){
   let decoded;try{decoded=decodeURIComponent(segment)}catch{throw Error('资源入口格式不匹配')}
   if(!decoded||decoded==='.'||decoded==='..'||/[\\/%?#:\u0000-\u0020\u007f]/.test(decoded)||decoded.normalize('NFC')!==decoded)throw Error('资源入口格式不匹配');
  }
  const directory=parts.length?parts.join('/')+'/':'',part=token.split('.')[0];
  let value;try{value=JSON.parse(atob(part.replace(/-/g,'+').replace(/_/g,'/')))}catch{throw Error('资源入口格式不匹配')}
  if(String(value.p)!==id||value.purpose!=='protected_camera_asset'||!Number.isSafeInteger(value.exp))throw Error('资源入口不匹配');
  return {url:url.href,expires:value.exp*1000,directory};
 }
 function note(text){
  let box=document.getElementById('web-connection-note');
  if(!box){box=document.createElement('div');box.id='web-connection-note';box.setAttribute('role','status');Object.assign(box.style,{position:'fixed',top:'8px',left:'50%',transform:'translateX(-50%)',zIndex:'2147483646',maxWidth:'90vw',padding:'10px 18px',background:'#fff9e8',color:'#24443a',border:'1px solid #c2b78f',borderRadius:'12px',font:'14px system-ui',boxShadow:'0 3px 18px #0002'});document.body.appendChild(box)}
  box.textContent=text;box.hidden=!text;
 }
 async function renew(){
  if(pending)return pending;
  pending=(async()=>{
   const before=inspect(base.href),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
   try{
    const response=await fetch('/run/'+id,{credentials:'same-origin',cache:'no-store',redirect:'error',signal:controller.signal});
    if(!response.ok||!response.headers.get('content-type')?.includes('text/html'))throw Error('播放连接暂不可用');
    const text=await response.text();if(text.length>3145728)throw Error('播放页面大小不符');
    const doc=new DOMParser().parseFromString(text,'text/html'),nodes=doc.querySelectorAll('head > base');
    if(nodes.length!==1)throw Error('资源入口不匹配');
    const next=inspect(nodes[0].getAttribute('href'));
    if(next.directory!==before.directory)throw Error('资源入口目录已变化');
    if(next.expires<=Date.now()+10000)throw Error('本次播放会话已到期');
    // The server authorizes this new asset grant against its existing HttpOnly
    // session. No launch call, trial consumption or session extension occurs.
    base.href=next.url;lastError=false;note('');return {previousExpiry:before.expires,expires:next.expires};
   }finally{clearTimeout(timer)}
  })().catch(error=>{lastError=true;note('播放连接暂未恢复，请从网站重新打开课件；本机已保存的记录会保留。');throw error}).finally(()=>{pending=null});
  return pending;
 }
 function nearlyExpired(){try{return inspect(base.href).expires-Date.now()<90000}catch{return true}}
 function check(){if(!document.hidden&&nearlyExpired())renew().catch(()=>{});}
 setInterval(check,30000);document.addEventListener('visibilitychange',check);window.addEventListener('focus',check);
 document.addEventListener('click',event=>{
  // Always allow recording to stop and fullscreen to exit, even offline.
  if(event.target?.closest?.('#fullscreen, #fullscreen-exit, #record, #stop, #stop-record, input, textarea, select, audio'))return;
  if(!nearlyExpired()&&!lastError)return;
  event.preventDefault();event.stopImmediatePropagation();note('正在恢复播放连接…');
  renew().then(()=>note('连接已恢复，请再点击一次继续。')).catch(()=>{});
 },true);
})();
