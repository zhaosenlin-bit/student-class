/*
 * The catalogue filter row of the 乐启享 courseware library.
 *
 * The row is a toolbar, not a wall. What a teacher reaches for first is
 * a word and a sort order, so those stay on the surface; the facets
 * (stage, subject) sit behind one disclosure that names the choice in
 * force, so the catalogue is visible the moment the page opens.
 *
 * There is no availability facet and no price facet. Every course in the
 * list can be opened and taken away, so a filter that separates them
 * would only promise something the library does not have to deliver.
 *
 * The fold is a button and a data attribute rather than a <details>
 * element, because the stylesheet has to decide the open state on its
 * own, and a remembered state is not what a reader who just arrived
 * should see.
 */
function downloadGalleryFilters(){
  const stages=['全部',...['小学','初中','高中'].filter(s=>catalog.some(p=>p.stages?.includes(s)))];
  const subjects=availableSubjects(),symbols={'全部':'◈','物理':'Φ','化学':'H₂','数学':'π','生物':'◎','地理':'⌁','科学':'❋'};
  const counts=new Map();
  for(const p of catalog){
    if(!matchesOrigin(p,originFilter))continue;
    if(authorFilter&&String(p.creatorId)!==authorFilter)continue;
    if(stage!=='全部'&&!p.stages?.includes(stage))continue;
    const key=lessonSubject(p);counts.set(key,(counts.get(key)||0)+1);
  }
  const ranked=subjects.slice(1).map((name,index)=>({name,index}));
  ranked.sort((a,b)=>(counts.get(b.name)||0)-(counts.get(a.name)||0)||a.index-b.index);
  const picked=ranked.map(x=>x.name);
  const common=picked.slice(0,7);
  if(filter!=='全部'&&!common.includes(filter))common.unshift(filter);
  const extra=picked.filter(name=>!common.includes(name));
  const chip=s=>`<button type="button" data-action="filter" data-value="${esc(s)}" aria-pressed="${filter===s}"><span class="download-subject-symbol" aria-hidden="true">${symbols[s]||'◇'}</span><strong>${s==='全部'?'全部学科':esc(s)}</strong></button>`;
  /* The folded line names what is folded away — stage and subject. */
  const chosen=[
    stage==='全部'?'':'学段 '+stage,
    filter==='全部'?'':'学科 '+filter
  ].filter(Boolean).join(' · ');
  const summaryText=chosen||'全部学段 · 全部学科';
  const open=window.lqFiltersOpen===true;
  return `<section class="download-gallery-filters" data-collapsed="${open?'false':'true'}"><div class="download-gallery-toolbar"><label class="download-gallery-search"><span aria-hidden="true">⌕</span><input class="search" id="search" type="search" placeholder="搜索课件或知识点" aria-label="搜索课件或知识点" value="${esc(search)}"></label><button type="button" class="download-gallery-filters-toggle" data-lq-fold-toggle aria-expanded="${open?'true':'false'}"><span>筛选</span><small>${esc(summaryText)}</small></button><label class="download-sort">排序 <select id="course-sort" aria-label="课件排序"><option value="default" ${sortBy==='default'?'selected':''}>${search.trim()?'相关度':'目录顺序'}</option><option value="newest" ${sortBy==='newest'?'selected':''}>最近更新</option></select></label></div><div class="download-gallery-controls"><div class="download-stage-tabs" role="group" aria-label="按学段筛选">${stages.map(s=>`<button type="button" data-action="stage" data-value="${s}" aria-pressed="${stage===s}">${s==='全部'?'全部学段':s}</button>`).join('')}</div><div class="download-subject-options" role="group" aria-label="按学科筛选">${chip('全部')}${common.map(chip).join('')}</div>${extra.length?`<details class="download-subject-more" ${subjectsOpen?'open':''}><summary><span>更多学科</span><small>${extra.length}</small></summary><div class="download-subject-options" role="group" aria-label="更多学科筛选">${extra.map(chip).join('')}</div></details>`:''}</div></section>`;
}
