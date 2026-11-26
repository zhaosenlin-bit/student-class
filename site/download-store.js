/*
 * 乐启享课件库的课件卡片、详情页与下载。
 *
 * 这一份只做三件事：把一份课件画成卡片、把它的说明摊开、把文件交到
 * 老师手上。
 *
 * 课件全部已经收在库里，看和拿都不收费，也就没有账号、额度、订单
 * 与售后可言。所以只留下「在线预览」和「下载」两个动作。
 */

export const downloadEditions = [
  ['all', '全部课件'],
  ['integrated', '三维整合版'],
  ['2d-integrated', '二维整合版'],
  ['standalone', '三维独立版'],
  ['2d-standalone', '二维独立版'],
];
export const validDownloadEdition = value =>
  downloadEditions.some(([key]) => key === value) ? value : 'all';
export const matchesDownloadEdition = (product, edition = 'all') =>
  edition === 'all' ||
  ((product.dimension === '2d') === edition.startsWith('2d-') &&
    (edition.endsWith('integrated')
      ? product.edition === 'integrated'
      : product.edition !== 'integrated'));

export function createDownloadUI({ api, esc, product, main, modal, toast }) {
  /*
   * 卡片上的说明是一段带着标记的正文。详情页会保留这些段落的形状，
   * 卡片却要把它折成两行——在那里，标记本身会变成读者看到的东西。
   * 所以卡片只取字，不取标记。
   */
  const plain = value =>
    String(value ?? '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();

  let busy = false;

  const integrated = p => p?.edition === 'integrated';
  const editionLabel = p =>
    (p.dimension === '2d' ? '二维' : '三维') + (integrated(p) ? '整合版' : '独立版');

  /*
   * 目录上方的版本条。
   *
   * 五个版本，每个后面跟着一个份数，在宽屏上是一行按钮，在手机上会
   * 变成三行。手机版收在一行说明当前选择后面，由样式表决定用哪一
   * 版，所以它不交给脚本去控制展开状态。
   */
  const editionTabs = (products, selected = 'all', action = 'download-edition') => {
    const found = downloadEditions.find(([value]) => value === selected);
    const label = (found ? found[1] : '') || '全部课件';
    const count = products.filter(p => matchesDownloadEdition(p, selected)).length;
    const open = window.lqEditionOpen === true;
    /* 一个版本里一份课件都没有，就不是一个选择，不给它位置。 */
    const shown = downloadEditions.filter(
      ([value]) =>
        value === 'all' ||
        value === selected ||
        products.some(p => matchesDownloadEdition(p, value))
    );
    const buttons = shown
      .map(
        ([value, title]) =>
          `<button type="button" data-action="${action}" data-value="${value}" aria-pressed="${selected === value}"><strong>${title}</strong><span>${products.filter(p => matchesDownloadEdition(p, value)).length} 份</span></button>`
      )
      .join('');
    return `<div class="download-edition-fold" data-collapsed="${open ? 'false' : 'true'}"><button type="button" class="download-edition-toggle" data-lq-fold-toggle aria-expanded="${open ? 'true' : 'false'}"><span>版本</span><small>${esc(label)} · ${count} 份</small></button><nav class="download-edition-tabs" aria-label="课件版本目录">${buttons}</nav></div>`;
  };

  function card(p) {
    return `<article class="product-card download-resource"><a class="cover" href="#course/${esc(p.id)}"><img src="${esc(p.cover)}" alt="${esc(p.title)}课件画面" loading="lazy" decoding="async" width="720" height="405"><span class="cover-badge">${esc(p.subject)} · ${editionLabel(p)}</span></a><div class="card-body"><div class="card-meta"><span>${esc((p.stages || []).join(' · '))}</span></div><a class="card-title" href="#course/${esc(p.id)}"><h3>${esc(p.title)}</h3></a><p class="card-description">${plain(p.description)}</p><div class="download-card-actions"><button class="button wide" data-lq-preview-start="${esc(p.id)}">▶ 在线预览</button><button class="button secondary wide" data-download-action="download" data-id="${esc(p.id)}">↓ 下载</button></div></div></article>`;
  }

  /*
   * 一份课件的详情页。
   *
   * 这一页只有一件事：让老师打开课件，或者把课件带走。真正动手的按钮
   * 只有两个，其余的都不来抢注意力。
   *
   *   - 封面先替课件占住位置，老师要看的时候再由预览接管这一页
   *     （见 lq-preview.js）；
   *   - 长的说明折成三行，点一下展开；
   *   - 目录留在页面上——老师总想知道课件里有什么再决定打开。
   *
   * 没有徽标，也没有状态行。目录里的每一份课件都能打开、能下载，
   * 所以没有需要提醒的事。
   */
  function detail(p) {
    /*
     * 课件的说明是带着标记写的。直接当纯文本显示，读者会看到标记本身，
     * 所以这里先转义、再放行少数几个不带属性的段落标记。属性、脚本
     * 一律留在转义后的文本里。
     */
    const richText = value => {
      const raw = String(value ?? '');
      if (!raw) return '';
      const allowed = /^(?:p|br|b|strong|i|em|u|h3|h4|h5|ul|ol|li|div|span|small|sup|sub)$/;
      const open = whole => whole.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      if (/&lt;[a-z]/i.test(raw)) {
        return raw.replace(
          /&lt;(\/?)([a-z][a-z0-9]*)\s*\/?&gt;/gi,
          (whole, slash, tag) => (allowed.test(tag.toLowerCase()) ? open(whole) : whole)
        );
      }
      if (!/<[a-z][a-z0-9]*\s*\/?>/i.test(raw)) return esc(raw);
      return esc(raw).replace(
        /&lt;(\/?)([a-z][a-z0-9]*)\s*\/?&gt;/gi,
        (whole, slash, tag) => (allowed.test(tag.toLowerCase()) ? open(whole) : whole)
      );
    };
    const lede = String(p.description || '').trim();
    /*
     * 这一份课件是乐启享整理并本地化的：页面、图片、说明与离线运行都
     * 是这里做的。内容来自开放许可的课件，原作者的署名与许可写在项目
     * 的 NOTICE 里。
     */
    const byline =
      '课件改编整理与本地化：乐启享机器人 · 内容来自开放许可课件，来源与许可见项目文档（NOTICE）';
    const actions = `<button class="button wide" data-lq-preview="${esc(p.id)}">▶ 在线预览</button><button class="button secondary wide" data-download-action="download" data-id="${esc(p.id)}">↓ 下载课件</button>`;
    const lead = lede
      ? `<div class="download-lede" data-lq-lede><div class="download-lede-text" data-lq-lede-text>${richText(lede)}</div><button type="button" class="download-lede-more" data-lq-lede-toggle aria-expanded="false">展开简介</button></div>`
      : '';
    const modules = (p.modules || [{ title: p.title, description: p.description }])
      .map(
        m =>
          `<section class="course-module"><div><h3>${esc(m.title)}</h3><p>${richText(m.description || '')}</p></div></section>`
      )
      .join('');
    document.title = p.title + ' · 乐启享';
    main().innerHTML = `<article class="download-detail"><a class="intro-back" href="#catalog">← 课件库</a><header><p class="eyebrow">${esc((p.stages || []).join(' · '))} / ${esc(p.subject)}</p><h1>${esc(p.title)}</h1><p class="download-byline">${byline}</p>${lead}</header><div class="download-overview"><figure class="download-cover"><img class="download-cover-image" src="${esc(p.cover)}" alt="${esc(p.title)}课件画面" fetchpriority="high" width="1280" height="720"><div class="lq-preview" data-lq-preview-host hidden></div></figure><aside class="download-panel"><span class="download-chip">${editionLabel(p)} · HTML 课件</span>${actions}</aside></div><section class="download-content" id="course-content"><h2>教学内容</h2><div class="course-modules">${modules}</div></section></article>`;
  }

  /*
   * 把文件交到老师手上。
   *
   * 下载直接取库里那一份文件，所以没有额度、没有选卡、也没有确认
   * 弹窗：点「下载」，文件就准备好了。
   */
  async function download(id) {
    if (busy) return;
    const p = product(id);
    if (!p) return;
    busy = true;
    const buttons = [...document.querySelectorAll('[data-download-action="download"]')];
    buttons.forEach(b => {
      b.disabled = true;
      b.dataset.oldLabel = b.textContent;
      b.textContent = '正在准备下载…';
    });
    try {
      const file = await api('/api/downloads/prepare', { productId: id });
      if (!/^\/api\/downloads\/file\/[A-Za-z0-9_-]+$/.test(file.url))
        throw Error('下载地址异常，请刷新重试');
      const link = `<a class="button wide" href="${esc(file.url)}" download="${esc(file.filename)}" data-download-save="${esc(id)}" data-download-expires="${Number(file.expiresAt)}">↓ 保存课件文件</a>`;
      modal(`<div class="dialog-content download-ready"><span class="download-chip">文件已准备</span><h2>${esc(p.title)}</h2><p>点击下方按钮，将课件保存到本机。</p>${link}<p class="subtle" id="download-save-status" role="status">下载链接 5 分钟内有效。</p></div>`);
    } catch (e) {
      toast(e.message);
    } finally {
      busy = false;
      buttons.forEach(b => {
        if (b.isConnected) {
          b.disabled = false;
          b.textContent = b.dataset.oldLabel;
        }
      });
    }
  }

  /*
   * 目录上那两个动作——预览与下载——在这里接住。
   * 剩下的动作一个也不接：本地版没有可买的东西。
   */
  document.addEventListener('click', async e => {
    const save = e.target.closest('[data-download-save]');
    if (save) {
      const expires = Number(save.dataset.downloadExpires);
      if (!Number.isFinite(expires) || Date.now() >= expires) {
        e.preventDefault();
        toast('链接已过期，请点击“重新准备下载”');
        return;
      }
      const status = document.querySelector('#download-save-status');
      if (status) {
        status.textContent =
          '已向浏览器请求保存，请检查下载列表。若未开始，可在链接有效期内再次点击重试。';
      }
      return;
    }
    const b = e.target.closest('[data-download-action]');
    if (!b) return;
    e.preventDefault();
    try {
      const { downloadAction: action, id } = b.dataset;
      if (action === 'download') await download(id);
    } catch (e) {
      toast(e.message);
    }
  });

  document.querySelector('#dialog').addEventListener('close', () =>
    document.querySelector('#dialog').classList.remove('download-dialog')
  );

  return { card, detail, editionTabs };
}
