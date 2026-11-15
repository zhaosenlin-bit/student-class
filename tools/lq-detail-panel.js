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
  /*
   * The description of a course is written in markup.  Shown as plain
   * text the reader sees the tags themselves, so the shape of the text
   * is kept: the text is escaped first and only a few bare tags are let
   * through afterwards.  Anything else — an attribute, a script — stays
   * escaped text.
   */
  const richText=value=>{
    const raw=String(value??'');
    if(!raw)return '';
    const allowed=/^(?:p|br|b|strong|i|em|u|h3|h4|h5|ul|ol|li|div|span|small|sup|sub)$/;
    const open=whole=>whole.replace(/&lt;/g,'<').replace(/&gt;/g,'>');
    /* Some texts arrive already escaped, the others arrive as markup. */
    if(/&lt;[a-z]/i.test(raw))return raw.replace(/&lt;(\/?)([a-z][a-z0-9]*)&gt;/gi,(whole,slash,tag)=>allowed.test(tag.toLowerCase())?open(whole):whole);
    if(!/<[a-z][a-z0-9]*>/i.test(raw))return esc(raw);
    return esc(raw).replace(/&lt;(\/?)([a-z][a-z0-9]*)&gt;/gi,(whole,slash,tag)=>allowed.test(tag.toLowerCase())?open(whole):whole);
  };
  const lede=String(p.description||'').trim();
  const actions=`<button class="button wide" data-lq-preview="${esc(p.id)}">▶ 在线预览</button>
    <button class="button secondary wide" data-download-action="download" data-id="${esc(p.id)}">↓ 下载课件</button>`;
  document.title=p.title+' · 乐启享';
  main().innerHTML=`<article class="download-detail"><a class="intro-back" href="#catalog">← 课件库</a><header><p class="eyebrow">${esc((p.stages||[]).join(' · '))} / ${esc(p.subject)}</p><h1>${esc(p.title)}</h1>${lede?`<div class="download-lede" data-lq-lede><div class="download-lede-text" data-lq-lede-text>${richText(lede)}</div><button type="button" class="download-lede-more" data-lq-lede-toggle aria-expanded="false">展开简介</button></div>`:''}</header><div class="download-overview"><figure class="download-cover"><img class="download-cover-image" src="${esc(p.cover)}" alt="${esc(p.title)}课件画面" fetchpriority="high" width="1280" height="720"><div class="lq-preview" data-lq-preview-host hidden></div></figure><aside class="download-panel"><span class="download-chip">${editionLabel(p)} · HTML 课件</span>${actions}</aside></div><section class="download-content" id="course-content"><h2>教学内容</h2><div class="course-modules">${(p.modules||[{title:p.title,description:p.description}]).map(m=>`<section class="course-module"><div><h3>${esc(m.title)}</h3><p>${richText(m.description||'')}</p></div></section>`).join('')}</div></section></article>`;
}
