(function installTrialLocks(config){
 const locked=new Map(config.entries.filter(e=>e.locked).map(e=>[e.id,e]));
 const message='请购买作品或者成为会员解锁后续的章节。';
 const label='🔒 购买或会员解锁';
 const style=document.createElement('style');
 style.textContent=`[data-reviewed-locked]{position:relative;cursor:pointer}[data-reviewed-locked] img{filter:brightness(.45)}[data-reviewed-locked] h4::before{content:'🔒 ';font-size:.85em}[data-reviewed-locked]>.reviewed-picture-lock{position:absolute;top:34px;left:50%;transform:translateX(-50%);z-index:2;border:1px solid #d6b777;border-radius:50%;padding:12px;background:#211d17e8;color:#edcf94;font-size:28px;pointer-events:none}.reviewed-lock-dialog{max-width:520px;padding:32px;border:1px solid #b29257;border-radius:18px;background:radial-gradient(ellipse at top,#403529,#191b1b);color:#f5ead4;text-align:center;font:16px/1.8 system-ui}.reviewed-lock-dialog::backdrop{background:#071014a8}.reviewed-lock-dialog h2{font-size:24px}.reviewed-lock-dialog button{padding:10px 24px;border:1px solid #d3b578;border-radius:9px;background:#e5c98f;color:#282119;font:inherit;cursor:pointer}.reviewed-lock-dialog button:focus-visible{outline:3px solid white;outline-offset:3px}`;
 document.head.append(style);
 const mapStyle=document.createElement('style');mapStyle.textContent='#story-enter[data-reviewed-locked] .story-picture{filter:brightness(.45)}#story-enter[data-reviewed-locked] .story-title::before{content:"🔒 "}';document.head.append(mapStyle);
 let modal;
 function show(){
  if(!modal){modal=document.createElement('dialog');modal.className='reviewed-lock-dialog';modal.dataset.i18nIgnore='';modal.setAttribute('aria-label','解锁后续章节');
   const title=document.createElement('h2');title.textContent='🔒 解锁后续章节';
   const text=document.createElement('p');text.textContent=message;
   const help=document.createElement('p');help.textContent='回到网站作品详情页购买或开通会员，完成后重新进入课件。';
   const button=document.createElement('button');button.type='button';button.textContent='继续试用';button.onclick=()=>modal.close();
   modal.append(title,text,help,button);document.body.append(modal);
  }
  if(!modal.open)modal.showModal();
 }
 function mapped(value){
  if(config.adapter==='france-1789-v1'&&/^delivery-ch0[1-8]$/.test(value||''))return 'chapter-'+value.slice(-1);
  return value;
 }
 function entryFor(node){
  if(config.adapter==='france-1789-v1'&&['story-enter','primary-action','restart-content'].includes(node.id)){
   const event=document.querySelector('#story-card')?.getAttribute('data-event');
   return Object.hasOwn(config.eventEntries||{},event)?locked.get(config.eventEntries[event]):undefined;
  }
  const value=node.getAttribute('data-course-entry')||node.getAttribute('data-content-id')||node.getAttribute('data-delivery-enter')||node.getAttribute('data-delivery-replay');
  if(value)return locked.get(mapped(value));
  if(node.matches('a[href]')){try{const u=new URL(node.getAttribute('href'),location.href);return config.entries.find(e=>e.locked&&[e.path,...e.aliases].some(path=>u.origin===location.origin&&u.pathname===config.prefix+path));}catch{}}
 }
 function mark(node,entry){
  node.setAttribute('data-reviewed-locked',entry.id);
  if(node.matches('.delivery-menu-card,#story-enter')){
   if(!node.querySelector('.reviewed-picture-lock')){const badge=document.createElement('span');badge.className='reviewed-picture-lock';badge.textContent='🔒';badge.setAttribute('aria-hidden','true');node.append(badge);}
   for(const button of node.querySelectorAll('[data-delivery-enter],[data-delivery-replay]')){
    button.disabled=false;button.dataset.i18nIgnore='';if(button.textContent!==label)button.textContent=label;
    button.setAttribute('aria-label',entry.title+'，已锁定，购买或会员解锁');
   }
   const status=node.querySelector('.delivery-save-state');if(status){status.dataset.i18nIgnore='';if(status.textContent!=='购买或会员解锁')status.textContent='购买或会员解锁';}
  }else if(node.matches('a,button')){
   if(node.tagName==='BUTTON')node.disabled=false;
   if(!node.querySelector('[data-reviewed-lock-icon]')){const icon=document.createElement('span');icon.dataset.reviewedLockIcon='';icon.textContent=' 🔒';node.append(icon);}
   node.setAttribute('title',message);
  }
 }
 let queued=false;
 function scan(){queued=false;
  for(const node of document.querySelectorAll('[data-content-id],[data-course-entry],a[href],#story-enter,#primary-action,#restart-content')){
   const entry=entryFor(node);if(entry)mark(node,entry);
   else if(node.hasAttribute('data-reviewed-locked')){node.removeAttribute('data-reviewed-locked');node.querySelector('.reviewed-picture-lock')?.remove();node.querySelector('[data-reviewed-lock-icon]')?.remove();if(node.getAttribute('title')===message)node.removeAttribute('title');}
  }
 }
 // Authored menus rebuild on language changes. Observe their replacements while
 // avoiding self-generated attribute/text mutation loops.
 const observer=new MutationObserver(records=>{if(records.some(r=>r.type==='attributes'&&r.target.matches('#story-card,.story-picture,[data-course-entry],[data-content-id]')||r.type==='childList'&&[...r.addedNodes].some(n=>n.nodeType===1&&!n.matches?.('.reviewed-picture-lock,[data-reviewed-lock-icon],.reviewed-lock-dialog')||n.nodeType===3&&r.target.matches('#primary-action,#restart-content')))&&!queued){queued=true;queueMicrotask(scan);}});
 observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['style','data-event','data-content-id','data-course-entry']});scan();
 document.addEventListener('click',event=>{
  const target=event.target.closest?.('[data-reviewed-locked],[data-course-entry],[data-content-id],[data-delivery-enter],[data-delivery-replay],a[href],#story-enter,#primary-action,#restart-content');
  if(!target)return;const entry=locked.get(target.getAttribute('data-reviewed-locked'))||entryFor(target);
  if(!entry)return;event.preventDefault();event.stopImmediatePropagation();show();
 },true);
})({"adapter":"france-1789-v1","entries":[{"id":"atlas","title":"国家地形总图","path":"index.html","aliases":[],"locked":false},{"id":"chapter-1","title":"第1章","path":"delivery/20260912/index.html","aliases":[],"locked":false},{"id":"chapter-2","title":"第2章","path":"delivery/20260912/chapter02.html","aliases":["delivery/20260912/chapter02-entry.html"],"locked":false},{"id":"chapter-3","title":"第3章","path":"delivery/20260912/chapter03.html","aliases":[],"locked":true},{"id":"chapter-4","title":"第4章","path":"delivery/20260912/chapter04.html","aliases":[],"locked":true},{"id":"chapter-5","title":"第5章","path":"delivery/20260912/chapter05.html","aliases":[],"locked":true},{"id":"chapter-6","title":"第6章","path":"delivery/20260912/chapter06.html","aliases":["delivery/20260912/chapter06-entry.html"],"locked":true},{"id":"chapter-7","title":"第7章","path":"delivery/20260912/chapter07.html","aliases":["delivery/20260912/chapter07-entry.html"],"locked":true},{"id":"chapter-8","title":"第8章","path":"delivery/20260912/chapter08.html","aliases":["delivery/20260912/chapter08-entry.html"],"locked":true},{"id":"ex-valmy","title":"瓦尔密支线","path":"delivery/20260912/ex-valmy.html","aliases":[],"locked":true},{"id":"ex-marseille","title":"马赛支线","path":"delivery/20260912/ex-marseille.html","aliases":[],"locked":true}],"prefix":"/api/reviewed-course-assets/e547484ae39c1c50abdb4d69dde927f3b3375f6d79b0461c/013f31a78dc60f11829db3062dda656cb3e4c01860852756/","eventEntries":{"map-ev-aug04-assembly":"chapter-3","map-ev-aug26-assembly":"chapter-3","map-ev-aug04-printshop":"chapter-3","map-ev-aug26-printshop":"chapter-3","map-ev-august-bastille-state":"chapter-3","ev-royal-escape":"chapter-4","ev-royal-return":"chapter-4","ev-war-declaration":"chapter-4","ev-longwy":"chapter-4","ev-verdun":"chapter-4","ev-monarchy-abolished":"chapter-4","ev-republic-year-one":"chapter-4","ev-vendee-rising":"chapter-5","ev-cholet":"chapter-5","ev-lyon-revolt":"chapter-5","ev-lyon-siege":"chapter-5","ev-lyon-capitulation":"chapter-5","ev-toulon-siege":"chapter-5","ev-toulon-end":"chapter-5","ev-thermidor-arrest":"chapter-5","ev-thermidor-execution":"chapter-5","ev-directory-constitution":"chapter-6","ev-convention-closes":"chapter-6","ev-brumaire-paris":"chapter-6","ev-brumaire-saint-cloud":"chapter-6","ex-valmy":"ex-valmy","ex-marseille":"ex-marseille","ev-marseillais-arrival":"ex-marseille"}});
