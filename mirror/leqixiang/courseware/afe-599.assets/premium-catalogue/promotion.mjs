const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(route,token,body){const r=await fetch('/api/premium/'+route,{method:body?'POST':'GET',cache:'no-store',headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json','X-Premium-Catalogue-Intent':'cataloguing'}:{})},body:body?JSON.stringify(body):undefined});const d=await r.json();if(!r.ok)throw Error(({revision_conflict:'推广页已被其他操作更新，请重新载入。',promotion_image_invalid:'请上传2MB以内的PNG、JPEG或WebP图片。',promotion_image_required:'请先选择推广图片。'})[d.error]||'操作未完成，请稍后重试。');return d;}
let loading=false;
export async function showHomePromotion(token,isCurrent){
 if(!token||loading||document.querySelector('#home-promotion-dialog'))return;loading=true;
 try{const {promotion:p}=await api('promotion',token);if(!p||!isCurrent())return;
 const d=document.createElement('dialog');d.id='home-promotion-dialog';d.className='pc-home-promotion';d.setAttribute('aria-label',p.title);d.innerHTML=`<button aria-label="关闭推广页">×</button><img src="${esc(p.imageUrl)}" alt="${esc(p.title)}">`;
 let dismissed=false;async function dismiss(){if(dismissed)return;dismissed=true;d.close();await api('promotion/dismiss',token,{version:p.version}).catch(()=>{});}
 d.querySelector('button').onclick=dismiss;d.addEventListener('cancel',e=>{e.preventDefault();dismiss();});d.addEventListener('close',()=>d.remove());d.querySelector('img').onerror=()=>d.close();document.body.append(d);d.showModal();
 }catch{}finally{loading=false;}
}
export async function mountPromotion(root,token){
 let current=null,busy=false;root.className='pc-admin';
 async function refresh(){current=(await api('admin/promotion',token)).promotion;if(!root.isConnected)return;root.innerHTML=`<header class="pc-admin-head"><div><h2>首页推广页</h2><p>登录用户在首页查看；关闭后同一账号不再重复展示，发布新版后再次展示。</p></div><button data-reload>重新载入</button></header><form><label>推广标题<input name="title" value="${esc(current?.title||'最新更新')}" maxlength="80" required></label><label>推广图片（PNG / JPEG / WebP，最多2MB）<input name="image" type="file" accept="image/png,image/jpeg,image/webp"></label><label class="pc-check"><input name="active" type="checkbox" ${current?.active?'checked':''}>发布后在首页展示</label><div class="pc-promotion-preview">${current?.active?`<img src="${esc(current.imageUrl)}" alt="当前推广页">`:'<p>选择图片后可预览</p>'}</div><p class="pc-note">弹窗约占页面宽高的70%，背景保留网站首页。图片会成为公开营销素材，请勿上传私密内容。</p><button class="pc-primary">发布新版推广页</button></form><p role="status" data-status></p>`;
 let selected=null;const file=root.querySelector('[name=image]');file.onchange=async()=>{selected=null;const f=file.files[0];if(!f)return;if(f.size>2*1024*1024||!['image/png','image/jpeg','image/webp'].includes(f.type)){root.querySelector('[data-status]').textContent='请选择2MB以内的PNG、JPEG或WebP图片。';return;}
 selected=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(f);});const img=document.createElement('img');img.src=selected;img.alt='待发布推广页预览';root.querySelector('.pc-promotion-preview').replaceChildren(img);};
 root.querySelector('[data-reload]').onclick=()=>act(refresh);root.querySelector('form').onsubmit=e=>{e.preventDefault();act(async()=>{await api('admin/promotion',token,{expectedVersion:current?.version||null,title:root.querySelector('[name=title]').value.trim(),active:root.querySelector('[name=active]').checked,image:selected});await refresh();root.querySelector('[data-status]').textContent='新版已保存，首页展示状态已更新。';});};}
 async function act(fn){if(busy)return;busy=true;try{await fn();}catch(e){const el=root.querySelector('[data-status]');if(el)el.textContent=e.message;else root.textContent=e.message;}finally{busy=false;}}
 await act(refresh);
}
