export const BULK_DOWNLOAD_NOTICE='一键下载该科目全部课件后，不适用七日无理由退货；文件损坏、功能故障或与商品说明不符等问题，仍可联系人工售后。如您还未试用课件，请先试用课件。\n您确定要继续下载吗？';

export function createDownloadBulkUI({api,esc,getUser,modal,close,toast,document:doc=globalThis.document,storage=globalThis.sessionStorage,now=()=>Date.now(),setTimer=setTimeout,clearTimer=clearTimeout}){
 let offer=null,offerUser='',offerAt=0,offerPending=null,selectedScope='',timer=null,viewSerial=0,viewUser='',currentJob=null,failures=0,busy=false;
 const jobs=new Map(),dialog=doc.querySelector('#dialog');
 const viewer=()=>String(getUser()?.id??'');
 const body=()=>doc.querySelector('[data-bulk-download-view]');
 const visible=serial=>serial===viewSerial&&dialog.open&&!!body()&&viewer()===viewUser;
 const stop=()=>{if(timer!==null)clearTimer(timer);timer=null;};
 const key=scope=>`leqixiang:bulk-download:${viewer()}:${scope}`;
 const time=value=>typeof value==='number'?value:Date.parse(value);
 const expired=job=>Number.isFinite(time(job?.expiresAt))&&time(job.expiresAt)<=now();
 const remember=(scope,job)=>{if(!job?.id)return;jobs.set(key(scope),job);try{storage?.setItem(key(scope),JSON.stringify({id:job.id,expiresAt:job.expiresAt}));}catch{}};
 function previous(scope){let job=jobs.get(key(scope));if(!job){try{job=JSON.parse(storage?.getItem(key(scope))||'null');}catch{}}if(job?.id&&!expired(job))return job;return null;}
 function forget(scope){jobs.delete(key(scope));try{storage?.removeItem(key(scope));}catch{}}
 function resetUser(){if(offerUser===viewer())return;offerUser=viewer();offer=null;offerAt=0;offerPending=null;selectedScope='';stop();++viewSerial;}
 async function eligibility(force=false){
  resetUser();if(!viewer())return null;
  if(offerPending)return offerPending;
  if(!force&&offer&&now()-offerAt<60000)return offer;
  const id=viewer();
  const request=api('/api/downloads/bulk').then(result=>{if(viewer()!==id)return null;offer={...result,scopes:(result.scopes||[]).filter(s=>s.id&&s.title&&Number.isSafeInteger(s.count)&&s.count>0)};offerAt=now();return offer;});
  offerPending=request;try{return await request;}finally{if(offerPending===request)offerPending=null;}
 }
 function entry(host,result){
  if(!host?.isConnected)return;
  host.hidden=!(result?.eligible&&result.scopes.length);
  host.innerHTML=host.hidden?'':`<button type="button" class="bulk-download-entry" data-bulk-action="open"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v11m-4-4 4 4 4-4M5 15v5h14v-5"/></svg><span>一键下载整科课件<small>按年级 · 单元整理</small></span></button>`;
 }
 async function mount(host){
  if(!host)return;host.hidden=true;
  const id=viewer();if(!id){resetUser();return;}
  try{const result=await eligibility();if(viewer()===id)entry(host,result);}catch{host.hidden=true;}
 }
 const scope=()=>offer?.scopes.find(s=>s.id===selectedScope);
 const scopeMarkup=()=>offer.scopes.length>1?`<label class="bulk-download-scope" for="bulk-download-scope">选择本次下载的科目<select id="bulk-download-scope">${offer.scopes.map(s=>`<option value="${esc(s.id)}" ${s.id===selectedScope?'selected':''}>${esc(s.title)} · ${s.count} 份课件</option>`).join('')}</select></label>`:`<div class="bulk-download-scope-name"><strong>${esc(scope().title)}</strong><span>${scope().count} 份课件</span></div>`;
 const scopeDescription=()=>`<div class="bulk-download-contents"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h7l2 2h9v12H3zM3 6V4h7l2 2"/></svg><div><strong>仅下载${esc(scope().title)}</strong><p>包含该科目全部可下载的独立版、整合版，不受当前页面筛选影响；不含物理学史。</p><small>保存为 ZIP 文件，解压后按年级、单元查找课件。</small></div></div>`;
 function show(html){stop();dialog.classList.add('bulk-download-dialog');modal(`<section class="dialog-content bulk-download-view" data-bulk-download-view aria-labelledby="bulk-download-title">${html}</section>`);}
 function confirmation(){
  currentJob=null;busy=false;const saved=previous(selectedScope);
  show(`<p class="eyebrow">整科课件 · 一次整理</p><h2 id="bulk-download-title">下载该科目全部课件</h2>${scopeMarkup()}${scopeDescription()}<p class="bulk-download-notice" id="bulk-download-notice">${esc(typeof offer.notice==='string'&&offer.notice?offer.notice:BULK_DOWNLOAD_NOTICE)}</p><label class="bulk-download-check"><input type="checkbox" id="bulk-download-accepted" aria-describedby="bulk-download-notice"><span>我已阅读以上提示，确认继续下载所选科目的全部课件。</span></label>${saved?'<p class="bulk-download-resume">已有下载包记录，确认后可继续查看。</p>':''}<div class="bulk-download-actions"><button type="button" class="button secondary" data-bulk-action="cancel">先去试用</button><button type="button" class="button" data-bulk-action="prepare" disabled>${saved?'确认并继续':'确认并准备下载'}</button></div><p class="bulk-download-error" role="alert"></p>`);
 }
 async function open(){
  const button=doc.querySelector('[data-bulk-action="open"]');if(button)button.disabled=true;
  try{
   const result=await eligibility(true);if(!result?.eligible||!result.scopes.length){toast('当前没有可整科下载的有效年卡或永久卡，请查看下载权益');doc.querySelectorAll('[data-bulk-download-entry]').forEach(host=>entry(host,result));return;}
   if(!result.policyVersion)throw Error('下载提示暂未加载完成，请稍后重试');
   if(!result.scopes.some(s=>s.id===selectedScope))selectedScope=result.scopes[0].id;
   ++viewSerial;viewUser=viewer();confirmation();
  }catch(error){toast(error.message);}finally{if(button?.isConnected)button.disabled=false;}
 }
 function errorText(message){const error=body()?.querySelector('.bulk-download-error');if(error)error.textContent=message;}
 const date=value=>new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(time(value)));
 function renderJob(job,serial){
  if(!visible(serial))return;if(!job?.id||!['queued','building','ready','failed'].includes(job.status))throw Error('下载包状态暂不可用，请稍后重试');currentJob=job;remember(selectedScope,job);failures=0;
  if(expired(job)){renderExpired();return;}
  if(job.status==='ready'){
   if(!/^\/api\/downloads\/bulk\/files\/[A-Za-z0-9_-]+$/.test(job.downloadUrl||''))throw Error('下载地址暂不可用，请重新准备');
   show(`<span class="bulk-download-state">下载包已准备</span><h2 id="bulk-download-title">${esc(scope().title)}</h2>${scopeDescription()}<div class="bulk-download-file"><span aria-hidden="true">ZIP</span><div><strong>${esc(job.filename||scope().title+'.zip')}</strong><small>解压后即可按年级、单元查看</small></div></div><a class="button bulk-download-save" data-bulk-action="save" href="${esc(job.downloadUrl)}" download="${esc(job.filename||'课件.zip')}">↓ 保存课件下载包</a><p class="bulk-download-save-status" role="status">${Number.isFinite(time(job.expiresAt))?`下载链接有效至北京时间 ${date(job.expiresAt)}。`:''}请在浏览器下载列表中确认保存结果。</p><div class="bulk-download-footer"><button type="button" class="text-button" data-bulk-action="restart">重新准备</button><button type="button" class="text-button" data-bulk-action="cancel">关闭</button></div><p class="bulk-download-error" role="alert"></p>`);
   if(Number.isFinite(time(job.expiresAt)))timer=setTimer(()=>{if(visible(serial))renderExpired();},Math.min(2147483647,Math.max(1,time(job.expiresAt)-now())));
   return;
  }
  if(job.status==='failed'){
   show(`<span class="bulk-download-state">暂未准备完成</span><h2 id="bulk-download-title">${esc(scope().title)}</h2><p>${esc(job.error||'下载包准备中断，请稍后重新准备。')}</p><div class="bulk-download-actions"><button class="button secondary" type="button" data-bulk-action="cancel">关闭</button><button class="button" type="button" data-bulk-action="restart">重新准备</button></div>`);return;
  }
  if(!['queued','building'].includes(job.status))throw Error('下载包状态暂不可用，请稍后重试');
  const total=Math.max(0,Number(job.total)||0),completed=Math.min(total,Math.max(0,Number(job.completed)||0)),percent=total?Math.floor(completed/total*100):0;
  const caption=job.status==='queued'?'正在安排本次下载，请稍候。':`已整理 ${completed} / ${total} 份课件`;
  const progress=body()?.querySelector('.bulk-download-progress');
  if(progress){progress.max=total||1;progress.value=completed;body().querySelector('.bulk-download-state').textContent=job.status==='queued'?'等待整理':'正在整理课件';body().querySelector('.bulk-download-progress-caption').textContent=caption;body().querySelector('.bulk-download-progress-meta strong').textContent=percent+'%';errorText('');}
  else show(`<span class="bulk-download-state">${job.status==='queued'?'等待整理':'正在整理课件'}</span><h2 id="bulk-download-title">${esc(scope().title)}</h2><p class="bulk-download-progress-caption" role="status" aria-live="polite">${caption}</p><progress class="bulk-download-progress" max="${total||1}" value="${completed}" aria-label="课件整理进度">${percent}%</progress><div class="bulk-download-progress-meta"><span>按年级、单元整理</span><strong>${percent}%</strong></div><p class="bulk-download-wait">课件较多时需要一些时间。可以先关闭窗口，稍后从课件库继续查看。</p><button type="button" class="button secondary bulk-download-later" data-bulk-action="cancel">稍后查看</button><p class="bulk-download-error" role="alert"></p>`);
  schedule(serial,2000);
 }
 function renderExpired(){stop();show(`<span class="bulk-download-state">下载链接已过期</span><h2 id="bulk-download-title">${esc(scope().title)}</h2><p>请重新准备下载包，以获取新的保存链接。</p><div class="bulk-download-actions"><button type="button" class="button secondary" data-bulk-action="cancel">关闭</button><button type="button" class="button" data-bulk-action="restart">重新准备</button></div>`);}
 function schedule(serial,delay){stop();timer=setTimer(()=>poll(serial),delay);}
 async function poll(serial){
  stop();if(!visible(serial)||!currentJob?.id)return;
  try{const result=await api('/api/downloads/bulk/jobs/'+encodeURIComponent(currentJob.id));if(visible(serial))renderJob(result.job,serial);}
  catch(error){
   if(!visible(serial))return;errorText(error.message);
   if([401,403,404].includes(error.status)||++failures>=3){body()?.querySelector('.bulk-download-error')?.insertAdjacentHTML('afterend','<button type="button" class="text-button" data-bulk-action="check">重新查看进度</button>');return;}
   schedule(serial,3000);
  }
 }
 async function prepare(){
  if(busy||!doc.querySelector('#bulk-download-accepted')?.checked||!scope())return;
  const serial=viewSerial,id=selectedScope,requestUser=viewer(),button=body()?.querySelector('[data-bulk-action="prepare"]'),select=body()?.querySelector('#bulk-download-scope');busy=true;if(button){button.disabled=true;button.textContent='正在准备…';}if(select)select.disabled=true;errorText('');
  try{
   const saved=previous(id);let result;
   if(saved){try{result=await api('/api/downloads/bulk/jobs/'+encodeURIComponent(saved.id));if(expired(result.job)||result.job.status==='failed'){forget(id);result=null;}}catch(error){if([404,410].includes(error.status)){forget(id);result=null;}else throw error;}}
   if(!result)result=await api('/api/downloads/bulk/prepare',{scopeId:id,confirmed:true,policyVersion:offer.policyVersion});
   if(result.job?.id&&viewer()===requestUser)remember(id,result.job);
   if(visible(serial))renderJob(result.job,serial);
  }catch(error){if(visible(serial)){errorText(error.message);if(select?.isConnected)select.disabled=false;if(button?.isConnected){button.disabled=!doc.querySelector('#bulk-download-accepted')?.checked;button.textContent='重试准备下载';}}}
  finally{busy=false;}
 }
 doc.addEventListener('change',event=>{
  if(event.target.id==='bulk-download-accepted'){const button=body()?.querySelector('[data-bulk-action="prepare"]');if(button)button.disabled=busy||!event.target.checked;}
  if(event.target.id==='bulk-download-scope'&&!busy&&offer?.scopes.some(s=>s.id===event.target.value)){selectedScope=event.target.value;confirmation();}
 });
 doc.addEventListener('click',event=>{
  const button=event.target.closest('[data-bulk-action]');if(!button)return;
  if(button.dataset.bulkAction==='save'){
   if(!currentJob||expired(currentJob)){event.preventDefault();renderExpired();return;}
   const status=body()?.querySelector('.bulk-download-save-status');if(status)status.textContent='已请求保存，请在浏览器下载列表中核对保存进度和结果。';return;
  }
  event.preventDefault();if(button.disabled)return;
  const action=button.dataset.bulkAction;
  if(action==='open')open();
  else if(action==='cancel'){stop();++viewSerial;close();}
  else if(action==='prepare')prepare();
  else if(action==='restart'){forget(selectedScope);confirmation();}
  else if(action==='check'){button.remove();poll(viewSerial);}
 });
 dialog.addEventListener('close',()=>{stop();++viewSerial;busy=false;dialog.classList.remove('bulk-download-dialog');});
 return {mount,open,invalidate(){offerAt=0;},stop};
}
