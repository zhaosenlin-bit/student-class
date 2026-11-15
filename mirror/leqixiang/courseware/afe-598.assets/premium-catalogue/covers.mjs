const MAX_BYTES=10*1024*1024;
const TYPES=new Set(['image/png','image/jpeg','image/webp']);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const errors={
  revision_conflict:'目录版本已更新，请重新载入后再保存。所选图片和预览已保留。',
  cover_conflict:'封面已被其他操作更换，请重新载入并核对当前封面后再保存。所选图片和预览已保留。',
  cover_previous_invalid:'历史封面地址需要管理员核查，当前无法更换。',
  cover_image_invalid:'图片未通过校验，请选择可正常预览的静态 PNG、JPEG 或 WebP 图片。',
  cover_upload_invalid:'暂存图片已失效或不可使用，请重新保存以上传所选图片。',
  cover_storage_error:'封面存储暂时失败，请稍后重试。所选图片和预览已保留。',
  program_unavailable:'课件当前不可用，请重新载入后核查。',
  placement_not_found:'课件已不在精品草稿中关联，请重新载入后核查。',
  login_required:'请重新登录管理员账号。',
  admin_required:'仅超级管理员可以更换封面。'
};
function publicImage(value){
  if(typeof value!=='string'||value.length>2048||/[?#\\\s]/.test(value)||value.includes('..'))return null;
  if(/^\/premium-catalogue\/covers\/[a-f0-9]{64}\.jpg$/.test(value))return value;
  if(/^\/uploads\/public\/[A-Za-z0-9_./%-]+\.(png|jpe?g|webp)$/i.test(value))return value;
  return null;
}
async function readResponse(response,upload=false){
  let data;try{data=await response.json();}catch{throw Error(response.status===413?'图片不能超过 10 MiB。':'未取得保存结果，请重新载入核对后重试。');}
  if(!response.ok||data.success===false){
    const code=data.error||data.code;
    const error=Error(errors[code]||(response.status===401?'请重新登录管理员账号。':response.status===413?'图片不能超过 10 MiB。':upload?'图片上传未完成，请重试。':'封面未保存，请稍后重试。'));
    error.code=code;throw error;
  }
  return data;
}
async function send(url,options,upload=false){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),60000);
  try{return await readResponse(await fetch(url,{...options,signal:controller.signal}),upload);}
  catch(error){
    if(controller.signal.aborted){
      const timeout=Error(upload?'图片上传超时，所选图片和预览已保留，请重试。':'封面保存请求超时，结果尚未确认。');
      timeout.code=upload?'cover_upload_timeout':'cover_save_timeout';throw timeout;
    }
    throw error;
  }finally{clearTimeout(timer);}
}
export function showCoverEditor({token,placement,revision,onRefresh,onSaved}){
  const existing=document.querySelector('#premium-cover-dialog');
  if(existing){existing.focus();return;}
  const previous=document.activeElement,dialog=document.createElement('dialog');
  dialog.id='premium-cover-dialog';dialog.className='pc-cover-dialog';dialog.setAttribute('aria-labelledby','pc-cover-title');
  dialog.innerHTML=`<header><div><h2 id="pc-cover-title">更换封面</h2><p>${esc(placement.programTitle||'精品课件')} · #${placement.programId}</p></div><button type="button" data-close aria-label="关闭封面编辑">×</button></header>
    <p class="pc-note">保存后，已发布课件将展示新封面；未发布课件仍保留在草稿。同一课件在多个精品套餐中共用封面。</p>
    <div class="pc-cover-comparison"><section><h3>当前封面</h3><div class="pc-cover-image" data-current></div><p class="pc-note" data-current-status></p></section><section><h3>所选图片</h3><div class="pc-cover-image" data-preview><span>选择图片后在此预览</span></div><p class="pc-note" data-file-status></p></section></div>
    <form><label>选择新封面（PNG / JPEG / WebP，最多 10 MiB）<input type="file" name="cover" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"></label><p class="pc-note">封面是公开展示图片。请确认预览后保存。</p><p role="status" aria-live="polite" data-status></p><footer><button type="button" data-reload>重新载入</button><button type="button" data-close>取消</button><button type="submit" class="pc-primary" data-save disabled>保存封面</button></footer></form>`;
  document.body.append(dialog);dialog.showModal();
  const fileInput=dialog.querySelector('[name=cover]'),save=dialog.querySelector('[data-save]'),reload=dialog.querySelector('[data-reload]'),status=dialog.querySelector('[data-status]');
  let current=placement,expectedRevision=revision,expectedCoverUrl=placement.coverUrl??null;
  let selected=null,objectUrl=null,previewReady=false,busy=false,needsReload=false,blocked=false,saved=false,active=true,selection=0;
  function message(text,error=false){status.textContent=text;status.className=error?'pc-error':'pc-success';}
  function controls(){
    fileInput.disabled=busy||saved;reload.disabled=busy;
    save.disabled=busy||saved||needsReload||blocked||!selected||!previewReady;
    save.textContent=busy?'正在处理…':saved?'已保存':'保存封面';
    dialog.querySelectorAll('[data-close]').forEach(button=>button.disabled=busy);
    dialog.setAttribute('aria-busy',String(busy));
  }
  function drawCurrent(){
    const root=dialog.querySelector('[data-current]'),note=dialog.querySelector('[data-current-status]');
    root.replaceChildren();note.textContent='';const url=publicImage(current?.coverUrl);
    if(!url){root.textContent='暂无可显示的公共封面';return;}
    const img=document.createElement('img');img.alt='当前封面';
    img.onerror=()=>{if(active&&img.parentNode===root){root.textContent='当前封面暂时无法显示';note.textContent='可选择新图片并确认预览。';}};
    root.append(img);img.src=url;
  }
  function dispose(){
    if(!active)return;active=false;selection++;if(objectUrl)URL.revokeObjectURL(objectUrl);
    dialog.remove();if(previous?.isConnected)previous.focus();
  }
  dialog.addEventListener('close',dispose);
  dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
  dialog.querySelectorAll('[data-close]').forEach(button=>button.onclick=()=>dialog.close());
  fileInput.onchange=()=>{
    const file=fileInput.files?.[0];if(!file)return;
    const generation=++selection;selected=null;previewReady=false;
    if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=null;}
    const root=dialog.querySelector('[data-preview]'),note=dialog.querySelector('[data-file-status]');root.replaceChildren();note.textContent='';
    if(!TYPES.has(file.type)||!(/\.(png|jpe?g|webp)$/i.test(file.name))||file.size<=0||file.size>MAX_BYTES){
      root.textContent='图片不可用';message('请选择 10 MiB 以内的 PNG、JPEG 或 WebP 图片。',true);controls();return;
    }
    selected=file;objectUrl=URL.createObjectURL(file);const img=document.createElement('img');img.alt='所选新封面预览';
    note.textContent=`${file.name} · ${(file.size/1024/1024).toFixed(2)} MiB`;message('正在检查图片预览…');controls();
    img.onload=()=>{
      if(!active||generation!==selection)return;
      previewReady=img.naturalWidth>0&&img.naturalHeight>0&&img.naturalWidth<=8192&&img.naturalHeight<=8192&&img.naturalWidth*img.naturalHeight<=20000000;
      message(previewReady?(needsReload?'图片预览已就绪，请重新载入最新状态后保存。':'图片预览已就绪，可保存封面。'):'图片尺寸超过上限（单边 8192 像素、总像素 2000 万），请重新选择。',!previewReady);controls();
    };
    img.onerror=()=>{if(active&&generation===selection){previewReady=false;root.textContent='图片预览失败';message('图片预览失败，无法保存，请重新选择图片。',true);controls();}};
    root.append(img);img.src=objectUrl;
  };
  async function refreshCurrent(){
    const latest=await onRefresh();if(!active)return;
    if(!latest?.placement){blocked=true;needsReload=true;message(errors.placement_not_found,true);return;}
    current=latest.placement;expectedRevision=latest.revision;expectedCoverUrl=current.coverUrl??null;
    blocked=false;needsReload=false;drawCurrent();
  }
  reload.onclick=async()=>{
    if(busy)return;busy=true;controls();
    try{await refreshCurrent();if(active&&!blocked)message(saved?'封面已保存，后台已重新载入。':'已重新载入当前封面，所选图片和预览已保留。请核对后保存。');}
    catch{if(active){needsReload=true;message('重新载入未完成。所选图片和预览已保留，请重试。',true);}}
    finally{busy=false;if(active)controls();}
  };
  dialog.querySelector('form').onsubmit=async event=>{
    event.preventDefault();if(busy||saved||blocked||needsReload||!selected||!previewReady)return;
    busy=true;controls();let patchStarted=false;
    try{
      message('正在上传封面…');const form=new FormData();form.append('cover',selected);
      const uploaded=await send('/api/upload-cover',{method:'POST',cache:'no-store',headers:{Authorization:'Bearer '+token},body:form},true);
      if(typeof uploaded.url!=='string'||!uploaded.url.startsWith('/uploads/')||uploaded.url.length>2048)throw Error('未取得有效的上传结果，请重试。');
      message('正在保存封面…');patchStarted=true;
      const result=await send('/api/premium/admin/covers/'+placement.programId,{method:'PATCH',cache:'no-store',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json','X-Premium-Catalogue-Intent':'cataloguing'},body:JSON.stringify({expectedRevision,expectedCoverUrl,coverUrl:uploaded.url})});
      saved=true;
      const success=result.publishedUpdated>0?'新封面已保存，已发布课件的封面已更新。':'新封面已保存；课件尚未发布，仍保留在草稿。';
      try{await refreshCurrent();if(active)message(success);onSaved?.(success);}
      catch{if(active){needsReload=true;message(success+' 后台暂未刷新，请点击「重新载入」。');}onSaved?.(success+' 请重新载入后台查看。');}
    }catch(error){
      if(active){
        needsReload=patchStarted&&(!error.code||['revision_conflict','cover_conflict','program_unavailable','placement_not_found','cover_save_timeout'].includes(error.code));
        blocked=error.code==='cover_previous_invalid';
        message(error.message+(needsReload&&!['revision_conflict','cover_conflict'].includes(error.code)?' 请重新载入核对；所选图片和预览已保留。':''),true);
      }
    }finally{busy=false;if(active)controls();}
  };
  drawCurrent();controls();return dialog;
}
