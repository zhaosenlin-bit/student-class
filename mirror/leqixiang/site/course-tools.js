const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const PPT_NOTICE = '使用超链接功能需要教学电脑联网并登录网站账号。';
export function pptMarkup(id) {
  return `<div class="ppt-link-tools"><button class="button secondary small" data-action="ppt-link" data-id="${esc(id)}"><span aria-hidden="true">↗</span> PPT 超链接</button><strong class="ppt-link-notice">${PPT_NOTICE}</strong></div>`;
}
export function pptUrl(origin, id) {
  if (!/^[a-z0-9-]+$/.test(id)) throw Error('未找到课件');
  const url = new URL('/', origin); url.searchParams.set('from', 'ppt'); url.hash = 'play/' + id;
  return url.href;
}
export function requiresPptLogin(location, user) {
  return !user && new URLSearchParams(location.search).get('from') === 'ppt' && /^#(?:play|classroom)\/[a-z0-9-]+$/.test(location.hash);
}
export function purchaseNotice(id) {
  return `<div class="dialog-content purchase-online-notice"><span class="purchase-notice-icon" aria-hidden="true">↗</span><h2>购买前请确认</h2><p>本课件仅支持在线使用，并且提供超链接插入ppt功能。</p><p><strong>本课件无法下载到本地，请确认后继续购买。</strong></p><div class="actions"><button class="button wide" data-action="continue-purchase" data-id="${esc(id)}">继续购买</button></div></div>`;
}
export function createCourseTools({modal, toast, getProduct, origin}) {
  function open(id) {
    const p = getProduct(id); if (!p) throw Error('未找到课件');
    const url = pptUrl(origin, id);
    modal(`<div class="dialog-content ppt-link-dialog"><p class="eyebrow">${esc(p.title)}</p><h2>插入 PPT 超链接</h2><p class="ppt-link-notice">${PPT_NOTICE}</p><label for="ppt-course-url">课件链接</label><input id="ppt-course-url" type="url" value="${esc(url)}" readonly><button class="button wide" data-action="copy-ppt-link" data-id="${esc(id)}">复制课件链接</button><ol class="ppt-link-steps"><li>在 PPT 中选中文字、图片或按钮。</li><li>选择“插入 → 链接／超链接”，粘贴课件链接。</li><li>放映时点击链接，在浏览器中打开课件；讲解后切回 PPT。</li></ol><p class="subtle">上课前请在教学电脑的默认浏览器登录网站账号。链接不会附带账号权限，付费课件仍需该账号已购买。</p><p class="ppt-copy-status" role="status"></p></div>`);
  }
  async function copy(id) {
    const input = document.querySelector('#ppt-course-url'), status = document.querySelector('.ppt-copy-status');
    try { await navigator.clipboard.writeText(pptUrl(origin, id)); if (status) status.textContent = '已复制，可粘贴到 PPT 的超链接地址中。'; toast('课件链接已复制'); }
    catch { input?.focus(); input?.select(); if (status) status.textContent = '请复制已选中的链接，再粘贴到 PPT。'; }
  }
  return {open, copy};
}
