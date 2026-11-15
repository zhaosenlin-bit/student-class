import {mountUploads} from './uploads.mjs';
import {showPlanPurchase} from './purchase.mjs';
import {showCoverEditor} from './covers.mjs';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lock = '<svg class="pc-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-label="锁定"><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 018 0v3m-4 4v3"/></svg>';
const messages = {revision_conflict:'目录已被其他操作更新，请重新载入后再编辑。',same_content_requires_same_program:'同一份课件必须关联同一个 programId。',existing_plaza_rights_require_shared:'该课件有广场或历史订单权益，必须保留广场共享。',sample_scope_exceeds_policy:'此课件的样例范围需要单独核验，暂不能设为整课免费。',draft_conflict:'该关联已存在或目录仍在使用中。',category_in_use:'目录仍有课件或子目录，请先调整它们。',admin_required:'仅超级管理员可以编目。',premium_required:'请购买对应精品套餐后使用。',premium_sample_exhausted:'该免费课件累计10次试用已用完，请选择对应套餐。',premium_unavailable:'课件当前不可用，请稍后再试。',login_required:'请重新登录管理员账号。',upload_distribution_fixed:'直接上传时的内容归属已固定，请保留原归属关联。',invalid_package:'请填写完整套餐信息与有效价格。',material_already_linked:'该素材已经关联，请在已关联列表中编辑。'};
async function request(path,{token,method='GET',body}={}) {
  const response=await fetch('/api/premium/'+path,{method,cache:'no-store',headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json','X-Premium-Catalogue-Intent':'cataloguing'}:{})},body:body?JSON.stringify(body):undefined});
  const data=await response.json();if(!response.ok){const e=Error(messages[data.error]||'操作未完成：'+(data.error||response.status));e.code=data.error;throw e;}return data;
}
function options(rows,current,label=r=>r.name){return rows.map(r=>`<option value="${esc(r.id)}" ${r.id===current?'selected':''}>${esc(label(r))}</option>`).join('');}
function cover(c){return c.coverUrl?`<img src="${esc(c.coverUrl)}" alt="${esc(c.title)}封面" loading="lazy">`:'<div class="pc-no-cover">课程封面待补充</div>';}
export async function mountCustomer(root,{openLegacy,openPremium,token,onLogin,initialCourse}={}) {
  root.className='pc-page';root.textContent='正在载入精品课程…';
  try {
    const [data,capabilities]=await Promise.all([request('catalogue'),request('capabilities')]);
    let access={courses:{}};
    if(token&&capabilities.playbackEnabled)access=await request('access',{token});
    if(!root.isConnected)return;
    if(!data.packages.length){root.textContent='精品课程正在准备中，敬请期待。';return;}
    // Only public catalogue navigation is stored. Entitlements and use counters always come from the server.
    const storageKey='premium-browse-v1';
    let saved={packages:{}};
    try {
      const raw=localStorage.getItem(storageKey);
      const value=raw&&raw.length<16384?JSON.parse(raw):null;
      if(value?.version===1&&value.packages&&typeof value.packages==='object'&&!Array.isArray(value.packages))saved=value;
    } catch {}
    const cat=id=>data.categories.find(c=>c.id===id);
    const rights=c=>access.courses[c?.programId]||{};
    const available=c=>rights(c).allowed||rights(c).sampleAvailable;
    const hasSamples=id=>data.courses.some(c=>c.packageId===id&&c.freeSample);
    let packageId=data.packages.some(p=>p.id===saved.packageId)?saved.packageId:data.packages[0].id;
    let selectedId=null,query='',view='samples';
    function restore() {
      const previous=saved.packages[packageId];
      const valid=data.courses.some(c=>c.packageId===packageId&&c.id===previous?.selectedId);
      view=previous?.view==='course'&&valid?'course':hasSamples(packageId)?'samples':'course';
      selectedId=view==='course'&&valid?previous.selectedId:null;
      query=typeof previous?.query==='string'?previous.query.slice(0,80):'';
    }
    function remember() {
      const packages=Object.fromEntries(data.packages.map(p=>[p.id,p.id===packageId?{view,selectedId,query}:saved.packages[p.id]]).filter(([,v])=>v));
      saved={version:1,packageId,packages};
      try {localStorage.setItem(storageKey,JSON.stringify(saved));} catch {}
      if(window.TuringCourseLinks?.parse(window.location.hash)?.page==='premium'){
        const c=data.courses.find(c=>c.packageId===packageId&&c.id===selectedId);
        const link=c&&window.TuringCourseLinks.href({kind:'premium',packageId:c.packageId,courseId:c.id});
        history.replaceState(null,'',view==='course'&&link?link:'#premium');
      }
    }
    function selectPackage(id) {remember();packageId=id;restore();draw();remember();}
    function usage(c) {
      if(!c.programId||!capabilities.playbackEnabled)return '课件准备中';
      if(!token)return '登录后可免费体验';
      const r=rights(c);
      if(r.allowed&&r.sampleRemaining===null)return '不限次数';
      if(Number.isInteger(r.sampleRemaining))return `剩余 ${r.sampleRemaining} 次`;
      return '使用资格以当前账号权益为准';
    }
    function action(c,detail=false) {
      if(capabilities.playbackEnabled&&c.programId){
        const r=rights(c);
        const label=!token?(c.freeSample?'登录后免费试用':'登录后查看使用权益'):c.freeSample?(r.allowed&&r.sampleRemaining!==null?'继续本次体验':r.allowed||r.sampleAvailable?'免费试用':r.sampleRemaining===0?'体验次数已用完':'暂不可用'):r.allowed?'进入课件':'解锁精品课程';
        return `<button ${detail?'id="pc-enter"':''} data-enter="${esc(c.id)}" class="pc-primary">${esc(label)}</button>`;
      }
      if(c.legacyAvailable)return `<button data-legacy="${esc(c.id)}" class="pc-primary">按原广场权益进入</button>`;
      return '<button class="pc-primary" disabled>即将开放</button>';
    }
    async function refreshAccess(){access=await request('access',{token});if(root.isConnected)draw();}
    async function enter(c,button) {
      if(!token){onLogin?.();return;}
      if(!available(c)){await showPlanPurchase(c.packageId,{token,onLogin,onPaid:async()=>{selectedId=c.id;packageId=c.packageId;view='course';query='';remember();await refreshAccess();},successLabel:'返回课件',context:c.freeSample?'该免费课件累计10次体验已用完。':'该课件需要对应精品套餐权益。'});return;}
      if(!rights(c).direct){openLegacy?.(c.programId);return;}
      button.disabled=true;
      try {await startPremiumLesson({course:c,openid:access.openid,token,openPremium});access=await request('access',{token});if(root.isConnected)draw();}
      catch(e){alert(e.message);}finally{button.disabled=false;}
    }
    function revealPreview(){if(window.matchMedia('(max-width:600px)').matches)root.querySelector('.pc-preview').scrollIntoView({block:'start',behavior:'smooth'});}
    const play='<svg class="pc-play" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4Z" stroke-linejoin="round"/></svg>';
    const purchaseNote='<p class="pc-note">购买前，建议先体验免费课件，确认内容与使用效果符合您的教学需要，再选择套餐，请理性消费。购买后无特殊情况一般不予退款；如遇使用问题，请先联系我们协助处理。</p>';
    function draw() {
      const pack=data.packages.find(p=>p.id===packageId),subjectId=cat(pack.gradeCategoryId).parentId;
      const subjects=data.categories.filter(c=>c.kind==='subject'&&data.packages.some(p=>cat(p.gradeCategoryId)?.parentId===c.id));
      const packages=data.packages.filter(p=>cat(p.gradeCategoryId).parentId===subjectId);
      const courses=data.courses.filter(c=>c.packageId===packageId&&c.title.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>a.sortOrder-b.sortOrder);
      const samples=courses.filter(c=>c.freeSample);
      const selected=view==='course'?(courses.find(c=>c.id===selectedId)||courses[0]):null;
      if(selected)selectedId=selected.id;
      const blocks=data.categories.filter(c=>c.kind==='block'&&c.parentId===pack.gradeCategoryId).sort((a,b)=>a.sortOrder-b.sortOrder);
      const preview=view==='samples'?`<section class="pc-experience" aria-label="免费体验课"><header><p class="pc-eyebrow">${esc(pack.name)} · 免费体验</p><h2>先体验，再选择。</h2><p>登录后，每个免费课件可累计体验 10 次。普通 VIP 对指定免费课件不限次数。</p></header><div class="pc-sample-grid">${samples.map(c=>`<article class="pc-sample-card"><button class="pc-sample-cover" data-course="${esc(c.id)}" aria-label="查看${esc(c.title)}封面">${cover(c)}<span class="pc-free-tag">免费体验</span></button><div class="pc-sample-body"><p class="pc-eyebrow">${esc(cat(cat(c.pointId)?.parentId)?.name)} · ${esc(cat(c.pointId)?.name)}</p><h3><button data-course="${esc(c.id)}">${esc(c.title)}</button></h3><div class="pc-sample-action">${action(c)}<span class="pc-usage">${esc(usage(c))}</span></div></div></article>`).join('')}</div>${!samples.length?'<p class="pc-empty" role="status">没有匹配的免费体验课，可调整搜索内容，或在左侧知识分类中查找。</p>':''}${purchaseNote}</section>`:selected?`<div class="pc-cover">${cover(selected)}<span class="pc-cover-tag">${available(selected)?'':lock} 静态封面</span></div><div class="pc-preview-body"><p class="pc-eyebrow">${esc(cat(selected.pointId)?.name)}${selected.freeSample?' · 免费体验':''}</p><h2>${esc(selected.title)}</h2><p>${selected.legacyAvailable?'本课程关联课件广场原作品，原单购及原会员权益继续适用。':(selected.programId?'可先体验指定免费课件，再选择适合您的精品套餐。':'课程正在准备中，开放后可先体验指定免费课件。')}</p><div class="pc-sample-action">${action(selected,true)}${selected.freeSample?`<span class="pc-usage">${esc(usage(selected))}</span>`:''}</div>${purchaseNote}</div>`:'<div class="pc-preview-body">没有找到匹配的课件。</div>';
      root.innerHTML=`<div class="pc-heading"><div><p class="pc-eyebrow">TURING EDUCATION · 精品课程</p><h1>把抽象知识，变成眼前的理解。</h1><p>循着知识脉络，找到适合课堂的交互课件。</p></div>${access.administrator?'<span class="pc-admin-access" role="status">管理员可直接使用全部精品课，无需购买</span>':'<button id="pc-plan-purchase" class="pc-plan-entry">了解与开通套餐</button>'}</div>
        <div class="pc-tabs" aria-label="学科">${subjects.map(s=>`<button data-subject="${esc(s.id)}" aria-pressed="${s.id===subjectId}">${esc(s.name)}</button>`).join('')}</div>
        <div class="pc-tabs pc-packages" aria-label="年级套餐">${packages.map(p=>`<button data-package="${esc(p.id)}" aria-pressed="${p.id===packageId}">${esc(p.name)}</button>`).join('')}</div>
        <div class="pc-layout"><aside class="pc-directory">${hasSamples(packageId)?`<button id="pc-free-experience" class="pc-experience-entry" aria-pressed="${view==='samples'}">${play}<span>免费体验<small>先试用，找到适合您的课件</small></span></button>`:''}<label>查找课件<input id="pc-search" type="search" maxlength="80" value="${esc(query)}" placeholder="输入课件名称"></label>
        <nav aria-label="课程目录">${blocks.map(b=>{const points=data.categories.filter(p=>p.parentId===b.id).sort((a,b)=>a.sortOrder-b.sortOrder);if(!points.some(p=>courses.some(c=>c.pointId===p.id)))return '';return `<details ${points.some(p=>p.id===selected?.pointId)?'open':''}><summary>${esc(b.name)}</summary>${points.map(p=>{const rows=courses.filter(c=>c.pointId===p.id);return rows.length?`<div class="pc-point">${esc(p.name)}</div>${rows.map(c=>`<button class="pc-course ${view==='course'&&c.id===selectedId?'selected':''}" data-course="${esc(c.id)}">${available(c)?'':lock}<span>${esc(c.title)}${c.freeSample?'<small>免费</small>':''}</span></button>`).join('')}`:'';}).join('')}</details>`;}).join('')}</nav></aside><main class="pc-preview">${preview}</main></div>`;
      const purchaseEntry=root.querySelector('#pc-plan-purchase');if(purchaseEntry)purchaseEntry.onclick=()=>showPlanPurchase(packageId,{token,onLogin,onPaid:refreshAccess});
      root.querySelectorAll('[data-subject]').forEach(b=>b.onclick=()=>selectPackage(data.packages.find(p=>cat(p.gradeCategoryId).parentId===b.dataset.subject).id));
      root.querySelectorAll('[data-package]').forEach(b=>b.onclick=()=>selectPackage(b.dataset.package));
      root.querySelectorAll('[data-course]').forEach(b=>b.onclick=()=>{selectedId=b.dataset.course;view='course';const pos=root.querySelector('.pc-directory').scrollTop;draw();root.querySelector('.pc-directory').scrollTop=pos;remember();revealPreview();});
      const free=root.querySelector('#pc-free-experience');if(free)free.onclick=()=>{view='samples';selectedId=null;query='';draw();remember();revealPreview();};
      root.querySelector('#pc-search').oninput=e=>{query=e.target.value;const pos=e.target.selectionStart;draw();remember();const input=root.querySelector('#pc-search');input.focus();try{input.setSelectionRange(pos,pos);}catch{}};
      root.querySelectorAll('[data-enter]').forEach(b=>b.onclick=()=>enter(courses.find(c=>c.id===b.dataset.enter),b));
      root.querySelectorAll('[data-legacy]').forEach(b=>b.onclick=()=>openLegacy?.(courses.find(c=>c.id===b.dataset.legacy).programId));
    }
    restore();
    if(initialCourse?.page==='premium'){
      const linked=data.courses.find(c=>c.id===initialCourse.courseId&&c.packageId===initialCourse.packageId&&c.programId);
      if(!linked){root.textContent='这份精品课当前不可用，请从精品课目录选择其他课件。';return;}
      packageId=linked.packageId;selectedId=linked.id;view='course';query='';
    }
    draw();
  } catch(e){root.textContent=e.message;}
}
export async function mountAdmin(root,token) {
  root.className='pc-admin';root.textContent='正在载入编目草稿…';
  let capabilities={},draft,packageId='physics-g8',editing=null,searchPage=1,searchQuery='',results=[],selected=new Set(),busy=false;
  const cat=id=>draft.categories.find(c=>c.id===id);
  const points=()=>draft.categories.filter(c=>c.kind==='point'&&cat(c.parentId)?.parentId===draft.packages.find(p=>p.id===packageId).gradeCategoryId);
  const pointName=c=>`${cat(c.parentId)?.name} / ${c.name}`;
  function feedback(text,error=false){const el=root.querySelector('#pc-feedback');if(el){el.textContent=text;el.className=error?'pc-error':'pc-success';}}
  async function refresh(){[draft,capabilities]=await Promise.all([request('admin/draft',{token}),request('capabilities')]);if(!draft.packages.some(p=>p.id===packageId))packageId=draft.packages[0]?.id;if(root.isConnected)draw();}
  async function mutate(path,body,method='POST'){return request('admin/'+path,{token,method,body:{expectedRevision:draft.revision,...body}});}
  async function action(fn,success='已保存草稿。发布目录后，客户目录才会更新。'){if(busy)return;busy=true;root.setAttribute('aria-busy','true');try{await fn();await refresh();feedback(success);}catch(e){feedback(e.message,true);}finally{busy=false;root.removeAttribute('aria-busy');}}
  function draw(){
    const gradeId=draft.packages.find(p=>p.id===packageId)?.gradeCategoryId;
    const materials=draft.materials.filter(m=>m.packageId===packageId&&!m.programId),placements=draft.placements.filter(p=>p.packageId===packageId);
    const rows=points();
    root.innerHTML=`<header class="pc-admin-head"><div><h2>精品课编目</h2><p>草稿版本 ${draft.revision} · 已发布目录版本 ${draft.publishedRevision??'未发布'}</p></div><div><button id="pc-reload">重新载入</button> <button id="pc-publish" class="pc-primary">发布本地目录</button></div></header>
      <p class="pc-local-note">本地联调：发布目录后，关联课件按套餐权益和免费样例规则开放。购买入口尚未开放。</p><p id="pc-feedback" role="status" aria-live="polite"></p>
      <details class="pc-management"><summary>学科与套餐管理</summary><p class="pc-note">先新增学科，再建年级套餐，最后在下方添加板块和知识点。没有课程的套餐不会显示给客户。价格之后可在「会员价格设置」中调整。</p>
      <div class="pc-admin-grid"><form id="pc-subject-form"><h3>新增学科</h3><label>学科名称<input id="pc-subject-name" required maxlength="80" placeholder="例如：地理"></label><button>保存学科</button></form>
      <form id="pc-pack-form"><h3>新增年级套餐</h3><label>所属学科<select id="pc-pack-subject">${options(draft.categories.filter(c=>c.kind==='subject'))}</select></label><label>年级 / 学段<input id="pc-pack-grade" required maxlength="80" placeholder="例如：七年级"></label><label>套餐名称<input id="pc-pack-name" required maxlength="80" placeholder="例如：七年级地理"></label><label>内容范围<input id="pc-pack-scope" required maxlength="80" placeholder="例如：上下册"></label><label>365天价格（元）<input id="pc-pack-price" type="number" min="0.01" max="100000" step="0.01" required placeholder="请填写定价"></label><button>保存套餐</button></form>
      <form id="pc-pack-edit"><h3>修改当前套餐</h3><label>套餐名称<input id="pc-pack-rename" required maxlength="80" value="${esc(draft.packages.find(p=>p.id===packageId)?.name)}"></label><label>内容范围<input id="pc-pack-rescope" required maxlength="80" value="${esc(draft.packages.find(p=>p.id===packageId)?.scopeLabel)}"></label><button>保存名称与范围</button></form></div></details>
      <label>年级套餐<select id="pc-package">${options(draft.packages,packageId)}</select></label>
      <div id="pc-upload-area"></div><div class="pc-admin-grid"><section><h3>${editing?'编辑课件编目':'添加 / 关联课件'}</h3><form id="pc-editor">
      ${!editing?`<label>收到的素材<select id="pc-material"><option value="">直接从广场添加（不对应待关联素材）</option>${materials.map(m=>`<option value="${esc(m.inventoryKey)}">${esc(m.title)}</option>`).join('')}</select></label>`:`<p>${esc(editing.title||editing.programTitle)}${editing.programId?' · programId '+editing.programId:' · 待关联'}</p>`}
      <label>知识点<select id="pc-point" required>${options(rows,editing?.pointId,pointName)}</select></label>
      <label>目录排序<input id="pc-order" type="number" min="0" max="1000000" value="${editing?.sortOrder??100}" required></label>
      <label class="pc-check"><input id="pc-free" type="checkbox" ${editing?.freeSample?'checked':''}>指定免费样例（整课；登录后每账号累计10次，普通VIP不限次数）</label>
      <label>内容归属<select id="pc-distribution"><option value="marketplace_shared">广场共享，保留原权益</option><option value="premium_exclusive" ${editing?.distribution==='premium_exclusive'?'selected':''}>新专属课件</option></select></label>
      <p class="pc-note">只关联已有 programId，不上传、不复制原课件。有原广场或历史订单权益时，不能改为新专属。</p>
      <button type="submit" class="pc-primary">${editing?'保存编目':'关联已勾选作品'}</button> ${editing?'<button type="button" id="pc-cancel">取消编辑</button>':'<button type="button" id="pc-save-pending">仅保存待关联素材编目</button>'}</form>
      <h3>目录维护</h3><form id="pc-category-form"><label>操作<select id="pc-category-mode"><option value="create">新增</option><option value="update">修改名称 / 排序</option><option value="delete">删除空目录</option></select></label><label>上级 / 当前目录<select id="pc-category">${options(draft.categories.filter(c=>c.id===gradeId||cat(c.parentId)?.id===gradeId||cat(cat(c.parentId)?.parentId)?.id===gradeId),null,c=>`${c.kind==='grade'?'年级':c.kind==='block'?'板块':'知识点'} · ${c.name}`)}</select></label><label>名称<input id="pc-category-name" maxlength="80"></label><label>排序<input id="pc-category-order" type="number" min="0" max="1000000" value="100"></label><button>保存目录</button></form></section>
      <section><h3>查找原网站作品</h3><form id="pc-search-form" class="pc-search-row"><input id="pc-query" maxlength="80" value="${esc(searchQuery)}" placeholder="标题或 programId"><button>搜索</button></form><div id="pc-results">输入标题查找可关联的作品。</div><div id="pc-pages"></div><p class="pc-note">素材与作品请人工核对；标题相同不代表内容相同。同一素材跨套餐共用 programId。每次最多勾选10项，逐项保存并报告失败。</p>
      <h3>已关联作品</h3><div class="pc-list">${placements.length?placements.sort((a,b)=>a.sortOrder-b.sortOrder).map((p,i)=>`<div><span>${esc(p.programTitle||'作品不可用')} <small>#${p.programId} · ${esc(cat(p.pointId)?.name)} · ${p.freeSample?'免费样例':'套餐课件'}</small></span><button data-cover-placement="${i}">更换封面</button><button data-edit-placement="${i}">编辑</button><button data-remove="${p.programId}">解除关联</button></div>`).join(''):'尚未关联真实作品。'}</div>
      <h3>待关联素材</h3><div class="pc-list pc-pending">${materials.sort((a,b)=>a.sortOrder-b.sortOrder).map((m,i)=>`<div><span>${esc(m.title)}<small>${esc(cat(m.pointId)?.name)} · ${m.freeSample?'免费样例':'套餐课件'}</small></span><button data-edit-material="${i}">编目</button></div>`).join('')}</div></section></div>`;
    if(capabilities.uploadsEnabled)mountUploads(root.querySelector('#pc-upload-area'),{token,packageId,points:rows.map(c=>({...c,label:pointName(c)})),onComplete:()=>feedback('上传结果已保留。请点击「重新载入」查看新课件，再检查并发布目录。')});
    root.querySelector('#pc-subject-form').onsubmit=e=>{e.preventDefault();action(async()=>{
      const name=root.querySelector('#pc-subject-name').value.trim();
      if(draft.categories.some(c=>c.kind==='subject'&&c.name===name))throw Error('该学科已存在，可直接为它新增套餐。');
      await mutate('categories',{id:'subject-'+crypto.randomUUID(),parentId:null,kind:'subject',name,sortOrder:100});
    });};
    root.querySelector('#pc-pack-form').onsubmit=e=>{e.preventDefault();action(async()=>{
      const body={subjectId:root.querySelector('#pc-pack-subject').value,gradeName:root.querySelector('#pc-pack-grade').value.trim(),name:root.querySelector('#pc-pack-name').value.trim(),scopeLabel:root.querySelector('#pc-pack-scope').value.trim(),priceCents:Math.round(Number(root.querySelector('#pc-pack-price').value)*100)};
      const id='pack-'+crypto.randomUUID();await mutate('packages/new-grade',{id,...body});packageId=id;editing=null;
    });};
    root.querySelector('#pc-pack-edit').onsubmit=e=>{e.preventDefault();action(()=>mutate('packages/'+packageId,{name:root.querySelector('#pc-pack-rename').value.trim(),scopeLabel:root.querySelector('#pc-pack-rescope').value.trim()},'PATCH'));};
    root.querySelector('#pc-package').onchange=e=>{packageId=e.target.value;editing=null;selected.clear();draw();};
    root.querySelector('#pc-reload').onclick=()=>action(async()=>{editing=null;});
    root.querySelector('#pc-publish').onclick=()=>action(async()=>{await mutate('publish',{});},'本地目录已发布，精品课使用权限按最新目录重新核验。');
    root.querySelectorAll('[data-edit-placement]').forEach(b=>b.onclick=()=>{editing=placements[Number(b.dataset.editPlacement)];draw();root.scrollIntoView({block:'start'});});
    root.querySelectorAll('[data-cover-placement]').forEach(b=>b.onclick=()=>{
      if(busy)return;const placement=placements[Number(b.dataset.coverPlacement)];
      showCoverEditor({token,placement,revision:draft.revision,onRefresh:async()=>{
        await refresh();return {revision:draft.revision,placement:draft.placements.find(p=>p.packageId===placement.packageId&&p.programId===placement.programId)};
      },onSaved:text=>feedback(text)});
    });
    root.querySelectorAll('[data-edit-material]').forEach(b=>b.onclick=()=>{editing=materials[Number(b.dataset.editMaterial)];draw();root.scrollIntoView({block:'start'});});
    root.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>action(async()=>{await mutate(`placements/${packageId}/${b.dataset.remove}`,{},'DELETE');editing=null;}));
    const cancel=root.querySelector('#pc-cancel');if(cancel)cancel.onclick=()=>{editing=null;draw();};
    const materialSelect=root.querySelector('#pc-material');if(materialSelect)materialSelect.onchange=e=>{const m=materials.find(m=>m.inventoryKey===e.target.value);if(m){root.querySelector('#pc-point').value=m.pointId;root.querySelector('#pc-order').value=m.sortOrder;root.querySelector('#pc-free').checked=m.freeSample;}};
    const fields=()=>({pointId:root.querySelector('#pc-point').value,sortOrder:Number(root.querySelector('#pc-order').value),freeSample:root.querySelector('#pc-free').checked});
    const savePending=root.querySelector('#pc-save-pending');if(savePending)savePending.onclick=()=>action(async()=>{const key=materialSelect.value;if(!key)throw Error('请先选择收到的素材。');await mutate('inventory/edit',{packageId,inventoryKey:key,...fields()});});
    root.querySelector('#pc-editor').onsubmit=e=>{e.preventDefault();action(async()=>{
      const f=fields(),distribution=root.querySelector('#pc-distribution').value,assoc={...f,distribution,sampleScope:f.freeSample?{kind:'whole_program'}:null};
      if(editing){if(editing.programId)await mutate(`placements/${packageId}/${editing.programId}`,assoc,'PATCH');else await mutate('inventory/edit',{packageId,inventoryKey:editing.inventoryKey,...f});editing=null;return;}
      const ids=[...selected],key=materialSelect.value;if(!ids.length)throw Error('请先勾选要关联的原网站作品。');if(ids.length>10)throw Error('一次最多关联10项。');if(key&&ids.length!==1)throw Error('一份素材只能对应一个 programId，请只勾选一项。');
      let completed=0;for(const id of ids){try{const result=await mutate(key?'inventory/link':'placements',{packageId,programId:id,...assoc,...(key?{inventoryKey:key}:{})});draft.revision=result.revision;selected.delete(id);completed++;}catch(error){await refresh();throw Error(`已保存 ${completed} 项；programId ${id} 未保存：${error.message}。其余项尚未提交。`);}}
    });};
    root.querySelector('#pc-category-form').onsubmit=e=>{e.preventDefault();action(async()=>{const mode=root.querySelector('#pc-category-mode').value,id=root.querySelector('#pc-category').value,current=cat(id),name=root.querySelector('#pc-category-name').value.trim(),sortOrder=Number(root.querySelector('#pc-category-order').value);if(mode==='delete')await mutate('categories/'+id,{},'DELETE');else if(mode==='update')await mutate('categories/'+id,{name,sortOrder},'PATCH');else{if(!['grade','block'].includes(current.kind))throw Error('请选择年级以新增板块，或选择板块以新增知识点。');await mutate('categories',{id:'cat-'+crypto.randomUUID(),parentId:id,kind:current.kind==='grade'?'block':'point',name,sortOrder});}});};
    root.querySelector('#pc-search-form').onsubmit=e=>{e.preventDefault();searchQuery=root.querySelector('#pc-query').value;searchPage=1;selected.clear();search();};
    if(results.length)renderResults();
  }
  function renderResults(hasMore=false){
    root.querySelector('#pc-results').innerHTML=results.length?results.map(p=>`<label class="pc-result"><input type="checkbox" data-program="${p.id}" ${selected.has(p.id)?'checked':''}><span>${esc(p.title)}<small>programId ${p.id} · ${p.status===1?'广场已发布':'原作品未公开'}${p.wholeSample?'':' · 整课样例待核验'}</small></span></label>`).join(''):'没有匹配的作品。';
    root.querySelectorAll('[data-program]').forEach(i=>i.onchange=()=>{const id=Number(i.dataset.program);i.checked?selected.add(id):selected.delete(id);});
    root.querySelector('#pc-pages').innerHTML=`<button id="pc-prev" ${searchPage===1?'disabled':''}>上一页</button> 第 ${searchPage} 页 <button id="pc-next" ${!hasMore?'disabled':''}>下一页</button>`;
    root.querySelector('#pc-prev').onclick=()=>{searchPage--;search();};root.querySelector('#pc-next').onclick=()=>{searchPage++;search();};
  }
  async function search(){try{const q=await request('admin/programs?q='+encodeURIComponent(searchQuery)+'&page='+searchPage,{token});if(!root.isConnected)return;results=q.programs;renderResults(q.hasMore);}catch(e){feedback(e.message,true);}}
  try{await refresh();}catch(e){root.textContent=e.message;}
}

export async function startPremiumLesson({course:c,openid,token,openPremium}){
      const key='premium-use:'+openid+':'+c.programId;
      let useId;try{useId=localStorage.getItem(key);}catch{}useId=useId||crypto.randomUUID();
      try{
        let launch;try{launch=await request('playback/launch',{token,method:'POST',body:{programId:c.programId,useId}});}catch(e){if(e.code!=='premium_use_expired')throw e;useId=crypto.randomUUID();launch=await request('playback/launch',{token,method:'POST',body:{programId:c.programId,useId}});}
        try{localStorage.setItem(key,useId);}catch{}
        let stopped=false;const stop=()=>{if(stopped)return;stopped=true;clearInterval(timer);try{localStorage.removeItem(key);}catch{}request('playback/close',{token,method:'POST',body:{useId}}).catch(()=>{});};
        const timer=setInterval(()=>request('playback/renew',{token,method:'POST',body:{useId}}).catch(()=>{stop();document.querySelector('#program-viewer .viewer-close-btn')?.click();}),5*60*1000);
        openPremium(c,{...launch,refreshMicrophone:async()=>{if(stopped)throw Error('本次使用已结束');return request('playback/launch',{token,method:'POST',body:{programId:c.programId,useId}});}},stop);
      }catch(e){throw e;}
}
export async function openMarketplacePremium(programId,{token,openPremium}){
 const access=await request('access',{token});const right=access.courses[programId];if(!right?.premium||!right.direct)return false;
 if(!right.allowed&&!right.sampleAvailable){alert(right.sampleRemaining===0?'该课件累计10次免费使用已用完。':'请购买对应精品套餐后使用。');return true;}
 const data=await request('catalogue'),course=data.courses.find(c=>c.programId===programId);if(!course)throw Error('课件当前不可用');
 await startPremiumLesson({course,openid:access.openid,token,openPremium});return true;
}
