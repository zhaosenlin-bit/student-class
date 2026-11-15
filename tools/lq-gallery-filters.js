/*
 * The catalogue filter row of the 乐启享 courseware library.
 *
 * The published shell lists every subject it knows about — sixty of them —
 * and the row buries the catalogue below the fold. Two changes follow from
 * that:
 *
 *   - the busiest subjects stay on the surface, the rest sit behind a
 *     disclosure the reader opens on demand, and the choice survives the
 *     re-render that follows every filter change;
 *   - on a phone the whole row folds away behind one line that says what
 *     is currently chosen, so the catalogue starts right under the title.
 *
 * The fold is a button and a data attribute rather than a <details>
 * element, because the wide screen has to show the row whether the
 * element is open or not, and that is easier to say in a stylesheet.
 */
function downloadGalleryFilters(){
  const stages=['全部',...['小学','初中','高中'].filter(s=>catalog.some(p=>p.stages?.includes(s)))];
  const subjects=availableSubjects(),symbols={'全部':'◈','物理':'Φ','化学':'H₂','数学':'π','生物':'◎','地理':'⌁'};
  const counts=new Map();
  for(const p of catalog){
    if(!matchesOrigin(p,originFilter))continue;
    if(authorFilter&&String(p.creatorId)!==authorFilter)continue;
    if(priceFilter==='本地'&&!p.localInstalled)continue;
    if(priceFilter==='待补齐'&&p.localInstalled)continue;
    if(!['全部','本地','待补齐'].includes(priceFilter)&&p.mode!==(priceFilter==='免费'?'free':'paid'))continue;
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
  const visible=catalog.filter(p=>matchesOrigin(p,originFilter)&&(!authorFilter||String(p.creatorId)===authorFilter));
  const localCount=visible.filter(p=>p.localInstalled).length;
  const missingCount=visible.length-localCount;
  /* The folded line says what is chosen, so nothing is hidden twice. */
  const chosen=[
    stage==='全部'?'':'学段 '+stage,
    filter==='全部'?'':filter,
    priceFilter==='全部'?'':({'本地':'本地可用','待补齐':'待补齐'}[priceFilter]||priceFilter),
    search.trim()?'“'+search.trim()+'”':''
  ].filter(Boolean).join(' · ');
  const summaryText=chosen||'全部学段 · 全部学科 · 全部资源';
  const open=window.lqFiltersOpen===true;
  return `<section class="download-gallery-filters" data-collapsed="${open?'false':'true'}"><button type="button" class="download-gallery-filters-toggle" data-lq-fold-toggle aria-expanded="${open?'true':'false'}"><span>筛选与搜索</span><small>${esc(summaryText)}</small></button><div class="download-gallery-controls"><div class="download-gallery-top"><div class="download-stage-tabs" role="group" aria-label="按学段筛选">${stages.map(s=>`<button type="button" data-action="stage" data-value="${s}" aria-pressed="${stage===s}">${s==='全部'?'全部学段':s}</button>`).join('')}</div><label class="download-gallery-search"><span aria-hidden="true">⌕</span><input class="search" id="search" type="search" placeholder="搜索课件或知识点" aria-label="搜索课件或知识点" value="${esc(search)}"></label></div><div class="download-subject-options" role="group" aria-label="按学科筛选">${chip('全部')}${common.map(chip).join('')}</div>${extra.length?`<details class="download-subject-more" ${subjectsOpen?'open':''}><summary><span>更多学科</span><small>${extra.length}</small></summary><div class="download-subject-options" role="group" aria-label="更多学科筛选">${extra.map(chip).join('')}</div></details>`:''}<div class="download-gallery-bottom"><div class="download-usage-tabs" role="group" aria-label="按可用性筛选">${[['全部','全部资源 '+catalog.length],['本地','本地可用 '+localCount],['待补齐','待补齐 '+missingCount]].map(([v,t])=>`<button type="button" data-action="price-filter" data-value="${v}" aria-pressed="${priceFilter===v}">${t}</button>`).join('')}</div><label class="download-sort">排序 <select id="course-sort" aria-label="课件排序"><option value="default" ${sortBy==='default'?'selected':''}>${search.trim()?'相关度':'目录顺序'}</option><option value="newest" ${sortBy==='newest'?'selected':''}>最近更新</option></select></label></div></div></section>`;
}
