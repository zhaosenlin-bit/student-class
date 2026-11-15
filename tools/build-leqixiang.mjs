#!/usr/bin/env node
/*
 * Build the 乐启享 courseware library: one site, both courseware sources.
 *
 *   mirror/leqixiang/site/        the 小白教育 shell, rebranded
 *   mirror/leqixiang/courseware/  every playable body (小白教育 + 图灵智赋)
 *   mirror/leqixiang/catalog.json the merged catalogue
 *   mirror/leqixiang/brand/       the logo and favicon taken from codebn.cn
 *
 * The original mirrors stay untouched — this script only reads them.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const XB = path.join(ROOT, 'mirror', 'xbjiaoyu');
const AFE = path.join(ROOT, 'mirror', 'aifunengjiaoyu');
const LQ = path.join(ROOT, 'mirror', 'leqixiang');
const SITE = path.join(LQ, 'site');
const CW = path.join(LQ, 'courseware');

const BRAND = {
  name: '乐启享机器人',
  short: '乐启享',
  slogan: '从乐高启蒙 到 AI 创造',
  intro:
    '乐启享机器人专注 3-16 岁少儿科技素养教育，以工程实践与项目制学习，' +
    '让孩子在搭建、调试、协作、展示中真正学会创造。',
  icp: '鄂ICP备2025149404号-1',
  phone: '18164173640 / 17371701272',
  address: '宜昌市猇亭区金岭路59-1号',
  stats: [
    ['1200+', '在读学员'],
    ['7 年', '本地深耕'],
    ['100+', '赛事奖项'],
    ['3-16', '全龄段'],
  ],
  courses: [
    ['乐高启蒙', '3-6 岁 · 积木搭建与空间想象'],
    ['机器人工程', '7-10 岁 · 结构 · 动力 · 编程'],
    ['Python 编程', '10-14 岁 · 算法 · 项目开发'],
    ['研学课程', '武汉 + 深珠港 · 双城科创人文'],
    ['创赛与特色课', '8 岁+ · 图形化 · Python · 航模'],
  ],
  team: [
    ['刘海涵', '创始人 · 校长', '7 年校区经营与课程管理经验，负责乐启享整体发展与教学品质。'],
    ['森林老师', '副校长 · 合伙人', '资深编程教研，负责课程研发、教师培养与项目式课堂设计。'],
    ['向敏', '资深乐高 + 编程双导师', '5 年一线教学经验，覆盖乐高搭建、机械结构与编程启蒙。'],
    ['周玉锋', '资深图形化 + 硬件导师', '5 年教学经验，专注图形化编程、硬件控制与机器人项目。'],
    ['杨陶', '教学主管', '6 年教学与教研经验，负责课程实施、课堂质量与教师协作。'],
    ['赵玉', '教务 · 财务', '6 年教务运营经验，负责学员服务、排课与校区日常管理。'],
  ],
};

/* 旧站名。目录里的作者字段偶尔会写成本站的品牌名，那一处换成乐启享。 */
const OLD_BRAND = '图灵智赋';

const rm = (dir) => {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
};
const copyDir = (from, to, filter = () => true) => {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(src, dst, filter);
    else if (filter(src)) fs.copyFileSync(src, dst);
  }
};
const read = (p) => fs.readFileSync(p, 'utf8');
const write = (p, s) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, s);
};

/* ------------------------------------------------------------------ brand */

rm(SITE);
copyDir(path.join(XB, 'assets'), SITE, (f) => /\.(html|js|css)$/i.test(f) && !f.includes(`${path.sep}images${path.sep}`));
/* The cover images stay in the original mirror; the server serves them from
 there, so the shell copy only holds text. */
fs.rmSync(path.join(SITE, 'images'), { recursive: true, force: true });
/* A cover the platform has deleted (four of them) would show as a broken
 image. A drawn placeholder takes its place. */
fs.copyFileSync(
  path.join(ROOT, 'tools', 'course-cover-fallback.svg'),
  path.join(XB, 'assets', 'images', 'course-cover-fallback.svg')
);

/* Every textual swap that turns the shell into the 乐启享 site. */
const swaps = [
  ['<title>小白教育 · 互动课件</title>', `<title>${BRAND.name} · 互动课件库</title>`],
  ['小白教育', BRAND.short],
  ['小小小白', BRAND.name],
  ['沪ICP备2026054558号-1', BRAND.icp],
  ['正在加载小白教育…', '正在加载乐启享…'],
  ['课件下载 · 教师投稿', '互动课件库 · 在线使用 · 课件下载'],
  ['<meta name="description" content="乐启享互动课件。按学段学科查找，课件下载与教师投稿。">',
    `<meta name="description" content="${BRAND.name}互动课件库：${BRAND.slogan}。物理 · 化学 · 数学 · 地理互动课件，在线直接使用或下载。">`],
  ['/images/brand-logo.svg?v=8', '/brand/brand-logo.png'],
  ['alt="乐启享Logo"', 'alt="乐启享 Logo"'],
  ['alt="小小小白头像"', 'alt="乐启享 Logo"'],
  ['属于互动课件的时代', BRAND.slogan],
];

for (const file of fs.readdirSync(SITE)) {
  const p = path.join(SITE, file);
  if (!fs.statSync(p).isFile()) continue;
  let text = read(p);
  for (const [from, to] of swaps) text = text.split(from).join(to);
  write(p, text);
}

