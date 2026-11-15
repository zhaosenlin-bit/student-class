/*
 * The detail panel of one course, for the 乐启享 local library.
 *
 * The page has one job: let a teacher open the courseware or take it
 * away. Two buttons do that, and nothing else competes for attention.
 *
 *   - the cover stands in for the courseware until the reader asks for
 *     it; opening the preview takes over the page (see lq-preview.js);
 *   - the long description is folded to three lines and opens on a click;
 *   - the lesson plan stays on the page, because a teacher wants to know
 *     what is inside before opening it.
 *
 * There is no badge and no status line. Every course in the catalogue
 * can be opened and downloaded, so there is nothing to warn about.
 */
function detail(p){
  const lede=String(p.description||'').trim();
  const actions=`<button class="button wide" data-lq-preview="${esc(p.id)}">▶ 在线预览</button>
    <button class="button secondary wide" data-download-action="download" data-id="${esc(p.id)}">↓ 下载课件</button>`;
  document.title=p.title+' · 乐启享';
  main().innerHTML=`<article class="download-detail"><a class="intro-back" href="#catalog">← 课件库</a><header><p class="eyebrow">${esc((p.stages||[]).join(' · '))} / ${esc(p.subject)}</p><h1>${esc(p.title)}</h1>${lede?`<div class="download-lede" data-lq-lede><p>${esc(lede)}</p><button type="button" class="download-lede-more" data-lq-lede-toggle aria-expanded="false">展开简介</button></div>`:''}</header><div class="download-overview"><figure class="download-cover"><img class="download-cover-image" src="${esc(p.cover)}" alt="${esc(p.title)}课件画面" fetchpriority="high" width="1280" height="720"><div class="lq-preview" data-lq-preview-host hidden></div></figure><aside class="download-panel"><span class="download-chip">${editionLabel(p)} · HTML 课件</span>${actions}</aside></div><section class="download-content" id="course-content"><h2>教学内容</h2><div class="course-modules">${(p.modules||[{title:p.title,description:p.description}]).map(m=>`<section class="course-module"><div><h3>${esc(m.title)}</h3><p>${esc(m.description||'')}</p></div></section>`).join('')}</div></section></article>`;
}
