/*
 * 乐启享课件库的 PPT 超链接工具。
 *
 * 这个弹窗只说一件事：把链接贴进 PPT 以后，放映时打开的那台机器
 * 要能访问到这个课件库。课件本身不需要账号，链接点开就是课件。
 */

const esc = value =>
  String(value ?? '').replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );

export const PPT_NOTICE = '使用超链接功能需要教学电脑能够访问本机课件库。';

export function pptMarkup(id) {
  return `<div class="ppt-link-tools"><button class="button secondary small" data-action="ppt-link" data-id="${esc(id)}"><span aria-hidden="true">↗</span> PPT 超链接</button><strong class="ppt-link-notice">${PPT_NOTICE}</strong></div>`;
}

export function pptUrl(origin, id) {
  if (!/^[a-z0-9-]+$/.test(id)) throw Error('未找到课件');
  const url = new URL('/', origin);
  url.searchParams.set('from', 'ppt');
  url.hash = 'play/' + id;
  return url.href;
}

/* 课件不需要账号：这个判断永远不成立，链接点开就是课件本身。 */
export function requiresPptLogin() {
  return false;
}

export function createCourseTools({ modal, toast, getProduct, origin }) {
  function open(id) {
    const p = getProduct(id);
    if (!p) throw Error('未找到课件');
    const url = pptUrl(origin, id);
    modal(
      `<div class="dialog-content ppt-link-dialog"><p class="eyebrow">${esc(p.title)}</p><h2>插入 PPT 超链接</h2>` +
        `<p class="ppt-link-notice">${PPT_NOTICE}</p><label for="ppt-course-url">课件链接</label>` +
        `<input id="ppt-course-url" type="url" value="${esc(url)}" readonly>` +
        `<button class="button wide" data-action="copy-ppt-link" data-id="${esc(id)}">复制课件链接</button>` +
        `<ol class="ppt-link-steps"><li>在 PPT 中选中文字、图片或按钮。</li>` +
        `<li>选择“插入 → 链接／超链接”，粘贴课件链接。</li>` +
        `<li>放映时点击链接，在浏览器中打开课件；讲解后切回 PPT。</li></ol>` +
        `<p class="subtle">放映用的那台电脑要能访问到这个课件库；课件已经收在机器上，打开链接即可使用。</p>` +
        `<p class="ppt-copy-status" role="status"></p></div>`
    );
  }
  async function copy(id) {
    const input = document.querySelector('#ppt-course-url');
    const status = document.querySelector('.ppt-copy-status');
    try {
      await navigator.clipboard.writeText(pptUrl(origin, id));
      if (status) status.textContent = '已复制，可粘贴到 PPT 的超链接地址中。';
      toast('课件链接已复制');
    } catch {
      input?.focus();
      input?.select();
      if (status) status.textContent = '请复制已选中的链接，再粘贴到 PPT。';
    }
  }
  return { open, copy };
}
