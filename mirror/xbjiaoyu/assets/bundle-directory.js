// Package navigation only. Cards retain the access decisions supplied by the server.
import {libraryChapters} from './library-view.js?v=mobile-20261019';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function bundleChapters(products,bundle,fixedChapters=[]){
 const fits=domain=>!bundle.stage||domain.includes('通用')||(bundle.stage==='高中'?/高中/.test(domain):bundle.stage==='初中'?/初中|[七八九]年级/.test(domain):bundle.stage==='小学'?/小学|[一二三四五六]年级/.test(domain):true);
 const scoped=products.map(p=>({...p,taxonomy:(p.taxonomy||[]).filter(t=>fits(t.domain||''))}));
 const fixed=bundle.stage==='初中'&&bundle.subject==='物理'?fixedChapters:[];
 return libraryChapters(scoped,fixed).map(chapter=>({...chapter,ids:products.filter(p=>chapter.ids.includes(p.id)).map(p=>p.id)}));
}

function groups(chapters){
 const volumes=new Map();
 for(const chapter of chapters){if(!volumes.has(chapter.domain))volumes.set(chapter.domain,[]);volumes.get(chapter.domain).push(chapter);}
 return [...volumes];
}

function contents(products,chapters,card,selected){
 const visible=selected?chapters.filter(c=>c.id===selected):chapters;
 const sections=groups(visible).map(([domain,units])=>{
  const ids=[...new Set(units.flatMap(unit=>unit.ids))];
  const items=ids.map(id=>products.find(p=>p.id===id)).filter(Boolean);
  return {domain,units,items};
 });
 const entry=(p,units,domain='')=>`<div class="bundle-course-entry">${selected?'':`<p class="bundle-card-unit">${[domain,...units.filter(unit=>unit.ids.includes(p.id)).map(unit=>unit.title)].filter(Boolean).map(esc).join(' · ')}</p>`}${card(p)}</div>`;
 // Move only publicly free courses. Purchased access does not make a course a free trial.
 // Keep curriculum order within both groups, and leave the directory itself unchanged.
 const free=[],seen=new Set();
 if(!selected)for(const section of sections)for(const p of section.items){
  if(p.mode==='free'&&!seen.has(p.id)){seen.add(p.id);free.push(entry(p,section.units,section.domain));}
 }
 const trials=free.length?`<section class="bundle-volume-content bundle-free-content"><h2>免费体验</h2><div class="grid bundle-course-grid">${free.join('')}</div></section>`:'';
 return trials+sections.map(({domain,units,items})=>{
  const ordered=selected?[...items.filter(p=>p.mode==='free'),...items.filter(p=>p.mode!=='free')]:items.filter(p=>p.mode!=='free');
  if(!ordered.length)return '';
  return `<section class="bundle-volume-content"><h2>${esc(domain)}</h2>${selected?`<div class="bundle-unit-heading"><h3>${esc(units[0].title)}</h3><span>${ordered.length} 份课件</span></div>`:''}<div class="grid bundle-course-grid">${ordered.map(p=>entry(p,units)).join('')}</div></section>`;
 }).join('')||'<p class="subtle">暂无课件</p>';
}

export function renderBundleDirectory(products,bundle,{chapters=[],card,desktop=true,selectedChapter=''}={}){
 const units=bundleChapters(products,bundle,chapters);
 const selected=units.some(c=>c.id===selectedChapter)?selectedChapter:'';
 return `<div class="library-browser bundle-browser"><aside class="library-directory" aria-label="课件包年级与单元目录"><details class="library-curriculum" ${desktop?'open':''}><summary class="library-directory-toggle"><span>年级与单元目录</span><span aria-hidden="true">⌄</span></summary><div class="library-directory-body"><h2>年级与单元</h2><button class="library-unit-all${selected?'':' selected'}" data-bundle-chapter="" aria-pressed="${!selected}">全部课件</button>${groups(units).map(([name,list],index)=>`<details class="library-volume" ${selected?list.some(c=>c.id===selected)?'open':'':index===0?'open':''}><summary>${esc(name)}</summary><div class="library-unit-list">${list.map(unit=>`<button class="library-unit${unit.id===selected?' selected':''}" data-bundle-chapter="${esc(unit.id)}" aria-pressed="${unit.id===selected}"><span>${esc(unit.title)}</span><small>${unit.ids.length}</small></button>`).join('')}</div></details>`).join('')}</div></details></aside><div class="bundle-directory-content">${contents(products,units,card,selected)}</div></div>`;
}

export function bindBundleDirectory(host,products,bundle,{chapters=[],card,onRender=()=>{}}={}){
 if(!host)return;
 const units=bundleChapters(products,bundle,chapters);
 host.addEventListener('click',event=>{
  const button=event.target.closest('[data-bundle-chapter]');if(!button||!host.contains(button))return;
  for(const item of host.querySelectorAll('[data-bundle-chapter]')){const selected=item===button;item.classList.toggle('selected',selected);item.setAttribute('aria-pressed',String(selected));}
  const content=host.querySelector('.bundle-directory-content');
  content.innerHTML=contents(products,units,card,button.dataset.bundleChapter);
  onRender();
  // Preserve expanded grades and directory scroll while replacing only the course cards.
  if(globalThis.matchMedia?.('(max-width:900px)').matches)host.querySelector('.library-curriculum').open=false;
  content.scrollIntoView({behavior:'auto',block:'start'});
 });
}
