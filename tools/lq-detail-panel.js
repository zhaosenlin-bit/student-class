/*
 * The detail panel of one course, for the 乐启享 local library.
 *
 * The page has one job: let a teacher open the courseware or take it
 * away. Everything else is either hidden until it is asked for, or gone.
 *
 *   - the cover stands in for the courseware until the reader asks for
 *     it; opening the preview takes over the page (see lq-preview.js);
 *   - the long description is folded to three lines and opens on a click;
 *   - the notes and the lesson plan sit behind disclosures instead of
 *     filling the screen;
 *   - a course whose body never reached this disk says so in one line
 *     and offers the lesson plan, which is on disk and is useful anyway.
 */
function detail(p){
  const local=!!p.localInstalled;
  /*
   * A course whose body never made it to this disk is not broken, it is
   * simply not here yet, and the reason is worth naming in the teacher's
   * own words rather than the platform's jargon.
   */
  const reason={
    '线上需购买下载卡':'原站需要单独购买下载卡',
    '线上需 VIP 会员':'原站需要 VIP 会员权益',
    '线上试看额度已用尽':'原站试看次数已经用完'
  }[p.localReason]||p.localReason;
  const lede=String(p.description||'').trim();
  const badge=local
    ? '<span class="download-free-badge">本地可用</span>'
    : '<span class="download-pending-badge">正文待补齐</span>';
  const actions=local
    ? `<button class="button wide" data-lq-preview="${esc(p.id)}">▶ 在线预览</button>
       <button class="button secondary wide" data-download-action="download" data-id="${esc(p.id)}">↓ 下载课件</button>`
    : '<a class="button wide" href="#course-content">查看教学内容 ↓</a>';
  const notes=local
    ? '<p>下载后是一个 HTML 文件，双击用浏览器打开即可，实验与操作都能用。</p>'
    : `<p>封面、目录和章节信息已经收录在本地库，可以先用来备课。</p>
       <p>课件正文需要从原站取回（${reason||'原站暂未开放'}），还没有落到本地。</p>`;
  document.title=p.title+' · 乐启享';
  main().innerHTML=`<article class="download-detail"><a class="intro-back" href="#catalog">← 课件库</a><header><p class="eyebrow">${esc((p.stages||[]).join(' · '))} / ${esc(p.subject)}</p><h1>${esc(p.title)}</h1>${lede?`<div class="download-lede" data-lq-lede><p>${esc(lede)}</p><button type="button" class="download-lede-more" data-lq-lede-toggle aria-expanded="false">展开简介</button></div>`:''}</header><div class="download-overview"><figure class="download-cover"><img class="download-cover-image" src="${esc(p.cover)}" alt="${esc(p.title)}课件画面" fetchpriority="high" width="1280" height="720"><div class="lq-preview" data-lq-preview-host hidden></div></figure><aside class="download-panel"><span class="download-chip">${editionLabel(p)} · HTML 课件</span><h2>${badge}</h2>${actions}<details class="download-notes"><summary>使用说明</summary><div class="download-notes-body">${notes}</div></details></aside></div><section class="download-content" id="course-content"><h2>教学内容</h2><div class="course-modules">${(p.modules||[{title:p.title,description:p.description}]).map(m=>`<section class="course-module"><div><h3>${esc(m.title)}</h3><p>${esc(m.description||'')}</p></div></section>`).join('')}</div><details class="download-open-notes"><summary>打开与使用</summary><ol><li>下载后保留 .html 文件后缀，用 Chrome 或 Edge 打开。</li><li>上课前在教室电脑上试一遍，确认显示、声音和核心操作正常。</li></ol></details></section></article>`;
}
