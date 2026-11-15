import {pptMarkup} from './course-tools.js?v=ppt-refund-20261020';
// Presentation uses authorized library snapshots only; sale inventory never grants access.
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mounted=new WeakMap();

export function libraryChapters(products=[],fixedChapters=[]){
 const available=new Set(products.map(p=>p.id)),covered=new Set(),chapters=[];
 for(const chapter of fixedChapters){
  const ids=[...new Set((chapter.topics||[]).flatMap(topic=>topic.courseIds||[]))].filter(id=>available.has(id));
  if(!ids.length)continue;
  ids.forEach(id=>covered.add(id));
  chapters.push({id:`fixed-${chapter.id}`,subject:'物理',domain:chapter.domain||'初中',title:chapter.title,ids});
 }
 const derived=new Map();
 for(const product of products){
  if(covered.has(product.id))continue;
  const subject=product.subject||'其他';
  const mappings=product.taxonomy?.length?product.taxonomy:[{domain:(product.stages||[]).join('、')||subject,chapter:product.title}];
  for(const mapping of mappings){
   const domain=mapping.domain||subject,title=mapping.chapter||product.title,key=`${subject}|${domain}|${title}`;
   if(!derived.has(key))derived.set(key,{id:`taxonomy-${key}`,subject,domain,title,ids:[]});
   const item=derived.get(key);if(!item.ids.includes(product.id))item.ids.push(product.id);
  }
 }
 return chapters.concat([...derived.values()]);
}

export function libraryCards(products=[]){
 return `<div class="library-course-grid">${products.map(product=>`<article class="library-course-card"><a class="library-card-cover" href="#course/${escapeHtml(product.id)}" aria-label="查看${escapeHtml(product.title)}的介绍"><img src="${escapeHtml(product.cover||'/images/community-cover.svg')}" alt="${escapeHtml(product.title)}课件画面" loading="lazy" decoding="async" width="720" height="390"><span aria-hidden="true">↗</span></a><div class="library-card-body"><h3><a href="#course/${escapeHtml(product.id)}">${escapeHtml(product.title)}</a></h3><p class="subtle">${escapeHtml(product.device||'在线课件')}</p><div class="library-card-actions"><button class="button small" data-action="trial" data-id="${escapeHtml(product.id)}">在线使用 ↗</button><a class="text-button" href="#course/${escapeHtml(product.id)}">介绍与反馈 ↗</a></div>${pptMarkup(product.id)}</div></article>`).join('')}</div>`;
}

function contentMarkup(library,selected){
 const included=product=>!selected||selected.ids.includes(product.id);
 const bundles=library.bundles.map(bundle=>({...bundle,visible:bundle.products.filter(included)})).filter(bundle=>bundle.visible.length);
 const other=library.other.filter(included),count=library.products.filter(included).length;
 return `<div class="library-result-heading"><h2>${escapeHtml(selected?.title||'全部已授权课件')}</h2><span>${count} 份课件</span></div>${bundles.map(bundle=>`<section class="library-bundle"><header><div><p class="eyebrow">${escapeHtml([bundle.stage,bundle.subject].filter(Boolean).join(' · '))}</p><h2>${escapeHtml(bundle.title)}</h2><p class="subtle">${bundle.products.length} 份已授权课件 · 永久在线使用</p></div><a class="text-button" href="#bundle/${escapeHtml(bundle.id)}">课件包介绍 ↗</a></header>${libraryCards(bundle.visible)}</section>`).join('')}${other.length?`<section class="library-other"><h2>${library.bundles.length?'其他已授权课件':'已授权课件'}</h2><p class="subtle">历史购买与其他合法授权继续有效。</p>${libraryCards(other)}</section>`:''}${!count?'<div class="empty"><h3>暂无已授权课件</h3><p>可在课件库查看免费体验。</p><a class="button" href="#catalog">查看课件库</a></div>':''}`;
}

function directoryMarkup(chapters,desktop){
 const groups=new Map();for(const chapter of chapters){const key=`${chapter.subject} · ${chapter.domain}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(chapter);}
 return `<aside class="library-directory" aria-label="已授权课件章节目录"><details class="library-curriculum" ${desktop?'open':''}><summary class="library-directory-toggle"><span>章节目录</span><span aria-hidden="true">⌄</span></summary><div class="library-directory-body"><h2>章节目录</h2><button class="library-unit-all selected" data-library-chapter="" aria-pressed="true">全部已授权课件</button>${[...groups].map(([name,list],index)=>`<details class="library-volume" ${index===0?'open':''}><summary>${escapeHtml(name)}</summary><div class="library-unit-list">${list.map(chapter=>`<button class="library-unit" data-library-chapter="${escapeHtml(chapter.id)}" aria-pressed="false"><span>${escapeHtml(chapter.title)}</span><small>${chapter.ids.length}</small></button>`).join('')}</div></details>`).join('')}</div></details></aside>`;
}

export function renderPurchaseLibrary(library,{chapters=[],ordersMarkup='',desktop=true}={}){
 const directory=libraryChapters(library.products,chapters);
 return `<section class="purchase-library"><div class="library-header"><h1>我的课件</h1><div class="library-header-actions"><a class="button small" href="#refunds">退款与售后</a><a class="button secondary small" href="#bundle">查看课件包 ↗</a></div></div><div class="library-browser">${directoryMarkup(directory,desktop)}<div class="library-content">${contentMarkup(library,null)}</div></div>${ordersMarkup}</section>`;
}

export function mountPurchaseLibrary(host,library,options={}){
 const previous=mounted.get(host);if(previous)previous();
 const viewport=globalThis.matchMedia?.('(min-width:901px)');
 const desktop=viewport?.matches??true;
 host.innerHTML=renderPurchaseLibrary(library,{...options,desktop});
 const chapters=libraryChapters(library.products,options.chapters);
 const select=(button,restore=false)=>{
  if(!button||!host.contains(button))return;
  const chapter=chapters.find(item=>item.id===button.dataset.libraryChapter)||null;
  for(const item of host.querySelectorAll('[data-library-chapter]')){const active=item===button;item.classList.toggle('selected',active);item.setAttribute('aria-pressed',String(active));}
  const content=host.querySelector('.library-content');content.innerHTML=contentMarkup(library,chapter);
  if(restore)return;
  if(globalThis.matchMedia?.('(max-width:900px)').matches)host.querySelector('.library-curriculum').open=false;
  const reduced=globalThis.matchMedia?.('(prefers-reduced-motion:reduce)').matches;
  content.scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'});
 };
 const listener=event=>select(event.target.closest('[data-library-chapter]'));
 if(options.selectedChapter)select([...host.querySelectorAll('[data-library-chapter]')].find(b=>b.dataset.libraryChapter===options.selectedChapter),true);
 const onViewportChange=event=>{if(event.matches){const panel=host.querySelector('.library-curriculum');if(panel)panel.open=true;}};
 host.addEventListener('click',listener);
 if(viewport?.addEventListener)viewport.addEventListener('change',onViewportChange);else viewport?.addListener?.(onViewportChange);
 mounted.set(host,()=>{
  host.removeEventListener('click',listener);
  if(viewport?.removeEventListener)viewport.removeEventListener('change',onViewportChange);else viewport?.removeListener?.(onViewportChange);
 });
}