/* index.html: drop the commerce chrome, keep the library. */
{
  const p = path.join(SITE, 'index.html');
  let html = read(p);
  html = html
    .replace('<link rel="icon" href="/brand/brand-logo.png?v=8" type="image/svg+xml">',
      '<link rel="icon" href="/brand/favicon.ico" type="image/x-icon">')
    .replace(/<div class="download-quicknav">[\s\S]*?<\/div>\s*/, '')
    .replace(/<a class="nav-link" href="#teachers">教师课件<\/a>/, '')
    .replace(/<a class="nav-link" href="#refunds">退款与售后<\/a>/, '')
    .replace(/<a class="nav-link mobile-publish" href="#creator">发布课件<\/a>/, '')
    .replace('<a href="#teachers" class="nav-link">教师课件</a>', '')
    .replace('<a href="#refunds" class="nav-link">退款与售后</a>', '')
    .replace('<a href="#creator" class="nav-link mobile-publish">发布课件</a>', '')
    .replace('<a href="#catalog" class="nav-link">课件库</a>',
      '<a href="#catalog" class="nav-link">课件库</a><button class="nav-link" type="button" data-action="about">关于我们</button>')
    .replace(/<a class="publish-link" href="#creator">发布课件 <span aria-hidden="true">↗<\/span><\/a>/, '')
    .replace('<button id="account" class="account-button" data-action="account">登录 ↗</button>',
      '<button id="account" class="account-button" data-action="account" hidden>乐启享</button>')
    .replace('<a href="#creator">发布课件 ↗</a>',
      `<a href="https://codebn.cn/" target="_blank" rel="noreferrer">${BRAND.name}官网 ↗</a>`)
    .replace(/<button type="button" data-announcement-open>更新公告<\/button>/, '')
    .replace(/<button data-action="terms">购买说明<\/button>/, '')
    .replace(/<button data-action="privacy">隐私说明<\/button>/, '')
    .replace(/<a href="#refunds">退款与售后<\/a>/, '')
    .replace('<span>© 乐启享</span>', `<span>© 2025-2026 ${BRAND.name} · 所有权利保留</span>`)
    .replace(/<a class="brand footer-brand"[^>]*><img class="site-logo" src="\/brand\/brand-logo.png\?v=8" alt="" width="36" height="36"><span>乐启享<\/span><\/a>/,
      `<a class="brand footer-brand" href="#works"><img class="site-logo" src="/brand/brand-logo.png" alt="" width="36" height="36"><span>${BRAND.short}</span></a>`)
    .replace('<p>互动课件库 · 在线使用 · 课件下载</p>',
      `<p>${BRAND.slogan}</p>`);
  /* The local build keeps one line only: browse → use → download. */
  html = html.replace('<script type="module" src="/app.js',
    '<script src="/lq-mode.js"></script><script type="module" src="/app.js');
  /* The preview on a course page is loaded only when the reader asks for
     it, so the script itself stays out of the way until then. */
  html = html.replace('</body>',
    '<script src="/lq-preview.js?v=1"></script></body>');
  if (!html.includes('/lq-preview.js')) throw new Error('index.html patch missed: lq-preview.js');
  /* The folded groups on a phone. */
  html = html.replace('</body>',
    '<script src="/lq-folds.js?v=1"></script></body>');
  if (!html.includes('/lq-folds.js')) throw new Error('index.html patch missed: lq-folds.js');
  write(p, html);
}

/* lq-mode.js: the local-only route guard, copied in with the shell. */
fs.copyFileSync(path.join(ROOT, 'tools', 'lq-mode.js'), path.join(SITE, 'lq-mode.js'));
/* lq-preview.js: the interactive preview on a course page. */
fs.copyFileSync(path.join(ROOT, 'tools', 'lq-preview.js'), path.join(SITE, 'lq-preview.js'));
/* lq-folds.js: the groups that fold away on a phone. */
fs.copyFileSync(path.join(ROOT, 'tools', 'lq-folds.js'), path.join(SITE, 'lq-folds.js'));

/* A whole function is easier to replace than a fragment of a long line. */
const swapFunction = (source, head, replacement) => {
  const start = source.indexOf(head);
  if (start < 0) return source;
  /* The closing brace sits on a line of its own. The shell files mix
     CRLF and LF endings, so the pattern accepts either. */
  const tail = /\r?\n\}\r?\n/g;
  tail.lastIndex = start;
  const hit = tail.exec(source);
  if (!hit) return source;
  return source.slice(0, start) + replacement + source.slice(hit.index + hit[0].length);
};
/* The same, for a function that sits on a single long line. */
const swapLine = (source, head, replacement) => {
  const start = source.indexOf(head);
  if (start < 0) return source;
  let end = source.indexOf('\n', start);
  if (end < 0) return source;
  if (end > 0 && source[end - 1] === '\r') end -= 1;
  return source.slice(0, start) + replacement + source.slice(end);
};

