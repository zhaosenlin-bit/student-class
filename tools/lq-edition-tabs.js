/*
 * The version strip of the catalogue.
 *
 * Five versions, each with a count, is one line of buttons on a wide
 * screen and three lines of buttons on a phone. The phone version folds
 * behind one line that names the current choice; the stylesheet decides
 * which of the two applies, so the fold is not left to the state of a
 * disclosure element.
 */
const editionTabs=(products,selected='all',action='download-edition')=>{
  const label=(downloadEditions.find(([value])=>value===selected)||[])[1]||'全部课件';
  const count=products.filter(p=>matchesDownloadEdition(p,selected)).length;
  const open=window.lqEditionOpen===true;
  /* A version that holds nothing is not a choice, so it is not shown. */
  const shown=downloadEditions.filter(([value])=>value==='all'||value===selected||products.some(p=>matchesDownloadEdition(p,value)));
  return `<div class="download-edition-fold" data-collapsed="${open?'false':'true'}"><button type="button" class="download-edition-toggle" data-lq-fold-toggle aria-expanded="${open?'true':'false'}"><span>版本</span><small>${esc(label)} · ${count} 份</small></button><nav class="download-edition-tabs" aria-label="课件版本目录">${shown.map(([value,title])=>`<button type="button" data-action="${action}" data-value="${value}" aria-pressed="${selected===value}"><strong>${title}</strong><span>${products.filter(p=>matchesDownloadEdition(p,value)).length} 份</span></button>`).join('')}</nav></div>`;
};