/* app.js: the about dialog and the courseware badge. */
{
  const p = path.join(SITE, 'app.js');
  let js = read(p);
  const about = `function about(){modal('<div class="dialog-content">`
    + `<div class="profile"><img src="/brand/brand-logo.png" alt="${BRAND.name} Logo" width="56" height="56">`
    + `<div><p class="eyebrow">关于课件</p><h2>${BRAND.name}</h2></div></div>`
    + `<p>${BRAND.intro}</p>`
    + `<p class="subtle">${BRAND.slogan} · ${BRAND.phone} · ${BRAND.address}</p>`
    + `<p class="subtle">统一社会信用代码 / 备案号：${BRAND.icp}</p>`
    + `</div>');}`;
  js = js.replace(/function about\(\)\{modal\([\s\S]*?\);?\}/, about);
  js = js.replace(
    "const state=p.mode==='free'?'免费下载'",
    "const state=p.localInstalled?'本地可用':p.localReason||'本地未收录'"
  );
  /* The footer of the trimmed shell no longer carries every node the
     original footer had. Writing to a missing node would abort the whole
     start-up sequence, so the lookup is guarded. */
  js = js.replace(
    "function legalFooter(){for(const [id,key]of [['business','seller'],['icp','icp'],['home-icp','icp'],['security-filing','securityNumber']]){$('#'+id).hidden=!info[key];if(id!=='business')$('#'+id).textContent=info[key]||'';}}",
    "function legalFooter(){for(const [id,key]of [['business','seller'],['icp','icp'],['home-icp','icp'],['security-filing','securityNumber']]){const el=$('#'+id);if(!el)continue;el.hidden=!info[key];if(id!=='business')el.textContent=info[key]||'';}}"
  );
  /* The 图灵智赋 works keep their progress in the page that hosts them. */
  js = js.replace(
    "import {attachCoursewareDelivery,detachCoursewareDelivery} from './courseware-load.js?v=apple-startup-20261026.1';",
    "import {attachCoursewareDelivery,detachCoursewareDelivery} from './courseware-load.js?v=apple-startup-20261026.1';\n" +
      "import {mountSaveHost} from './lq-save-host.js?v=lq-20261113';"
  );
  js = js.replace(
    "attachCoursewareDelivery({frame,courseId:id,seriesId:p.splitFrom||id,launch,stillActive:()=>currentLesson===id&&serial===routeSerial&&!leaseExpired,",
    "const plain=/^afe-/.test(id);attachCoursewareDelivery({frame,courseId:id,seriesId:p.splitFrom||id,launch,plain,stillActive:()=>currentLesson===id&&serial===routeSerial&&!leaseExpired,"
  );
  js = js.replace(
    /(\$\('#lesson-frame'\)\.append\(frame\);\s*)let dismissed=false;/,
    "$1if(plain)mountSaveHost(frame,id);\n  let dismissed=false;"
  );
  /*
   * The line under the version strip explains how to buy an integrated
   * version with a card or a quota. A local library has neither, so the
   * line is dropped.
   */
  js = js.replace(
    /\$\{editionFilter\.endsWith\('integrated'\)\?'<p class="download-edition-notice">[^']*<\/p>':''\}/,
    ''
  );

  /* ------------------------------------------------------- local shell --- */

  /*
   * The commercial routes are gone. A local library has nothing to sell,
   * nothing to refund, no account to log into and no moderation queue, so
   * those addresses now lead back to the course they belong to, or to
   * the catalogue.
   */
  js = js.replace(
    "async function route(){const serial=++routeSerial;let [page,id]=(location.hash.slice(1)||'works').split('/');",
    "async function route(){const serial=++routeSerial;let [page,id]=(location.hash.slice(1)||'works').split('/');"
      + "if(page==='purchase'&&id){history.replaceState(null,'','#course/'+id);page='course';}"
      + "else if(['unlocked','purchases','admin','moderation','creator','owner-login','refunds','refund-admin',"
      + "'feedback-admin','account-safety','bulk-download-admin','teachers'].includes(page)){"
      + "history.replaceState(null,'','#catalog');page='catalog';id='';}"
  );

  /* The account button is hidden in the local build, so the account dialog
     has nothing to show. It opens the about panel instead of a login form. */
  js = swapLine(js, 'async function account(){', 'async function account(){about();}');
  js = js.replace(
    "function accountLabel(){$('#account').textContent=user?accountDisplay():'登录';}",
    "function accountLabel(){const el=$('#account');if(el)el.textContent='乐启享';}"
  );

  /* The feedback form is gone: the section it wrote into is gone, and the
     entry points that opened it are gone with it. */
  js = js.replace(
    '<button data-action="intro-section" data-value="course-feedback">使用反馈</button>',
    ''
  );
  js = js.replace(
    '<section id="course-feedback" class="course-section" aria-live="polite"></section>',
    ''
  );
  js = js.replace(/store\.mountFeedback\(id\);/g, '');
  js = js.replace('aria-label="查看${esc(p.title)}的介绍与反馈"', 'aria-label="查看${esc(p.title)}的介绍"');
  js = js.replace('>介绍与反馈</button>', '>介绍</button>');
  js = js.replace(
    '如有问题或改进建议，可在课件介绍页点击“改进建议与反馈”，登录有使用权限的账号后提交。',
    '课件默认高清，卡顿时可在课件设置中调整画质。'
  );

  /*
   * The catalogue holds everything the two platforms publish, but only the
   * bodies that were pulled down can actually be opened here. A fourth
   * filter lets a teacher separate the two without reading every card.
   */
  js = js.replace(
    ".filter(p=>priceFilter==='全部'||p.mode===(priceFilter==='免费'?'free':'paid'))",
    ".filter(p=>priceFilter==='本地'?!!p.localInstalled:priceFilter==='待补齐'?!p.localInstalled:priceFilter==='全部'||p.mode===(priceFilter==='免费'?'free':'paid'))"
  );
  js = js.replace(
    "const shown=browseCatalog(info.downloadMode&&originFilter!=='教师课件'?catalog.filter(p=>matchesDownloadEdition(p,editionFilter)):catalog,{origin:originFilter,stage,subject:filter,price:priceFilter,",
    "const shown=browseCatalog((info.downloadMode&&originFilter!=='教师课件'?catalog.filter(p=>matchesDownloadEdition(p,editionFilter)):catalog).filter(p=>priceFilter==='本地'?p.localInstalled:priceFilter==='待补齐'?!p.localInstalled:true),{origin:originFilter,stage,subject:filter,price:['本地','待补齐'].includes(priceFilter)?'全部':priceFilter,"
  );

  /*
   * The subject filter ran to sixty chips and pushed the catalogue off the
   * screen. The busiest subjects stay on the surface; the rest move behind
   * a disclosure the reader opens on demand, and the choice survives the
   * re-render that follows every filter change.
   */
  js = js.replace(
    "priceFilter='全部',authorFilter='';",
    "priceFilter='全部',authorFilter='',subjectsOpen=false;"
  );
  js = swapFunction(
    js,
    'function downloadGalleryFilters(){',
    read(path.join(ROOT, 'tools', 'lq-gallery-filters.js')).trimEnd()
  );
  js +=
    '\n/* The disclosures keep their state across the re-render. */\n' +
    "document.addEventListener('toggle',e=>{const el=e.target;if(!el||!el.classList)return;" +
    "if(el.classList.contains('download-subject-more'))subjectsOpen=el.open;},true);\n";
  /* A patch that quietly misses its target is worse than no patch at all. */
  for (const marker of [
    'download-subject-more',
    'subjectsOpen=false',
    'download-gallery-filters',
    'download-gallery-filters-toggle',
    'data-lq-fold-toggle',
    "priceFilter==='本地'?!!p.localInstalled",
    "priceFilter==='待补齐'?!p.localInstalled:true",
    "priceFilter==='待补齐'?!p.localInstalled:true",
    "function accountLabel(){const el",
    'async function account(){about();}',
    "if(page==='purchase'&&id)",
    "history.replaceState(null,'','#catalog');page='catalog';id='';",
  ]) {
    if (!js.includes(marker)) throw new Error('app.js patch missed: ' + marker);
  }
  if (js.includes('mountFeedback')) throw new Error('app.js patch missed: mountFeedback');
  if (js.includes('download-edition-notice')) {
    throw new Error('app.js patch missed: the version notice is still there');
  }
  write(p, js);
}

/* download-store.js: the download panel of one course. */
{
  const p = path.join(SITE, 'download-store.js');
  let js = read(p);
  /* The feedback link under the download button has no place in a local
     library, and the panel it scrolled to is gone. */
  js = js.replace(
    /^\s*main\(\)\.querySelector\('[^\n]*course-feedback[^\n]*\);\s*$/gm,
    ''
  );
  /* Nothing is bought here, so nothing waits for an account. */
  js = js.replace(/'登录后即可免费下载，不消耗下载卡额度。'/g, "'本地课件可直接下载，不消耗任何额度。'");
  js = js.replace(
    "if(!getUser()){toast('请先登录，下载文件将关联您的账号');login();return;}",
    ''
  );
  /* The download dialog still talked about quotas. A local file is free. */
  js = js.replace(
    '下载链接 5 分钟内有效。首次请求文件时按资源类型扣除相应额度，重复下载不扣额度。',
    '下载链接 5 分钟内有效。'
  );
  /*
   * A local file needs neither a second route nor a second try. The dialog
   * is left with the title, the file and the one button that saves it.
   */
  js = js.replace(
    '<p class="subtle"><a class="text-button" href="${esc(file.url+\'?direct=1\')}" download="${esc(file.filename)}" data-download-save="${esc(id)}" data-download-expires="${Number(file.expiresAt)}">下载未开始？使用备用线路</a></p>',
    ''
  );
  js = js.replace(
    '<button class="text-button" data-download-action="download" data-id="${esc(id)}">重新准备下载</button>',
    ''
  );
  /* The offline-copy note is worth keeping, but it is a footnote. */
  js = js.replace(
    'const warning=()=>`<p class="download-warning">${esc(getInfo().downloadWarning)}</p>`;',
    'const warning=()=>`<p class="subtle">${esc(getInfo().downloadWarning)}</p>`;'
  );
  /* A body that is not on disk is a gap in the local copy, not a decision
     the site made. */
  js = js.replace(
    "if(unavailable(fresh)){toast('这份资源暂未开放下载');return;}",
    "if(unavailable(fresh)){toast('本地库还没有这份课件的正文，暂时不能下载');return;}"
  );
  /* The card in the catalogue carries the same wording. */
  js = js.replace(
    "const state=p.mode==='free'?'免费下载':integrated(p)?unavailable(p)?'暂未开放':p.downloadReason==='count'?trial(p)?'尝鲜卡可选':'次卡可选':p.canDownload?'已解锁':'选择下载卡':p.mode==='free'?'免费下载':p.downloadReason==='count'?'可选资源':p.canDownload?'已解锁':'下载资源';",
    "const state=p.localInstalled?'本地可用':'待补齐';"
  );
  /*
   * The card's own button used to be one link to the course page. A
   * course whose body is on disk can be opened straight from the grid,
   * so the grid says so; a course that is not on disk offers what is
   * there — the cover and the lesson plan — instead of a promise.
   */
  js = js.replace(
    "${p.onlineAccessible?`<button class=\"button wide\" data-action=\"trial\" data-id=\"${esc(p.id)}\">免费在线使用 ↗</button>`:''}<a class=\"button secondary wide\" href=\"#course/${esc(p.id)}\">查看资源 →</a>",
    "${p.localInstalled?`<div class=\"download-card-actions\"><button class=\"button wide\" data-lq-preview-start=\"${esc(p.id)}\">▶ 在线预览</button><a class=\"button secondary wide\" href=\"#course/${esc(p.id)}\">课件详情 →</a></div>`:`<a class=\"button wide\" href=\"#course/${esc(p.id)}\">查看资料 →</a>`}"
  );
  /*
   * The version strip is five buttons with a count each. On a phone it
   * takes three lines, so it folds the same way the filter row does and
   * the stylesheet decides which of the two the reader gets.
   */
  js = swapLine(
    js,
    "const editionTabs=(products,selected='all',action='download-edition')=>",
    read(path.join(ROOT, 'tools', 'lq-edition-tabs.js')).trimEnd()
  );
  /*
   * The detail panel is rewritten as a whole. The published panel is built
   * around buying: a card, a quota, an account. A local library has two
   * kinds of course instead — one whose body is on disk, one whose body is
   * still on the platform — and the panel says which one it is and offers
   * the action that works. Everything else sits behind a disclosure.
   */
  /*
   * The closing brace of this one function is the only brace on a line of
   * its own between the head and the end, so it can be found without
   * counting braces through template literals.
   */
  const detailStart = js.indexOf('function detail(p){');
  const detailEnd = js.indexOf('\n }\n', detailStart);
  if (detailStart < 0 || detailEnd < 0) {
    throw new Error('download-store.js patch missed: the detail panel was not found');
  }
  js =
    js.slice(0, detailStart) +
    read(path.join(ROOT, 'tools', 'lq-detail-panel.js')).trimEnd() +
    js.slice(detailEnd + 3);
  for (const marker of [
    "const state=p.localInstalled?'本地可用':'待补齐';",
    '下载链接 5 分钟内有效。',
    '本地库还没有这份课件的正文',
    'data-lq-preview-host',
    'data-lq-preview=',
    'data-lq-preview-start',
    'download-pending-badge',
    'download-notes-body',
    'download-edition-fold',
    'download-lede',
  ]) {
    if (!js.includes(marker)) throw new Error('download-store.js patch missed: ' + marker);
  }
  if (js.includes('course-feedback')) throw new Error('download-store.js patch missed: course-feedback');
  if (js.includes("const status=unavailable(p)?'这份资源暂未开放下载。'")) {
    throw new Error('download-store.js patch missed: the old detail panel is still there');
  }
  write(p, js);
}

/* download-store.css: the subject disclosure under the catalogue filters. */
{
  /*
   * The overrides go into a stylesheet of their own, linked last. The
   * original shell has several sheets that restyle the same controls, and
   * the one that loads last wins — so a sheet that is not last simply
   * does not apply.
   */
  const p = path.join(SITE, 'lq-ui.css');
  write(p, read(path.join(ROOT, 'tools', 'lq-filters.css')));
  const index = path.join(SITE, 'index.html');
  let html = read(index);
  html = html.replace(
    '</head>',
    '<link rel="stylesheet" href="/lq-ui.css?v=1"></head>'
  );
  if (!html.includes('/lq-ui.css')) throw new Error('index.html patch missed: lq-ui.css');
  write(index, html);
}

/* update-announcement.js: the announcement on the live site talks about
   invoices and refunds, which the local library has neither of. */
{
  const p = path.join(SITE, 'update-announcement.js');
  let js = read(p);
  js = js.replace(
    "load = () => fetch('/update-announcement.json', {cache:'no-store'}).then(r => r.ok ? r.json() : null)",
    'load = () => Promise.resolve(null)'
  );
  if (js.includes("fetch('/update-announcement.json'")) {
    throw new Error('update-announcement.js patch missed');
  }
  write(p, js);
}

/* courseware-load.js: the 图灵智赋 works are plain documents. They do not
   speak the 小白教育 start-up protocol, so the frame load event is the
   signal that the lesson is on screen. */
{
  write(
    path.join(SITE, 'courseware-load.js'),
    String.raw`// A frame load event confirms delivery, not a rendered lesson. Keep the outer
// loading/error surface available even when the child cannot execute scripts.
let active=null;
const isActive=ctx=>active===ctx&&ctx.frame.isConnected&&ctx.stillActive();
const clean=value=>String(value??'').replace(/(?:https?:\/\/|file:\/\/)[^\s)]+/g,url=>url.split(/[?#]/)[0]).slice(0,2400);
function stopTimer(ctx){clearTimeout(ctx.timer);ctx.timer=null;}
function fail(ctx,detail={}){
 if(!isActive(ctx))return;
 stopTimer(ctx);ctx.failed=true;
 ctx.onError({code:detail.code||'XB-L002',message:clean(detail.message||'未收到课件画面完成的信息。'),phase:ctx.phase,courseId:ctx.courseId,retried:ctx.fallbackUsed,delivery:ctx.accelerated?'accelerated':'direct',browser:navigator.userAgent,diagnostics:detail.diagnostics||null});
}
function watch(ctx){
 stopTimer(ctx);ctx.timer=setTimeout(()=>{
  if(!isActive(ctx)||ctx.ready||ctx.failed)return;
  if(!ctx.scriptStarted&&!ctx.fallbackUsed)retry(ctx);
  else fail(ctx,{message:'课件未能完成启动。'});
 },30000);
}
async function retry(ctx){
 if(!isActive(ctx)||ctx.fallbackUsed||ctx.retrying||ctx.ready||ctx.failed)return;
 ctx.fallbackUsed=true;ctx.retrying=true;stopTimer(ctx);ctx.phase='reconnecting';ctx.onStage?.('reconnecting');
 // Bound authorization too. Late responses cannot navigate a different lesson.
 ctx.timer=setTimeout(()=>fail(ctx,{code:'XB-N001',message:'课件连接未能完成。'}),15000);
 try{
  const launch=await ctx.requestLaunch();
  if(!isActive(ctx)||ctx.failed)return;
  stopTimer(ctx);ctx.onLaunch(launch);ctx.retrying=false;ctx.scriptStarted=false;ctx.phase='requesting';ctx.accelerated=false;
  ctx.frame.src=launch.url;watch(ctx);
 }catch(error){fail(ctx,{code:'XB-N001',message:error?.message||'课件连接未能完成。'});}
}
window.addEventListener('message',event=>{
 const ctx=active,data=event.data;
 if(!ctx||!isActive(ctx)||event.source!==ctx.frame.contentWindow||!data||data.version!==1||ctx.retrying)return;
 if(data.type==='xiaobai:cdn-fallback'&&data.courseId===ctx.courseId){retry(ctx);return;}
 if(data.type!=='xiaobai:courseware-startup'||![ctx.courseId,ctx.seriesId].includes(data.courseId))return;
 if(data.phase==='error'){fail(ctx,data.detail||{});return;}
 if(ctx.failed||ctx.ready)return;
 if(data.phase==='ready'){
  ctx.ready=true;ctx.phase='ready';stopTimer(ctx);ctx.onReady();return;
 }
 if(['script-started','document-loaded','graphics-created'].includes(data.phase)){
  ctx.scriptStarted=true;ctx.phase=data.phase;ctx.onStage?.(data.phase);
 }
});
export function detachCoursewareDelivery(){if(active)stopTimer(active);active=null;}
export function attachCoursewareDelivery(options){
 detachCoursewareDelivery();
 // Apple uses the same authorized HTML directly, avoiding the extra in-frame
 // decrypt/decompress/document.write path. Renderer and assets remain identical.
 const apple=/Mac|iPhone|iPad|iPod/.test((navigator.platform||'')+' '+navigator.userAgent);
 const supported=!!(window.crypto?.subtle&&window.DecompressionStream&&window.fetch&&window.TextDecoder);
 const ctx=active={...options,fallbackUsed:false,retrying:false,ready:false,failed:false,scriptStarted:false,phase:'requesting',accelerated:!apple&&supported,plain:options.plain===true,timer:null};
 if(ctx.plain){
  // A plain document has no start-up handshake: the frame load event is the
  // only signal there is. It still gets a watchdog, so a broken document
  // reports an error instead of loading forever.
  ctx.phase='loading';
  ctx.timer=setTimeout(()=>{if(isActive(ctx)&&!ctx.ready&&!ctx.failed)fail(ctx,{message:'课件加载超时，请检查资源是否完整。'});},45000);
  ctx.frame.addEventListener('load',()=>{
   if(!isActive(ctx)||ctx.ready||ctx.failed)return;
   ctx.ready=true;ctx.phase='ready';stopTimer(ctx);ctx.onReady();
  });
  ctx.frame.src=options.launch.url;
  return;
 }
 ctx.frame.addEventListener('load',()=>{if(isActive(ctx)&&!ctx.ready&&!ctx.failed&&!ctx.scriptStarted){ctx.phase='frame-loaded';ctx.onStage?.('frame-loaded');}});
 ctx.frame.src=options.launch.url+(ctx.accelerated?'&accelerated=1':'');watch(ctx);
}
`
  );
}

/* lq-save-host.js: the host side of the two storage protocols the 图灵智赋
   works use. The 长征 courseware keeps a lesson checkpoint in the page that
   hosts it, and the 高考题库 courseware keeps five question banks. Both wait
   for a ":connect" answer that carries a MessagePort. */
{
  write(
    path.join(SITE, 'lq-save-host.js'),
    String.raw`/*
 * Host side of the storage protocols the 乐启享 courseware uses.
 *
 * Two of the mirrored works keep their state in the page that hosts them:
 * 长征 stores one checkpoint per chapter, 高考题库 stores five question
 * banks. Both announce themselves with a "<protocol>:ready" message and
 * wait for a "<protocol>:connect" answer that carries a MessagePort.
 *
 * The published site hands this job to a hosted module; the local copy
 * keeps the same contract and stores everything in localStorage.
 */
const LONG_MARCH = 'turing-long-march-save-v1';
const PK180 = 'turing-pk180-banks-v1';
const BANK_KEY = 'leqixiang.pk180.banks';
const SAVE_KEY = 'leqixiang.turing.save';

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* A full or blocked storage must not break the lesson. */
  }
}

/* ------------------------------------------------- 长征 lesson state --- */

function longMarchValues(allowed) {
  const stored = readJson(SAVE_KEY, {});
  const values = {};
  for (const [key, value] of Object.entries(stored)) {
    if (!allowed || allowed.includes(key)) {
      if (typeof value === 'string') values[key] = value;
    }
  }
  return values;
}

function applySavePatch(values, patch, allowed) {
  if (!patch || !allowed.includes(patch.key) || !['set', 'remove'].includes(patch.op)) {
    throw Error('INVALID_SAVE');
  }
  if (patch.op === 'set' && (typeof patch.value !== 'string' || patch.value.length > 4096)) {
    throw Error('INVALID_SAVE');
  }
  const next = { ...values };
  if (patch.op === 'remove') delete next[patch.key];
  else next[patch.key] = patch.value;
  return next;
}

/* --------------------------------------------------- 高考题库 state --- */

const MAX_BYTES = 8 * 1024 * 1024;
const fail = (code) => {
  throw Error(code);
};
const text = (value, max) => (typeof value === 'string' && value.length <= max ? value : fail('INVALID_BANK'));
const record = (v) => v && typeof v === 'object' && !Array.isArray(v);

function cleanBank(value) {
  if (!record(value) || !Array.isArray(value.questions) || !value.questions.length || value.questions.length > 500) {
    fail('INVALID_BANK');
  }
  const name = text(value.name, 80).trim();
  if (!name) fail('INVALID_BANK');
  const questions = value.questions.map((q) => {
    if (!record(q) || !['mc', 'fitb'].includes(q.type) || !Array.isArray(q.options) || q.options.length > 8) {
      fail('INVALID_BANK');
    }
    const result = { type: q.type, q: text(q.q, 4000), options: q.options.map((v) => text(v, 2000)) };
    if (q.type === 'mc') {
      if (q.options.length < 2 || !Number.isInteger(q.ans) || q.ans < 0 || q.ans >= q.options.length) {
        fail('INVALID_BANK');
      }
      result.ans = q.ans;
    } else result.ansText = text(q.ansText, 4000);
    return result;
  });
  const images = {};
  if (value.images !== undefined) {
    if (!record(value.images) || Object.keys(value.images).length > questions.length) fail('INVALID_BANK');
    for (const [key, image] of Object.entries(value.images)) {
      if (!/^(0|[1-9]\d{0,2})$/.test(key) || Number(key) >= questions.length ||
          typeof image !== 'string' || image.length > 2 * 1024 * 1024 ||
          !/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/.test(image)) fail('INVALID_BANK');
      images[key] = image;
    }
  }
  const bank = { name, questions, images };
  if (JSON.stringify(bank).length > MAX_BYTES) fail('BANK_TOO_LARGE');
  return bank;
}

const emptyBankState = () => ({ version: 1, revision: 0, slots: Array(5).fill(null), trash: [] });

function cleanBankState(value) {
  if (!record(value) || value.version !== 1 || !Number.isSafeInteger(value.revision) || value.revision < 0 ||
      !Array.isArray(value.slots) || value.slots.length !== 5 || !Array.isArray(value.trash) || value.trash.length > 5) {
    fail('STORAGE_CORRUPT');
  }
  const result = {
    version: 1,
    revision: value.revision,
    slots: value.slots.map((v) => (v === null ? null : cleanBank(v))),
    trash: value.trash.map(cleanBank),
  };
  if (new TextEncoder().encode(JSON.stringify(result)).length > MAX_BYTES) fail('BANK_TOO_LARGE');
  return result;
}

function bankTransition(current, request) {
  const state = cleanBankState(current);
  if (!record(request) || request.revision !== state.revision) fail('CONFLICT');
  const index = request.slot;
  const slot = () => {
    if (!Number.isInteger(index) || index < 0 || index >= 5) fail('INVALID_BANK');
    return index;
  };
  switch (request.op) {
    case 'save':
      if (state.slots[slot()] !== null) fail('SLOT_OCCUPIED');
      state.slots[index] = cleanBank(request.bank);
      break;
    case 'rename':
      if (!state.slots[slot()]) fail('EMPTY_SLOT');
      state.slots[index] = cleanBank({ ...state.slots[index], name: request.name });
      break;
    case 'delete':
      if (!state.slots[slot()]) fail('EMPTY_SLOT');
      if (state.trash.length >= 5) fail('TRASH_FULL');
      state.trash.push(state.slots[index]);
      state.slots[index] = null;
      break;
    case 'restore': {
      const free = state.slots.indexOf(null);
      if (free < 0) fail('SLOTS_FULL');
      if (!Number.isInteger(request.trashIndex) || !state.trash[request.trashIndex]) fail('INVALID_BANK');
      state.slots[free] = state.trash.splice(request.trashIndex, 1)[0];
      break;
    }
    case 'emptyTrash':
      state.trash = [];
      break;
    case 'import': {
      if (!Array.isArray(request.banks) || !request.banks.length || request.banks.length > 5) fail('INVALID_BANK');
      if (state.slots.filter((v) => v === null).length < request.banks.length) fail('SLOTS_FULL');
      for (const bank of request.banks) state.slots[state.slots.indexOf(null)] = cleanBank(bank);
      break;
    }
    default:
      fail('INVALID_OPERATION');
  }
  state.revision++;
  return cleanBankState(state);
}

/* --------------------------------------------------------------- host --- */

export function mountSaveHost(frame, id) {
  let stopped = false;
  const seen = new Set();

  const close = () => {
    stopped = true;
    window.removeEventListener('message', ready);
  };

  function handleLongMarch(event, data) {
    const channel = new MessageChannel();
    const allowed = Array.isArray(data.keys) ? data.keys : [];
    const values = longMarchValues(allowed);
    const port = channel.port1;
    port.onmessage = (message) => {
      const d = message.data;
      if (stopped) return;
      if (d && d.control === 'checkpoint') {
        port.postMessage({ control: 'checkpoint-result', id: d.id, ok: true });
        return;
      }
      if (!d || !Number.isSafeInteger(d.id)) return;
      try {
        const stored = readJson(SAVE_KEY, {});
        const next = applySavePatch(stored, d, allowed.length ? allowed : Object.keys(stored));
        writeJson(SAVE_KEY, next);
        port.postMessage({ id: d.id, ok: true });
      } catch (error) {
        port.postMessage({ id: d.id, ok: false, error: error.message === 'INVALID_SAVE' ? 'INVALID_SAVE' : 'SAVE_UNAVAILABLE' });
      }
    };
    event.source.postMessage(
      { type: LONG_MARCH + ':connect', nonce: data.nonce, values },
      '*',
      [channel.port2]
    );
  }

  function handlePk180(event, data) {
    const channel = new MessageChannel();
    const port = channel.port1;
    port.onmessage = (message) => {
      const d = message.data;
      if (stopped || !d || !Number.isSafeInteger(d.id)) return;
      if (d.op === 'reopen') {
        window.location.reload();
        return;
      }
      try {
        const current = readJson(BANK_KEY, null);
        const state = cleanBankState(current || emptyBankState());
        const next = d.op === 'read' ? state : bankTransition(state, d);
        if (d.op !== 'read') writeJson(BANK_KEY, next);
        port.postMessage({ id: d.id, ok: true, state: next });
      } catch (error) {
        port.postMessage({ id: d.id, ok: false, error: error.message || 'STORAGE_UNAVAILABLE' });
      }
    };
    event.source.postMessage({ type: PK180 + ':connect', nonce: data.nonce }, '*', [channel.port2]);
  }

  function ready(event) {
    if (stopped || event.source !== frame.contentWindow) return;
    const data = event.data;
    if (!data || typeof data.type !== 'string') return;
    if (data.type !== LONG_MARCH + ':ready' && data.type !== PK180 + ':ready') return;
    if (typeof data.nonce !== 'string' || !/^[a-f0-9]{32}$/.test(data.nonce)) return;
    if (seen.has(data.nonce)) return;
    seen.add(data.nonce);
    if (seen.size > 64) return;
    if (data.type === LONG_MARCH + ':ready') handleLongMarch(event, data);
    else handlePk180(event, data);
  }

  window.addEventListener('message', ready);
  return close;
}
`
  );
}

/* --------------------------------------------------------------- sources */

const xbCatalog = JSON.parse(read(path.join(XB, 'catalog.json')));
/* The works tab shows twelve; /api/programs knows four hundred and forty
   two. The full list is what the catalogue is built from. */
const afeFeatured = JSON.parse(read(path.join(AFE, 'api', 'program-file.json'))).programs || [];
const afeWorks = fs.existsSync(path.join(AFE, 'programs-all.json'))
  ? JSON.parse(read(path.join(AFE, 'programs-all.json')))
  : afeFeatured;
const afePremium = JSON.parse(read(path.join(AFE, 'premium', 'catalogue.json')));

/*
 * A cover is a picture the platform may have deleted since the catalogue
 * was written. The local copy knows which files actually arrived, so the
 * catalogue can point at the drawn placeholder instead of at a hole.
 */
const COVER_FALLBACK = '/images/course-cover-fallback.svg';
const coverOnDisk = (url) => {
  if (!url) return false;
  let clean = url.split('?')[0];
  /* The address carries the file name in percent-encoding; the disk holds
     the plain characters. */
  try {
    clean = decodeURIComponent(clean);
  } catch {
    /* A stray % in a name — take the address as it is. */
  }
  let file = null;
  if (clean.startsWith('/prod/uploads/')) {
    file = path.join(AFE, 'public', clean.slice(1));
  } else if (clean.startsWith('/premium-catalogue/covers/')) {
    file = path.join(AFE, 'assets', clean.slice(1));
  } else if (clean.startsWith('/images/')) {
    file = path.join(XB, 'assets', clean.slice(1));
  } else if (clean.startsWith('/brand/')) {
    file = path.join(LQ, clean.slice(1));
  }
  return !!(file && fs.existsSync(file) && fs.statSync(file).size > 0);
};
const cover = (url) => (coverOnDisk(url) ? url : COVER_FALLBACK);

/* ------------------------------------------------------------ courseware */

/* The courseware copy is the slow half of the build, so it can be skipped
   while the shell is being worked on. */
if (!process.env.LQ_SITE_ONLY) {
  rm(CW);
  fs.mkdirSync(CW, { recursive: true });

  /* 小白教育 bodies keep their original ids. */
  copyDir(path.join(XB, 'courseware'), CW, (f) => f.endsWith('.html'));

  /* 图灵智赋 bodies are re-numbered so both sources live in one namespace. */
  for (const w of afeWorks) {
    const src = path.join(AFE, 'courseware', `${w.id}.html`);
    if (!fs.existsSync(src)) continue;
    /* A few works only answer with a bootstrap that redirects to the platform.
       Those are not courseware — one of them is a 500 on the live site. */
    const text = read(src);
    const head = text.slice(0, 2000);
    if (text.length < 2000 && head.includes('window.location.replace("/api/program-file/')) continue;
    fs.copyFileSync(src, path.join(CW, `afe-${w.id}.html`));
    const assets = path.join(AFE, 'courseware', `${w.id}.assets`);
    if (fs.existsSync(assets)) {
      copyDir(assets, path.join(CW, `afe-${w.id}.assets`), () => true);
    }
  }

  /* 精品课 bodies arrive under their own programme number. Their ids sit in
     the 846–1346 band, which the 442 works never reach, so the same "afe-"
     prefix is enough to keep both families in one namespace. */
  for (const c of afePremium.courses || []) {
    if (!c.programId) continue;
    const src = path.join(AFE, 'courseware', `${c.programId}.html`);
    if (!fs.existsSync(src)) continue;
    fs.copyFileSync(src, path.join(CW, `afe-${c.programId}.html`));
    const assets = path.join(AFE, 'courseware', `${c.programId}.assets`);
    if (fs.existsSync(assets)) {
      copyDir(assets, path.join(CW, `afe-${c.programId}.assets`), () => true);
    }
  }
}

/* ------------------------------------------------------------- catalogue */

/* The courseware itself carries the old name in its header. */
for (const file of fs.readdirSync(CW)) {
  if (!file.endsWith('.html')) continue;
  const p = path.join(CW, file);
  let html = read(p);
  const before = html;
  html = html.split('小小小白').join(BRAND.short);
  html = html.split('小白教育').join(BRAND.short);
  if (html !== before) write(p, html);
}

const hasBody = (id) => fs.existsSync(path.join(CW, `${id}.html`));

const products = [];
for (const p of xbCatalog.products || []) {
  const installed = hasBody(p.id);
  products.push({
    ...p,
    cover: cover(p.cover),
    mode: 'free',
    publicationStatus: p.publicationStatus || 'published',
    owned: installed,
    accessible: installed,
    onlineAccessible: installed,
    available: installed,
    downloadable: installed,
    canDownload: installed,
    canPurchase: false,
    downloadReason: installed ? '' : 'local-missing',
    /* Why the local copy is missing — the real reason upstream, so the
       card can say what it would take instead of "not available". */
    localReason: installed ? '' : '线上需购买下载卡',
    localInstalled: installed,
    launchUrl: `/api/launch/${p.id}`,
    source: 'xbjiaoyu',
  });
}

for (const w of afeWorks) {
  const id = `afe-${w.id}`;
  const installed = hasBody(id);
  const desc = String(w.desc || '');
  const tagline = desc.split(/[。！？\n]/).filter(Boolean)[0] || '';
  const kind = w.type || '课件';
  products.push({
    id,
    originId: w.id,
    title: w.title,
    subject: [w.subject, w.grade_level].filter(Boolean).join(' · ') || '综合',
    subjectKey: w.subject || '综合',
    stages: [w.grade].filter(Boolean),
    stage: w.grade || '',
    stageSubjects: w.grade && w.subject ? { [w.grade]: w.subject } : {},
    tagline,
    dimension: '3d',
    edition: '独立版',
    description: desc,
    features: [w.subject, w.grade_level, kind].filter(Boolean),
    kind,
    device: '电脑 · 平板 · 手机',
    format: 'HTML · 离线课件',
    updatedAt: String(w.created_at || '').slice(0, 10) || '2026-11-01',
    cover: cover((w.cover_url || '').replace('https://static.aifunengjiaoyu.com/', '/')),
    modules: [],
    taxonomy: [],
    mode: 'free',
    publicationStatus: 'published',
    owned: installed,
    accessible: installed,
    onlineAccessible: installed,
    available: installed,
    downloadable: installed,
    canDownload: installed,
    canPurchase: false,
    downloadReason: installed ? '' : 'local-missing',
    localReason: installed ? '' : '线上试看额度已用尽',
    localInstalled: installed,
    launchUrl: `/api/launch/${id}`,
    source: 'aifunengjiaoyu',
    /* 老师的署名是课件内容，留着；只有旧站自己的名字换成乐启享。 */
    author: !w.author ? '' : w.author === OLD_BRAND ? BRAND.name : w.author,
    uses: w.uses || 0,
    price: w.price || 0,
  });
}

const packageName = {};
for (const p of afePremium.packages || []) packageName[p.id] = p.name;

/*
 * The 精品课 packages name their own grade band ("八年级物理 · 上下册",
 * "高中数学"). The catalogue filters by 学段, so each package is mapped
 * onto the three bands the filter offers.
 */
const stageOfPackage = (name) => {
  if (/小学/.test(name)) return '小学';
  if (/高中|必修|选择性/.test(name)) return '高中';
  if (/年级|初中/.test(name)) return '初中';
  return '';
};

for (const c of afePremium.courses || []) {
  if (!c.programId) continue;
  const id = `afe-${c.programId}`;
  const pkg = packageName[c.packageId] || c.packageId;
  const installed = hasBody(id);
  const band = stageOfPackage(pkg);
  products.push({
    id,
    originId: c.programId,
    title: c.title,
    subject: pkg,
    subjectKey: pkg,
    stages: band ? [band] : [],
    stage: band,
    stageSubjects: band ? { [band]: pkg } : {},
    tagline: '',
    dimension: '3d',
    edition: '独立版',
    kind: '精品课',
    features: [pkg, band].filter(Boolean),
    description: installed
      ? `${pkg} · 精品课（已完整下载到本地，可直接在线使用，也可下载后离线打开）`
      : `${pkg} · 精品课（线上目录条目；正文需要账号具备 VIP 会员权益才能取到）`,
    /* The platform serves its own uploads under /prod/uploads. */
    cover: cover((c.coverUrl || '').replace(/^\/uploads\//, '/prod/uploads/')),
    modules: [],
    taxonomy: [],
    mode: 'free',
    publicationStatus: 'published',
    owned: installed,
    accessible: installed,
    onlineAccessible: installed,
    available: installed,
    downloadable: installed,
    canDownload: installed,
    canPurchase: false,
    downloadReason: installed ? '' : 'local-missing',
    localReason: installed ? '' : '线上需 VIP 会员',
    localInstalled: installed,
    launchUrl: `/api/launch/${id}`,
    source: 'aifunengjiaoyu',
    accessState: c.accessState,
    freeSample: !!c.freeSample,
  });
}

const merged = {
  ...xbCatalog,
  serverTime: Date.now(),
  products,
  selling: false,
  salesMode: 'local',
  siteMode: 'local',
  downloadMode: true,
  localReplica: {
    brand: BRAND.name,
    installedCount: products.filter((p) => p.localInstalled).length,
    totalCount: products.length,
    coursewareDir: 'mirror/leqixiang/courseware',
  },
  seller: BRAND.name,
  creditCode: '',
  support: BRAND.phone,
  icp: BRAND.icp,
  securityNumber: '',
  channels: [],
  downloadWarning:
    '本地离线副本，保存后用浏览器打开即可。仅供教学使用。',
};
write(path.join(LQ, 'catalog.json'), JSON.stringify(merged));

/*
 * The 小白教育 part on its own. The second port serves the same clean
 * shell with only this source's catalogue, so the login, the purchase
 * cards and the feedback form are gone there too.
 */
const xbOnly = {
  ...merged,
  products: products.filter((p) => p.source === 'xbjiaoyu'),
  localReplica: {
    ...merged.localReplica,
    scope: 'xiaobai',
    installedCount: products.filter((p) => p.source === 'xbjiaoyu' && p.localInstalled).length,
    totalCount: products.filter((p) => p.source === 'xbjiaoyu').length,
  },
};
write(path.join(LQ, 'catalog-xb.json'), JSON.stringify(xbOnly));

const installed = products.filter((p) => p.localInstalled).length;
console.log(`catalogue: ${products.length} entries, ${installed} playable`);
console.log(`  小白教育: ${products.filter((p) => p.source === 'xbjiaoyu').length}`);
console.log(
  `  图灵智赋作品: ${products.filter((p) => p.source === 'aifunengjiaoyu' && p.kind !== '精品课').length}`
);
console.log(`  图灵智赋精品课: ${products.filter((p) => p.kind === '精品课').length}`);
console.log(
  `  精品课已本地化: ${products.filter((p) => p.kind === '精品课' && p.localInstalled).length}`
);
