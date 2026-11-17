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
import { execFileSync } from 'node:child_process';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const XB = path.join(ROOT, 'mirror', 'xbjiaoyu');
const AFE = path.join(ROOT, 'mirror', 'aifunengjiaoyu');
const OPENLAB = path.join(ROOT, 'mirror', 'openlab');
const PHET = path.join(ROOT, 'mirror', 'phet');
const TONGJIANG = path.join(ROOT, 'mirror', 'tongjiang');
const LABSIMS = path.join(ROOT, 'mirror', 'labsims');
const AVIARY = path.join(ROOT, 'mirror', 'aviary');
const BLOCKLY = path.join(ROOT, 'mirror', 'blocklygames');
const THREEJCN = path.join(ROOT, 'mirror', '3jcn');
const LQ = path.join(ROOT, 'mirror', 'leqixiang');
const SITE = path.join(LQ, 'site');
const CW = path.join(LQ, 'courseware');

/*
 * The stamp that tells the browser a file has changed.  The browser
 * keeps a script under the version in its address, so a rebuilt library
 * that keeps the old tag would keep serving the old file; every build
 * raises the tag instead.
 */
const STAMP = 'lq-' + new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);

const BRAND = {
  name: '乐启享机器人',
  short: '乐启享',
  slogan: '从乐高启蒙 到 AI 创造',
  intro:
    '乐启享机器人专注 3-16 岁少儿科技素养教育，以工程实践与项目制学习，' +
    '让孩子在搭建、调试、协作、展示中真正学会创造。',
  icp: '鄂ICP备2025149404号-1',
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

/*
 * Where a work came from is written down on one page of this library,
 * the page of licences and of names.  The catalogue points at it
 * instead of pointing at the site of the house that published it, so
 * that nothing in the shipped library walks a reader off to another
 * place.
 */
const ATTRIBUTION_URL = '/license.html';

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
/*
 * Some of these files are big, and the disk on a busy machine
 * sometimes says no for a moment.  A write that is refused is tried
 * again rather than left half done.
 */
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const write = (p, s) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  for (let attempt = 0; ; attempt++) {
    try {
      fs.writeFileSync(p, s);
      return;
    } catch (err) {
      if (attempt >= 6) throw err;
      console.warn(`  写不进去，等一下再试（${path.basename(p)}）：${err.code || err.message}`);
    }
    sleep(250);
  }
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
    /* "首页" and "课件库" rendered the same list once the shop was gone,
       so the header keeps one entry and the logo points at the library. */
    .replace('<a href="#works" class="nav-link">首页</a>', '')
    .replace('<a class="brand" href="#works"', '<a class="brand" href="#catalog"')
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
    .replace(/<button data-action="guide">使用帮助<\/button>/, '')
    .replace(/<button data-action="business" id="business" hidden>经营信息<\/button>/, '')
    .replace(/<a href="#refunds">退款与售后<\/a>/, '')
    .replace('<span>© 乐启享</span>', `<span>© 2025-2026 ${BRAND.name} · 所有权利保留</span>`)
    .replace(/<a class="brand footer-brand"[^>]*><img class="site-logo" src="\/brand\/brand-logo.png\?v=8" alt="" width="36" height="36"><span>乐启享<\/span><\/a>/,
      `<a class="brand footer-brand" href="#catalog"><img class="site-logo" src="/brand/brand-logo.png" alt="" width="36" height="36"><span>${BRAND.short}</span></a>`)
    /* The footer's logo points at the library as well. */
    .replace(/(<a class="brand footer-brand"[^>]*href=")[^"]*(")/, '$1#catalog$2')
    .replace('<p>互动课件库 · 在线使用 · 课件下载</p>',
      `<p>${BRAND.slogan}</p>`);
  /* The local build keeps one line only: browse → use → download. */
  html = html.replace('<script type="module" src="/app.js',
    '<script src="/lq-mode.js"></script><script type="module" src="/app.js');
  /*
   * The store sheet also carried the catalogue's own layout rules — the
   * chapter tree, the result row, the card grid.  The sheet goes with the
   * shop, so those rules move into a sheet of their own that takes its
   * place in the cascade.
   */
  html = html.replace(
    /<link[^>]*href="\/online-store\.css[^>]*>/,
    '<link rel="stylesheet" href="/lq-catalog.css?v=' + STAMP + '">'
  );
  if (!html.includes('/lq-catalog.css')) {
    throw new Error('index.html patch missed: lq-catalog.css');
  }
  /* The preview on a course page is loaded only when the reader asks for
     it, so the script itself stays out of the way until then. */
  html = html.replace('</body>',
    '<script src="/lq-preview.js?v=1"></script></body>');
  if (!html.includes('/lq-preview.js')) throw new Error('index.html patch missed: lq-preview.js');
  /* The folded groups on a phone. */
  html = html.replace('</body>',
    '<script src="/lq-folds.js?v=1"></script></body>');
  if (!html.includes('/lq-folds.js')) throw new Error('index.html patch missed: lq-folds.js');
  /*
   * The shell and its modules are cached by the browser under the version
   * in the URL. A rebuilt library that keeps the old tag keeps the old
   * file, so the tags are raised once per build.
   */
  html = html
    .replace('/app.js?v=all-subject-upgrade-20261026.1', '/app.js?v=' + STAMP)
    .replace('/lq-preview.js?v=1', '/lq-preview.js?v=' + STAMP)
    .replace('/lq-folds.js?v=1', '/lq-folds.js?v=' + STAMP);
  if (!html.includes('app.js?v=' + STAMP)) throw new Error('index.html patch missed: the app version');
  write(p, html);
}

/* lq-mode.js: the local-only route guard, copied in with the shell. */
fs.copyFileSync(path.join(ROOT, 'tools', 'lq-mode.js'), path.join(SITE, 'lq-mode.js'));
/* lq-preview.js: the interactive preview on a course page. */
fs.copyFileSync(path.join(ROOT, 'tools', 'lq-preview.js'), path.join(SITE, 'lq-preview.js'));
/* lq-folds.js: the groups that fold away on a phone. */
fs.copyFileSync(path.join(ROOT, 'tools', 'lq-folds.js'), path.join(SITE, 'lq-folds.js'));
/* lq-catalog.css: the catalogue layout rules that the store sheet carried. */
fs.copyFileSync(path.join(ROOT, 'tools', 'lq-catalog.css'), path.join(SITE, 'lq-catalog.css'));

/*
 * license.html: the page every credit in the library points at.
 *
 * A work that carries somebody else's name in its own footer — the
 * simulation families that are published under a Creative Commons
 * licence — has to name the author.  It does not have to walk the
 * reader off to that author's web site, and it does not have to show
 * that author's badge.  So the credits point here instead: the author,
 * the licence and the changes are all written down, on our own page.
 */
{
  const rows = [
    ['公开课本站的游客可见课件（两个来源）', '各自作者', '见各来源目录下的 NOTICE'],
    ['3D 物理实验室', 'Thomas Nguyen', 'CC BY 4.0'],
    ['物理实验室', 'Frank McCulley', '课堂免费使用（作者授权）'],
    ['PhET 互动模拟', 'University of Colorado Boulder', 'CC BY-NC 4.0'],
    ['开源科学仿真', 'iwalpola', 'MIT'],
    ['铜匠实验室 3D 互动课', '铜匠实验室', 'CC BY-NC 4.0'],
    ['开源互动物理课（Physics Notebook）', 'Physics Notebook', 'MIT'],
    ['积木编程课', 'Blockly', 'Apache-2.0'],
  ];
  const p = path.join(SITE, 'license.html');
  write(
    p,
    `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>许可与署名 · ${BRAND.name}</title>
<link rel="icon" href="/brand/favicon.ico" type="image/x-icon">
<style>
  :root{
    --ink:#16202c; --ink2:#4a5a6d; --line:#e2e7ee; --bg:#f6f7f9;
    --accent:#2f6df6; --accent-soft:#eaf0ff;
  }
  *{box-sizing:border-box}
  body{
    margin:0; padding:48px 20px 80px; background:var(--bg); color:var(--ink);
    font:15px/1.75 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;
  }
  main{max-width:860px; margin:0 auto; background:#fff; border:1px solid var(--line); border-radius:14px; padding:36px 34px}
  h1{font-size:26px; margin:0 0 6px; letter-spacing:0}
  h2{font-size:18px; margin:30px 0 10px; letter-spacing:0}
  p{margin:10px 0; color:var(--ink2)}
  .eyebrow{color:var(--accent); font-size:13px; margin:0 0 4px}
  table{width:100%; border-collapse:collapse; margin:12px 0 4px; font-size:14px}
  th,td{text-align:left; padding:10px 12px; border-bottom:1px solid var(--line); vertical-align:top}
  th{color:var(--ink2); font-weight:600; background:#fafbfc}
  td:first-child{color:var(--ink)}
  ul{margin:10px 0; padding-left:20px; color:var(--ink2)}
  .back{display:inline-block; margin-bottom:18px; color:var(--accent); text-decoration:none; font-size:14px}
  .note{background:var(--accent-soft); border:1px solid #d7e2ff; border-radius:10px; padding:12px 14px; color:#24406e; font-size:14px}
  footer{margin-top:28px; padding-top:16px; border-top:1px solid var(--line); color:var(--ink2); font-size:13px}
</style>
</head>
<body>
<main>
  <a class="back" href="/">← 返回课件库</a>
  <p class="eyebrow">${BRAND.name}</p>
  <h1>许可与署名</h1>
  <p>本课件库由${BRAND.name}整理并本地化制作，全部课程可在线预览、可下载使用。
     收录的互动课件来自下列公开或已获授权的来源，每一门课件的原始作者与许可协议均列于此，
     各来源目录下的 <code>NOTICE</code> 文件保存了更完整的署名记录。</p>
  <div class="note">所有课件的界面、加载动画、页签图标与版权说明均由${BRAND.name}统一改写；
     页面不加载任何统计脚本，不跳转任何第三方站点。</div>
  <h2>来源清单</h2>
  <table>
    <thead><tr><th>课件来源</th><th>原始作者</th><th>许可协议 / 署名</th></tr></thead>
    <tbody>
${rows
  .map(
    (r) =>
      `      <tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`
  )
  .join('\n')}
    </tbody>
  </table>
  <h2>本地化改动</h2>
  <ul>
    <li>加载动画、页签图标、页头页脚与版权说明改为${BRAND.name}自有内容。</li>
    <li>移除课程中的登录、付费、购买、反馈与统计脚本。</li>
    <li>外部字体、脚本与图片全部随课件一并本地保存，断网也可完整打开。</li>
    <li>课程编号统一改为本库自有编号，原始编号保存在项目文档中。</li>
  </ul>
  <footer>${BRAND.name} · ${BRAND.slogan}</footer>
</main>
</body>
</html>
`
  );
}

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
    + `<div><p class="eyebrow">关于我们</p><h2>${BRAND.name}</h2></div></div>`
    + `<p>${BRAND.intro}</p>`
    + `<p class="subtle">${BRAND.slogan}</p>`
    + `<p><a class="button secondary small" href="https://codebn.cn/" target="_blank" rel="noreferrer">官网 codebn.cn ↗</a></p>`
    + `</div>');}`;
  js = js.replace(/function about\(\)\{modal\([\s\S]*?\);?\}/, about);
  /*
   * The descriptions of the 图灵智赋 works were written as small pieces of
   * markup — a paragraph, a heading, a list of steps.  The shell escapes
   * every description, so those tags used to show up as the characters
   * "<p>" and "<h3>" in the middle of the text.
   *
   * The text is escaped first and only the bare tags are let through
   * afterwards, so nothing but the shape of the paragraph survives.  Any
   * attribute, any other tag and any script stays escaped text.
   */
  const richText = [
    'const richText=value=>{',
    'const raw=String(value??"");',
    'if(!raw)return "";',
    'const allowed=/^(?:p|br|b|strong|i|em|u|h3|h4|h5|ul|ol|li|div|span|small|sup|sub)$/;',
    'const open=whole=>whole.replace(/&lt;/g,"<").replace(/&gt;/g,">");',
    /* Some texts arrive already escaped, the others arrive as markup. */
    'if(/&lt;[a-z]/i.test(raw))return raw.replace(/&lt;(\\/?)([a-z][a-z0-9]*)&gt;/gi,(whole,slash,tag)=>allowed.test(tag.toLowerCase())?open(whole):whole);',
    'if(!/<[a-z][a-z0-9]*>/i.test(raw))return esc(raw);',
    'return esc(raw).replace(/&lt;(\\/?)([a-z][a-z0-9]*)&gt;/gi,(whole,slash,tag)=>allowed.test(tag.toLowerCase())?open(whole):whole);',
    '};'
  ].join('');
  js = js.replace(
    "const esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c]));",
    "$&\n" + richText
  );
  js = js.replace('<p class="card-description">${esc(p.description)}</p>', '<p class="card-description">${richText(p.description)}</p>');
  js = js.replace(
    '<p class="chapter-course-description">${esc(p.description)}</p>',
    '<p class="chapter-course-description">${richText(p.description)}</p>'
  );
  js = js.replace(
    '<p class="course-lead course-introduction-lead">${esc(p.description)}</p>',
    '<p class="course-lead course-introduction-lead">${richText(p.description)}</p>'
  );
  js = js.replace('<p>${esc(p.description)}</p>', '<p>${richText(p.description)}</p>');
  js = js.replace("${m.description?`<p>${esc(m.description)}</p>`:''}", "${m.description?`<p>${richText(m.description)}</p>`:''}");
  /* The catalogue panel is rewritten on every build, so its module tag
     has to move with it or the browser keeps the old one. */
  js = js.replace(
    "from './download-store.js?v=all-subject-upgrade-20261026.1'",
    "from './download-store.js?v=" + STAMP + "'"
  );
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
  "const plain=/^(afe-|openlab-|phet-|tongjiang-|labsims-|aviary-|lab-|blocklygames-)/.test(id);attachCoursewareDelivery({frame,courseId:id,seriesId:p.splitFrom||id,launch,plain,stillActive:()=>currentLesson===id&&serial===routeSerial&&!leaseExpired,"
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
      + "else if(page==='purchase'){history.replaceState(null,'','#catalog');page='catalog';id='';}"
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
  js = js.replace('遇到问题可在介绍页提交使用反馈。', '');

  /*
   * The catalogue only ever held what can be opened here. There is no
   * price facet and no availability facet: the server answers with the
   * courses whose body is on this disk, and the shell does not second-
   * guess it.
   */
  js = js.replace(
    ".filter(p=>priceFilter==='全部'||p.mode===(priceFilter==='免费'?'free':'paid'))",
    ".filter(p=>true)"
  );
  js = js.replace(
    "const shown=browseCatalog(info.downloadMode&&originFilter!=='教师课件'?catalog.filter(p=>matchesDownloadEdition(p,editionFilter)):catalog,{origin:originFilter,stage,subject:filter,price:priceFilter,",
    "const shown=browseCatalog(info.downloadMode&&originFilter!=='教师课件'?catalog.filter(p=>matchesDownloadEdition(p,editionFilter)):catalog,{origin:originFilter,stage,subject:filter,price:'全部',"
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
    "price:'全部'",
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

/* ------------------------------------------------------- trimmed shell ---
 *
 * The published shell carried a whole commerce desk next to the library:
 * a store with prices, a checkout, refunds, bulk-download administration,
 * phone sign-in, account security, update announcements, promotion clocks,
 * the purchased-library view, the classroom tab and an anti-devtools
 * guard.  A library that is read offline has none of them, so the modules
 * are dropped and the few call sites in app.js become local no-ops.
 */
{
  const p = path.join(SITE, 'app.js');
  let js = read(p);

  /* Replace a whole line of app.js by the words it starts with. */
  const swapHead = (source, head, replacement) => {
    const start = source.indexOf(head);
    if (start < 0) throw new Error('app.js patch missed: ' + head);
    let end = source.indexOf('\n', start);
    if (end < 0) end = source.length;
    else if (end > 0 && source[end - 1] === '\r') end -= 1;
    return source.slice(0, start) + replacement + source.slice(end);
  };
  /* Take a whole line out of app.js. */
  const dropHead = (source, head) => {
    const start = source.indexOf(head);
    if (start < 0) throw new Error('app.js patch missed: ' + head);
    let end = source.indexOf('\n', start);
    if (end < 0) end = source.length;
    else end += 1;
    return source.slice(0, start) + source.slice(end);
  };

  /* The imports of the dropped modules. */
  for (const head of [
    "import {createUpdateAnnouncement} from './update-announcement.js",
    "import {createDownloadBulkUI} from './download-bulk.js",
    "import {createDownloadBulkAdmin} from './download-bulk-admin.js",
    "import {createRefundUI} from './refund-ui.js",
    "import {createOnlineStore} from './online-store.js",
    "import {createPhoneAuth} from './phone-auth.js",
    "import {createAccountSafetyUI} from './account-safety.js",
    "import {createClassroomTab} from './classroom-tab.js",
  ]) {
    js = dropHead(js, head);
  }

  /* The imports whose names are still used by app.js get local versions. */
  js = swapHead(
    js,
    "import {syncPromotionClock,startPromotionCountdowns,promotionNow} from './promotion-countdown.js",
    'const promotionNow=()=>Date.now();const syncPromotionClock=()=>{};const startPromotionCountdowns=()=>{};'
  );
  js = swapHead(
    js,
    "import {organizeLibrary} from './purchase-library.js",
    'const organizeLibrary=()=>[];'
  );
  js = swapHead(
    js,
    "import {mountPurchaseLibrary} from './library-view.js",
    'const mountPurchaseLibrary=()=>{};'
  );
  js = swapHead(
    js,
    "import {classroomReply,isClassroomRequest} from './classroom-channel.js",
    'const classroomReply=async()=>{};const isClassroomRequest=()=>false;'
  );

  /* The objects the app.js call sites use. Each one keeps the shape the
     shell expects and answers with what a local library can say. */
  js = swapHead(
    js,
    'const store=createOnlineStore({',
    "const store={bundle:()=>null,courseBundles:()=>[],bundleSummary:()=>'',purchaseOptions:()=>[],"
      + "bundlePricing:()=>'',bundlesPage:()=>{history.replaceState(null,'','#catalog');},feedbackAdmin:()=>{}};"
  );
  js = swapHead(
    js,
    'const refundUI=createRefundUI({',
    "const refundUI={orderMarkup:()=>'',loginMarkup:()=>'',adminPageMarkup:()=>'',customerMarkup:()=>'',"
      + "adminMarkup:()=>'',open:async()=>{},review:()=>{},submit:async()=>{}};"
  );
  js = swapHead(
    js,
    'const downloadBulk=createDownloadBulkUI({',
    'const downloadBulk={mount:()=>{},invalidate:()=>{}};'
  );
  js = swapHead(
    js,
    'const downloadBulkAdmin=createDownloadBulkAdmin({',
    'const downloadBulkAdmin={render:async()=>{}};'
  );
  js = swapHead(
    js,
    'const accountSafety=createAccountSafetyUI({',
    'const accountSafety={render:async()=>{}};'
  );
  js = swapHead(
    js,
    'const phone=createPhoneAuth({',
    "const phone={cancel:()=>{},phoneMasked:()=>'',refresh:async()=>{},"
      + "open:async()=>{toast('本地版无需登录，课件可直接在线使用或下载。');}};"
  );
  js = swapHead(
    js,
    'const updateAnnouncement=createUpdateAnnouncement({',
    'const updateAnnouncement={show:async()=>{}};'
  );
  js = swapHead(
    js,
    'const tabIdentity=createClassroomTab({makeId:newTabId});',
    "const tabIdentity={id:newTabId(),ready:Promise.resolve(newTabId()),suspend:()=>{},resume:()=>{}};"
  );

  /*
   * The creator desk, the moderation queue and the shop routes were the
   * last of the commercial shell.  The route head above already turned
   * every one of those addresses into the catalogue, so the branches
   * behind them — and the pages they drew — go too.
   */
  const dropRange = (source, startHead, endHead) => {
    const start = source.indexOf(startHead);
    if (start < 0) throw new Error('app.js patch missed: ' + startHead);
    const end = source.indexOf(endHead, start);
    if (end < 0) throw new Error('app.js patch missed: ' + endHead);
    const stop = source.indexOf('\n', end);
    return source.slice(0, start) + source.slice(stop + 1);
  };
  js = dropRange(
    js,
    'let creatorDashboard=null,creatorSelectedId=null,',
    "document.addEventListener('submit',async e=>{const f=e.target;if(!f.matches('[data-creator-form]'))return;"
  );
  js = js.replace(
    "if(page==='course'){await resolveLibraryProduct(id);if(serial!==routeSerial)return;introPage(id);}"
      + "else if(page==='bundle'){if(id)$('#main').classList.add('bundle-detail-page');"
      + "store.bundlesPage(id,{selectedChapter:restoringBrowse?.bundleChapter,onRender:observeReveals});observeReveals();}"
      + "else if(page==='bulk-download-admin'){await downloadBulkAdmin.render(id);}"
      + "else if(page==='feedback-admin'){await store.feedbackAdmin();}"
      + "else if(page==='account-safety'){await accountSafety.render();}"
      + "else if(page==='creator'){await renderCreatorPage();}"
      + "else if(page==='moderation'){await renderModerationPage();}"
      + "else if(page==='purchases'){await refreshCatalog();if(serial!==routeSerial)return;await purchases(serial);}"
      + "else if(page==='refunds'||page==='refund-admin')await refundPage(page==='refund-admin',serial);"
      + "else if(page==='admin')await admin(serial);"
      + "else works();",
    "if(page==='course'){await resolveLibraryProduct(id);if(serial!==routeSerial)return;introPage(id);}else works();"
  );
  /* The admin desk kept a handle that the service-request button calls. */
  js = swapFunction(
    js,
    'async function admin(serial=routeSerial){',
    "async function admin(){history.replaceState(null,'','#catalog');works();}"
  );
  /* The bulk entry was a hidden node the bulk module could mount into. */
  js = js.replace(
    "const bulkEntry=document.createElement('div');bulkEntry.dataset.bulkDownloadEntry='';"
      + "bulkEntry.hidden=true;$('#main .download-gallery-heading').append(bulkEntry);downloadBulk.mount(bulkEntry);",
    ''
  );

  for (const marker of [
    'const store={bundle:',
    'const refundUI={orderMarkup:',
    'const downloadBulk={mount:',
    'const downloadBulkAdmin={render:',
    'const accountSafety={render:',
    'const phone={cancel:',
    'const updateAnnouncement={show:',
    'const tabIdentity={id:',
    "if(page==='course'){await resolveLibraryProduct(id);if(serial!==routeSerial)return;introPage(id);}else works();",
  ]) {
    if (!js.includes(marker)) throw new Error('app.js patch missed: ' + marker);
  }
  for (const gone of [
    'createOnlineStore',
    'createRefundUI',
    'createPhoneAuth',
    'createAccountSafetyUI',
    'createDownloadBulkUI',
    'createDownloadBulkAdmin',
    'createUpdateAnnouncement',
    'createClassroomTab',
    'classroom-channel.js',
    'online-store.js',
    'refund-ui.js',
    'phone-auth.js',
    'account-safety.js',
    'download-bulk.js',
    'download-bulk-admin.js',
    'update-announcement.js',
    'purchase-library.js',
    'library-view.js',
    'promotion-countdown.js',
    'classroom-tab.js',
    'renderCreatorPage',
    'renderModerationPage',
    'creatorRenderDashboard',
    'bulkDownloadEntry',
  ]) {
    if (js.includes(gone)) throw new Error('app.js patch missed: ' + gone + ' is still there');
  }

  /* ---------------------------------------------------- local wording ---
   *
   * The shop is gone; so is everything it used to say.  The functions
   * below used to draw a login form, an order list, a refund page, a
   * payment sheet and a feedback form.  A local library has no account,
   * no order and no refund — the courseware is already on the machine —
   * so each of them is either dropped or turned into the one thing that
   * is true here.
   */

  /* The one that is still reachable: the PPT deep link. */
  js = swapFunction(
    js,
    "async function auth(mode='login'){",
    "async function auth(){toast('本地版无需登录，课件可直接在线使用或下载。');}"
  );
  for (const head of [
    'async function completeAuth(result){',
    'async function purchases(serial=routeSerial){',
    'async function refundPage(adminMode=false,serial=routeSerial){',
    'function checkout(id,confirmed=false){',
    'async function resumeReturnedPayment(){',
  ]) {
    js = swapFunction(js, head, '');
  }
  /* Three of them sit on a single line, so they are taken out line by line. */
  for (const head of [
    'async function submitAuth(form){',
    'async function pay(id,channel,button){',
    "function showPayment({order,payment,paymentMessage=''}){",
    'function deliveryLookup(){',
    'const mobileCheckout=()=>',
    "const readOrder=id=>api('/api/orders/",
  ]) {
    js = swapLine(js, head, '');
  }
  /* The library of an account is a thing of the online site. */
  js = swapLine(
    js,
    'async function resolveLibraryProduct(id){',
    'async function resolveLibraryProduct(id){return product(id);}'
  );

  /* The status words of an order have no order to describe. */
  js = js.replace(/const statusLabel=\{[^}]*\};\r?\n/, '');

  /*
   * The three policy sheets are rewritten from scratch.  The old ones
   * talked about buying, refunds, phone numbers, verification codes and
   * account security — none of which exist in a local copy, and all of
   * which describe somebody else's business.
   */
  const policies = [
    'const policies={',
    "  guide:['使用帮助','<p>在课件库按学段、学科与章节选择课件，打开详情页即可在线预览，或直接下载到本机。</p>"
      + "<p>在线预览与下载都不需要账号，也不需要付费：课件文件已经收在这台机器上，看和拿都是免费的。</p>"
      + "<p>下载得到的就是课件本身（HTML，或打包好的 ZIP），双击即可在浏览器里打开，也可以在没有网络的教学电脑上使用。</p>"
      + "<p>预览时如果画面是空的，多半是课件还在加载，等一会儿或刷新一次即可。</p>'],",
    "  privacy:['隐私说明','<p>这是一个本地应用：课件、封面与说明文件都保存在你自己的电脑上，不会上传到任何服务器。</p>"
      + "<p>课件库没有账号、没有手机号，也没有订单，因此不会收集姓名、学校、联系方式或设备信息。</p>"
      + "<p>页面里没有广告追踪，也没有第三方统计。浏览器自己留下的本地存储（例如已下载记录）只保存在本机。</p>'],",
    "  terms:['使用说明','<p>课件仅供课堂教学与个人学习使用，请勿公开传播、转售，或用于对外的商业培训分发。</p>"
      + "<p>课件正文保留原作者的署名与许可协议，说明见「许可与署名」页面。</p>"
      + "<p>本课件库不对课件内容作担保；如发现内容有误，或与许可要求不符，请以原作者的说明为准。</p>']};",
  ].join('\n');
  js = js.replace(/const policies=\{[\s\S]*?\]};/, () => policies);
  js = swapFunction(js, 'function policyBody(name){', 'function policyBody(name){return policies[name][1];}');

  /*
   * The click handler used to answer fourteen actions that have no
   * meaning here: log in, log out, buy, pay, look up an order, ask for
   * a refund, chase a refund, report a problem, read the delivery
   * ledger.  The ones that survive are the ones a teacher can actually
   * use.
   */
  js = swapLine(
    js,
    "else if(['login','register','recover'].includes(action))auth();else if(action==='owner-login')auth('owner');else if(action==='owner-recover')auth('owner-recover');else if(action==='account')account();",
    "else if(action==='account')account();"
  );
  for (const head of [
    "else if(action==='logout'",
    "else if(action==='library'",
    "else if(action==='refunds'",
    "else if(action==='delivery-lookup'",
    "else if(action==='phone-login'",
    "else if(action==='continue-purchase'",
    "else if(action==='refund-request'",
    "else if(action==='review-refund'",
    "else if(action==='service'",
    "else if(action==='resolve-service'",
    "else if(action==='refund-record'",
  ]) {
    const at = js.indexOf(head);
    if (at < 0) throw new Error('app.js patch missed: ' + head);
    let end = js.indexOf('\n', at);
    if (end < 0) end = js.length;
    else end += 1;
    js = js.slice(0, at) + js.slice(end);
  }

  /*
   * Every form on the shell used to be a commerce form: the sign-in
   * form, the refund form, the service-request form, the delivery
   * ledger and the creator's editor.  None of them exist now, so the
   * handler only keeps a page from posting itself somewhere.
   */
  js = js.replace(
    /document\.addEventListener\('submit',async e=>\{const f=e\.target;if\(\['refund-request-form','refund-review-form'\][\s\S]*?finally\{if\(b\)b\.disabled=false;\}\}\);/,
    "document.addEventListener('submit',e=>{e.preventDefault();});"
  );

  /* The price of a course, the bundle it belongs to and the offer. */
  js = js.replace(
    /const priceText=p=>[^;]*;/,
    "const priceText=p=>'本地可用';"
  );
  js = js.replace(
    /const catalogBuyText=p=>[^;]*;/,
    "const catalogBuyText=p=>'本地已收录';"
  );

  /*
   * The split between the free courses and the paid ones is gone.  Every
   * course in this library can be opened and downloaded, so the filter
   * that separated them had nothing left to separate.
   */
  js = js.replace("sortBy='default',priceFilter='全部',authorFilter=''", "sortBy='default',authorFilter=''");
  js = js.replace(',priceFilter,authorFilter', ',authorFilter');
  js = js.replace(/priceFilter=v\.priceFilter\|\|'全部';/, '');
  js = js.replace(/\|\|priceFilter!=='全部'/g, '');
  js = js.replace(
    "if(['downloads','free','paid'].includes(page)){priceFilter=page==='paid'?'付费':page==='free'?'免费':'全部';page='catalog';history.replaceState(null,'','#catalog');}",
    "if(['downloads','free','paid'].includes(page)){page='catalog';history.replaceState(null,'','#catalog');}"
  );
  js = js.replace(
    "if(action==='price-filter'){priceFilter=value;if(!availableSubjects().includes(filter)){filter='全部';chapterFilter='';}works();}else if(action==='browse-courses')",
    "if(action==='browse-courses')"
  );
  js = js.replace(/stage=filter=priceFilter='全部'/g, "stage=filter='全部'");
  js = js.replace("chapterFilter='';priceFilter='全部';works();", "chapterFilter='';works();");
  js = js.replace(/const freePeriodText=p=>[^;]*;\r?\n/, '');
  js = js.replace('使用权限已更新，请重新登录查看', '使用权限已更新，请重新打开课件');
  js = js.replace(",price:'全部',author:", ',author:');

  /*
   * The price facet itself was still drawn in the filter row of the
   * catalogue, even though the variable behind it had already been
   * taken away — a row that read a name which no longer existed, and
   * took the whole page down with it.  The row goes; the sort order
   * that sat next to it stays.
   */
  js = js.replace(
    '<div class="filter-row"><span class="filter-label">使用</span>'
      + '<div class="filters" role="group" aria-label="按使用方式筛选">'
      + "${['全部','免费','付费'].map(x=>`<button class=\"filter ${priceFilter===x?'active':''}\""
      + ' data-action="price-filter" data-value="${x}" aria-pressed="${priceFilter===x}">'
      + '${x}</button>`).join(\'\')}</div>'
      + '<label class="sort-label">',
    '<label class="sort-label">'
  );

  /*
   * The last two calls of the opening line belonged to the shop: one
   * picked a paid order back up when the browser came back from the
   * payment page, the other announced a new version of the site.
   * Both the functions and the shop are gone, so the calls go too.
   */
  js = js.replace(
    'await route();await resumeReturnedPayment();void updateAnnouncement.show();',
    'await route();'
  );
  /* The page it used to jump to — the purchased courses — is the catalogue. */
  js = js.replace("location.hash='purchases';", "location.hash='#catalog';");

  /* The login button under a course that is not open yet. */
  js = js.replace(
    /\$\{!p\.accessible&&p\.mode!=='preview'&&!user\?'<button class="text-button" data-action="login">[^<]*<\/button>':''\}/g,
    ''
  );

  /*
   * The course introduction page is a local page now: it shows the
   * course, and it offers the two things a local library can offer —
   * a preview and a download.  The version that came with the shop
   * also drew a price, an unlock box, a bundle list, a refund note and
   * a feedback form, none of which mean anything here.
   */
  js = swapFunction(js, 'function introActions(p){', '');
  const introLocal =
    'function introPage(id){'
    + "if(info.courseReplacements?.[id]&&product(id)?.edition!=='integrated'){splitCoursePage(id);return;}"
    + 'const p=product(id);'
    + "if(!p){$('#main').innerHTML='<div class=\"empty\"><h1>未找到这个课件</h1>"
    + "<a class=\"button\" href=\"#catalog\">返回课件目录</a></div>';return;}"
    + 'downloadUI.detail(p);}';
  js = swapFunction(js, 'function introPage(id){', introLocal);
  js = swapLine(js, 'function card(p){', 'function card(p){return downloadUI.card(p);}');

  /* A card in the chapter view offers the same two things. */
  js = js.replace('暂未开放购买', '本地已收录');
  js = js.replace('暂未开放授权', '本地已收录');
  /* The summary of the course bundles above the catalogue. */
  js = js.replace(
    "${teacher||info.downloadMode?'':store.bundleSummary({stage,subject:filter})}",
    () => ''
  );
  js = js.replace(
    /data-action="checkout" data-id="\$\{esc\(p\.id\)\}"/g,
    'data-action="detail" data-id="${esc(p.id)}"'
  );
  js = js.replace(
    '此入口已拆分为以下独立课件，原有授权继续有效。',
    '此入口已拆分为以下独立课件，每一份都可以在线使用或下载。'
  );

  /* The PPT deep link no longer has to sign in first. */
  js = js.replace("if(requiresPptLogin(location,user)){stopTrial();introPage(id);await auth();return;}", '');
  js = js.replace(
    "import {createCourseTools,pptMarkup,requiresPptLogin,purchaseNotice} from './course-tools.js?v=ppt-refund-20261020';",
    "import {createCourseTools,pptMarkup} from './course-tools.js?v=" + STAMP + "';"
  );
  js = js.replace(
    "import {createDownloadUI,matchesDownloadEdition,validDownloadEdition} from './download-store.js?v=lq-20261115';",
    "import {createDownloadUI,matchesDownloadEdition,validDownloadEdition} from './download-store.js?v=" + STAMP + "';"
  );

  /*
   * The download module was handed the store, the refund desk, the
   * payment sheet and the sign-in form.  The local one needs none of
   * them, so the call is trimmed down to what it actually uses.
   */
  js = swapLine(
    js,
    'const downloadUI=createDownloadUI({',
    "const downloadUI=createDownloadUI({api,esc,product:id=>product(id),main:()=>$('#main'),modal,close,toast});"
  );

  /* The stubs for the modules that no longer exist go with them. */
  for (const head of [
    'const refundUI={orderMarkup:',
    'const downloadBulkAdmin={render:',
    'const accountSafety={render:',
    'const updateAnnouncement={show:',
    'const organizeLibrary=()=>[];',
    'const mountPurchaseLibrary=()=>{};',
  ]) {
    const at = js.indexOf(head);
    if (at < 0) throw new Error('app.js patch missed: ' + head);
    let end = js.indexOf('\n', at);
    if (end < 0) end = js.length;
    else end += 1;
    js = js.slice(0, at) + js.slice(end);
  }

  /* The order labels, the money format and the purchase id are gone too. */
  js = js.replace(/const money=n=>n\?[^;]*;\r?\n/, '');
  js = js.replace('let authSerial=0,pendingPurchase=null;', 'let authSerial=0;');
  js = js.replace("authMode='login',", '');

  for (const gone of [
    'purchaseNotice',
    'requiresPptLogin',
    'statusLabel',
    'createRefundUI',
    'createDownloadBulkAdmin',
    'createAccountSafetyUI',
    'createUpdateAnnouncement',
    'organizeLibrary',
    'mountPurchaseLibrary',
    "data-action=\"login\"",
    '/api/orders',
    '/api/library',
    '/api/auth/logout',
    'refundUI',
    'showPayment',
    'store.purchaseOptions',
    'store.courseBundles',
    'store.bundle',
    'store.mountFeedback',
    'introActions',
    'mountFeedback',
    'money(',
    '已购买？登录使用',
    '已购买？登录',
    '购买说明',
    '暂未开放',
    'pendingPurchase',
    'authMode',
    'priceFilter',
    'price-filter',
    '按使用方式筛选',
    'resumeReturnedPayment',
    'updateAnnouncement',
    "location.hash='purchases'",
  ]) {
    if (js.includes(gone)) throw new Error('app.js patch missed: ' + gone + ' is still there');
  }
  write(p, js);

  /*
   * The two modules the shell leans on are written out whole, from the
   * local sources in tools/.  The online ones carried a store, a card
   * list, a price table, an order book and a sign-in form; none of that
   * belongs in a library that is read offline.
   */
  write(
    path.join(SITE, 'download-store.js'),
    read(path.join(ROOT, 'tools', 'lq-download-store.js'))
  );
  write(
    path.join(SITE, 'course-tools.js'),
    read(path.join(ROOT, 'tools', 'lq-course-tools.js'))
  );

  /* index.html: the sheets and the guard of the dropped modules go too. */
  const index = path.join(SITE, 'index.html');
  let html = read(index);
  for (const file of [
    'online-store.css',
    'graph-auth.css',
    'download-bulk.css',
    'download-bulk-admin.css',
    'update-announcement.css',
    'library-view.css',
    'content-guard.js',
  ]) {
    const safe = file.replace(/\./g, '\\.');
    html = html.replace(
      new RegExp(`<link[^>]*href="/${safe}[^>]*>`, 'g'),
      ''
    );
    html = html.replace(
      new RegExp(`<script[^>]*src="/${safe}[^>]*><\\/script>`, 'g'),
      ''
    );
    if (html.includes(file)) throw new Error('index.html patch missed: ' + file);
  }
  write(index, html);

  /* The modules themselves. */
  for (const file of [
    'account-safety.js',
    'bundle-directory.js',
    'classroom-channel.js',
    'classroom-tab.js',
    'content-guard.js',
    'download-bulk-admin.css',
    'download-bulk-admin.js',
    'download-bulk.css',
    'download-bulk.js',
    'graph-auth.css',
    'graph-auth.js',
    'library-view.css',
    'library-view.js',
    'online-store.css',
    'online-store.js',
    'phone-auth.js',
    'promotion-countdown.js',
    'purchase-library.js',
    'refund-ui.js',
    'update-announcement.css',
    'update-announcement.js',
  ]) {
    fs.rmSync(path.join(SITE, file), { force: true });
  }
}

/* download-store.js: the card, the detail panel and the download. */
{
  /*
   * The published module was a shop.  It priced the plans, took the
   * order, counted the quota, kept the ledger and asked for an account
   * before it would hand over a file.  A library that is read offline
   * has none of that: every course is already on the disk, so the
   * module is written out whole, from the local source in tools/.  It
   * draws the card, opens the course and hands the file over.
   */
  const p = path.join(SITE, 'download-store.js');
  const js = read(path.join(ROOT, 'tools', 'lq-download-store.js'));
  for (const marker of [
    'function card(',
    'function detail(',
    'async function download(',
    'data-lq-preview-start',
    'data-download-action="download"',
    'download-edition-fold',
    'download-lede',
    'download-byline',
  ]) {
    if (!js.includes(marker)) throw new Error('download-store.js patch missed: ' + marker);
  }
  for (const gone of [
    'refundUI',
    'showPayment',
    'trial(',
    'count20',
    'permanentPrice',
    'remainingIntegrated',
    'bundlePricing',
    'purchaseOptions',
    '/api/orders',
    '/api/library',
    'money('
  ]) {
    if (js.includes(gone)) throw new Error('download-store.js patch missed: ' + gone + ' is still there');
  }
  write(p, js);
}

/* catalog-browse.js: the filter that told the paid courses from the free. */
{
  const p = path.join(SITE, 'catalog-browse.js');
  let js = read(p);
  js = js.replace("price='全部',", '');
  js = js.replace(/^\s*&&\(price==='全部'[^\n]*\n/m, '');
  for (const gone of ['price', '付费', '免费']) {
    if (js.includes(gone)) throw new Error('catalog-browse.js patch missed: ' + gone);
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
    '<link rel="stylesheet" href="/lq-ui.css?v=' + STAMP + '"></head>'
  );
  if (!html.includes('/lq-ui.css')) throw new Error('index.html patch missed: lq-ui.css');
  write(index, html);
}

/* lq-chapters.js: the chapter grouping the download panel uses. */
{
  const src = read(path.join(XB, 'assets', 'library-view.js'));
  const start = src.indexOf('export function libraryChapters');
  const end = src.indexOf('\n}', start);
  if (start < 0 || end < 0) throw new Error('lq-chapters.js patch missed: the helper is gone');
  write(path.join(SITE, 'lq-chapters.js'), src.slice(start, end + 2).trimEnd() + '\n');
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
 if(data.type==='leqixiang:cdn-fallback'&&data.courseId===ctx.courseId){retry(ctx);return;}
 if(data.type!=='leqixiang:courseware-startup'||![ctx.courseId,ctx.seriesId].includes(data.courseId))return;
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
/*
 * These two names are the contract between the work and the page that
 * hosts it: the work announces "<name>:ready" and waits for an answer
 * that carries the same name.  Both halves carry the name of this
 * library, so the work was renamed to match.
 */
const LONG_MARCH = 'leqixiang-long-march-save-v1';
const PK180 = 'leqixiang-pk180-banks-v1';
const BANK_KEY = 'leqixiang.pk180.banks';
const SAVE_KEY = 'leqixiang.course.save';

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

/* The laboratories publish their covers under a name of our own. */
const labCover = (url) => {
  if (!url) return '';
  const file = String(url).split('/').pop().replace(/^3jcn-/, '');
  return `/brand/lab/${file}`;
};

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

/* ------------------------------------------------------------- the read */

/*
 * The shell is a set of modules, and a module the browser cannot read is
 * a page that stays empty.  `node --check` is too soft for a .js file,
 * so every one of them is read again as a module before the build calls
 * itself finished.
 */
{
  const result = spawnSync(
    process.execPath,
    [path.join(ROOT, 'tools', 'check-lq-site-syntax.mjs'), '--dir', SITE],
    { cwd: ROOT, encoding: 'utf8' }
  );
  const report = String(result.stdout || '') + String(result.stderr || '');
  if (report.trim()) console.log(report.trim());
  if (result.status !== 0) throw new Error('the shell does not read as a set of modules');
}

/*
 * The libraries a lesson loads were once written into a folder whose
 * name was built by adding ".assets" to a name that already ended in
 * ".assets".  The build reads "<lesson>.assets" and never saw them, so
 * two hundred and fifty lessons went into the library without the
 * libraries they load.  A folder of that name is a mistake, and the
 * build stops rather than repeat it.
 */
{
  const odd = [];
  for (const mirror of [AFE, XB]) {
    const folder = path.join(mirror, 'courseware');
    if (!fs.existsSync(folder)) continue;
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name.endsWith('.assets.assets')) {
        odd.push(path.join(folder, entry.name));
      }
    }
  }
  if (odd.length) {
    throw new Error(
      '素材目录名重复了，构建会漏掉它们：' +
        odd.slice(0, 3).join(', ') +
        '（先跑 node tools/repair-assets-folders.mjs）'
    );
  }
}

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

  /* The open lessons keep their own names, and they carry their fonts
     and their stylesheet inside the document. */
  const openlabDir = path.join(OPENLAB, 'courseware');
  if (fs.existsSync(openlabDir)) {
    for (const file of fs.readdirSync(openlabDir)) {
      if (!file.endsWith('.html')) continue;
      const slug = file.replace(/\.html$/, '');
      fs.copyFileSync(path.join(openlabDir, file), path.join(CW, `openlab-${slug}.html`));
    }
  }

  /* The PhET simulations are one self-contained file each; the picture of
     every simulation becomes its cover. */
  const phetDir = path.join(PHET, 'courseware');
  if (fs.existsSync(phetDir)) {
    for (const file of fs.readdirSync(phetDir)) {
      if (!file.endsWith('.html')) continue;
      const slug = file.replace(/\.html$/, '');
      fs.copyFileSync(path.join(phetDir, file), path.join(CW, `phet-${slug}.html`));
    }
    const phetBrand = path.join(PHET, 'brand');
    const lqBrand = path.join(LQ, 'brand', 'phet');
    fs.mkdirSync(lqBrand, { recursive: true });
    for (const file of fs.readdirSync(phetBrand)) {
      if (!/\.(?:png|jpe?g|webp)$/i.test(file)) continue;
      fs.copyFileSync(path.join(phetBrand, file), path.join(lqBrand, file));
    }
  }

  /* The 铜匠实验室 lessons are one self-contained document each; their
     covers become the pictures in the gallery. */
  const tjDir = path.join(TONGJIANG, 'courseware');
  if (fs.existsSync(tjDir)) {
    for (const file of fs.readdirSync(tjDir)) {
      if (!file.endsWith('.html')) continue;
      const slug = file.replace(/\.html$/, '');
      fs.copyFileSync(path.join(tjDir, file), path.join(CW, `tongjiang-${slug}.html`));
    }
    const tjBrand = path.join(TONGJIANG, 'brand');
    const lqTj = path.join(LQ, 'brand', 'tongjiang');
    fs.mkdirSync(lqTj, { recursive: true });
    for (const file of fs.readdirSync(tjBrand)) {
      if (!/\.(?:png|jpe?g|webp)$/i.test(file)) continue;
      fs.copyFileSync(path.join(tjBrand, file), path.join(lqTj, file));
    }
  }

  /* The open science simulations draw themselves; three.js and the web
     fonts they ask for are already in the shared folder, so they run
     straight from disk as well. */
  const labsimDir = path.join(LABSIMS, 'courseware');
  if (fs.existsSync(labsimDir)) {
    for (const file of fs.readdirSync(labsimDir)) {
      if (!file.endsWith('.html')) continue;
      const slug = file.replace(/\.html$/, '');
      fs.copyFileSync(path.join(labsimDir, file), path.join(CW, `labsims-${slug}.html`));
    }
    const labBrand = path.join(LABSIMS, 'brand');
    const lqLab = path.join(LQ, 'brand', 'labsims');
    fs.mkdirSync(lqLab, { recursive: true });
    if (fs.existsSync(labBrand)) {
      for (const file of fs.readdirSync(labBrand)) {
        if (!/\.(?:png|jpe?g|webp)$/i.test(file)) continue;
        fs.copyFileSync(path.join(labBrand, file), path.join(lqLab, file));
      }
    }
  }

  /* The physics laboratories of The Physics Aviary are one self-contained
     document each: the scripts, the stylesheets and the pictures are all
     folded into the file, so it runs straight from the disk. */
  const aviaryDir = path.join(AVIARY, 'courseware');
  if (fs.existsSync(aviaryDir)) {
    for (const file of fs.readdirSync(aviaryDir)) {
      if (!file.endsWith('.html')) continue;
      const slug = file.replace(/\.html$/, '');
      fs.copyFileSync(path.join(aviaryDir, file), path.join(CW, `aviary-${slug}.html`));
    }
    const aviaryBrand = path.join(AVIARY, 'brand');
    const lqAviary = path.join(LQ, 'brand', 'aviary');
    fs.mkdirSync(lqAviary, { recursive: true });
    for (const file of fs.readdirSync(aviaryBrand)) {
      if (!/\.(?:png|jpe?g|webp)$/i.test(file)) continue;
      fs.copyFileSync(path.join(aviaryBrand, file), path.join(lqAviary, file));
    }
  }

  /*
   * The 3D physics laboratories of 3JCN.  Each one is a single page that
   * draws into a canvas; the libraries they borrow are mirrored once and
   * shared with every other laboratory.
   */
  const jcnDir = path.join(THREEJCN, 'courseware');
  if (fs.existsSync(jcnDir)) {
    for (const file of fs.readdirSync(jcnDir)) {
      if (!file.endsWith('.html')) continue;
      const slug = file.replace(/\.html$/, '');
      /*
       * The laboratories are published under a name of our own, so the
       * address a learner sees never names another house.  Everything
       * inside the page that pointed at the old address follows along.
       */
      const id = `lab-${slug.replace(/^3jcn-/, '')}`;
      const html = fs
        .readFileSync(path.join(jcnDir, file), 'utf8')
        .split('/api/program-assets/3jcn-')
        .join(`/api/program-assets/lab-`)
        .split('/courseware/3jcn-')
        .join('/courseware/lab-')
        .split('3jcn-labs-category')
        .join('lab-labs-category')
        /* The shared folder of the laboratories is called vendor now. */
        .split('/_ext/www.new3jcn.com')
        .join('/_ext/vendor')
        .split('/_ext/new3jcn.com')
        .join('/_ext/vendor')
        /* A note left by the browser says where the page was saved from. */
        .replace(/<!--\s*saved from url=\([^)]*\)[^>]*-->/gi, '');
      fs.writeFileSync(path.join(CW, `${id}.html`), html, 'utf8');
    }
    const jcnShared = path.join(THREEJCN, 'shared');
    if (fs.existsSync(jcnShared)) {
      copyDir(jcnShared, path.join(LQ, '_shared-ext'), () => true);
    }
    const jcnBrand = path.join(THREEJCN, 'brand');
    const lqJcn = path.join(LQ, 'brand', 'lab');
    fs.mkdirSync(lqJcn, { recursive: true });
    /* The covers used to sit under the old name; they do not any more. */
    fs.rmSync(path.join(LQ, 'brand', '3jcn'), { recursive: true, force: true });
    if (fs.existsSync(jcnBrand)) {
      for (const file of fs.readdirSync(jcnBrand)) {
        if (!/\.(?:png|jpe?g|webp)$/i.test(file)) continue;
        fs.copyFileSync(path.join(jcnBrand, file), path.join(lqJcn, file));
      }
    }
  }

  /* The block-programming games are little web applications: a page, a
     script bundle and the pictures and sounds they use.  They are kept
     in a folder of their own, and the page points at it. */
  const blocklyDir = path.join(BLOCKLY);
  if (fs.existsSync(blocklyDir)) {
    for (const slug of fs.readdirSync(blocklyDir)) {
      const src = path.join(blocklyDir, slug);
      if (!fs.statSync(src).isDirectory()) continue;
      const page = path.join(src, 'index.html');
      if (!fs.existsSync(page)) continue;
      fs.copyFileSync(page, path.join(CW, `blocklygames-${slug}.html`));
      const assets = path.join(src, 'assets');
      if (fs.existsSync(assets)) {
        copyDir(assets, path.join(CW, `blocklygames-${slug}.assets`), () => true);
      }
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
  html = html.split(OLD_BRAND).join(BRAND.short);
  /*
   * A few works keep a guard that watches for an open debugger: they run
   * `debugger` on a timer, and when a developer tool is attached the
   * statement stops the page dead — the course freezes and the tab stops
   * answering.  The copy in this library is meant to be studied and to be
   * opened by tools, so that watcher is taken out.  The rest of the work —
   * the content, the questions, the scoring — is untouched.
   */
  html = html.replace(
    /var\s+_cdt\s*=\s*function\s*\(\s*\)\s*\{[\s\S]*?setInterval\s*\(\s*_cdt\s*,\s*\d+\s*\)\s*;/,
    '/* the debugger watcher was removed for the local copy */'
  );
  if (html !== before) write(p, html);
}

/*
 * The pieces that live next to a body — a script bundle, a list of
 * tunes — carry the old name as well.
 */
const scrubOldName = (dir) => {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scrubOldName(full);
      continue;
    }
    if (!/\.(?:js|mjs|css|json|html?)$/i.test(entry.name)) continue;
    const text = read(full);
    const out = text.split(OLD_BRAND).join(BRAND.short);
    if (out !== text) write(full, out);
  }
};
for (const entry of fs.readdirSync(CW, { withFileTypes: true })) {
  if (entry.isDirectory() && entry.name.endsWith('.assets')) {
    scrubOldName(path.join(CW, entry.name));
  }
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
      : `${pkg} · 精品课（正文尚未收录到本地）`,
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

/*
 * The open lessons.  They come from an openly licensed project, so they
 * are free to keep and free to hand over, and they bring their fonts and
 * their stylesheet along — a lesson opens from disk with no network.
 */
const openlabCatalog = fs.existsSync(path.join(OPENLAB, 'catalog.json'))
  ? JSON.parse(read(path.join(OPENLAB, 'catalog.json')))
  : [];
for (const lesson of openlabCatalog) {
  const id = `openlab-${lesson.slug}`;
  const installed = hasBody(id);
  products.push({
    id,
    title: lesson.title,
    subject: lesson.subject,
    subjectKey: lesson.subject,
    stages: [lesson.stage],
    stage: lesson.stage,
    stageSubjects: { [lesson.stage]: lesson.subject },
    tagline: lesson.tagline,
    description: lesson.description,
    features: [lesson.stage, lesson.subject, ...lesson.tagline.split(' · ')],
    kind: '课件',
    device: '电脑 · 平板 · 手机',
    format: 'HTML · 离线课件',
    dimension: '2d',
    edition: '开源版',
    modules: [],
    taxonomy: [],
    mode: 'free',
    publicationStatus: 'published',
    updatedAt: '2026-11-16',
    cover: cover(labCover(lesson.cover)),
    owned: installed,
    accessible: installed,
    onlineAccessible: installed,
    available: installed,
    downloadable: installed,
    canDownload: installed,
    canPurchase: false,
    downloadReason: installed ? '' : 'local-missing',
    localReason: installed ? '' : '本地未收录',
    localInstalled: installed,
    launchUrl: `/api/launch/${id}`,
    source: 'openlab',
    author: 'Physics Notebook',
    license: lesson.license,
    sourceUrl: lesson.sourceUrl ? ATTRIBUTION_URL : '',
  });
}

/*
 * The PhET simulations.  Each one is a single document that carries its
 * own experiments, so it opens from disk with no connection at all.
 */
const phetCatalog = fs.existsSync(path.join(PHET, 'catalog.json'))
  ? JSON.parse(read(path.join(PHET, 'catalog.json')))
  : [];
for (const sim of phetCatalog) {
  const id = `phet-${sim.slug}`;
  const installed = hasBody(id);
  const stages = sim.stages && sim.stages.length ? sim.stages : [sim.stage || '通用'];
  const stageSubjects = {};
  for (const s of stages) stageSubjects[s] = sim.subject;
  const features = [];
  if (sim.subjects && sim.subjects.length > 1) features.push(...sim.subjects);
  if (stages.length > 1) features.push(stages.join(' · '));
  features.push('可离线运行');
  products.push({
    id,
    title: sim.title,
    subject: sim.subject,
    subjectKey: sim.subject,
    stages,
    stage: stages[0],
    stageSubjects,
    tagline: sim.titleEn,
    description: sim.description || sim.titleEn,
    features,
    kind: '课件',
    device: '电脑 · 平板 · 手机',
    format: 'HTML · 离线课件',
    dimension: '2d',
    edition: '开源版',
    modules: [],
    taxonomy: [],
    mode: 'free',
    publicationStatus: 'published',
    updatedAt: '2026-11-16',
    cover: cover(sim.cover),
    owned: installed,
    accessible: installed,
    onlineAccessible: installed,
    available: installed,
    downloadable: installed,
    canDownload: installed,
    canPurchase: false,
    downloadReason: installed ? '' : 'local-missing',
    localReason: installed ? '' : '本地未收录',
    localInstalled: installed,
    launchUrl: `/api/launch/${id}`,
    source: 'phet',
    author: 'PhET Interactive Simulations',
    license: sim.license,
    sourceUrl: sim.sourceUrl ? ATTRIBUTION_URL : '',
  });
}

/*
 * The 铜匠实验室 lessons.  Each one is a single document with its own
 * three.js inside, so it runs straight from disk.
 */
const tjCatalog = fs.existsSync(path.join(TONGJIANG, 'catalog.json'))
  ? JSON.parse(read(path.join(TONGJIANG, 'catalog.json')))
  : [];
for (const lesson of tjCatalog) {
  const id = `tongjiang-${lesson.slug}`;
  const installed = hasBody(id);
  const stages = lesson.stages && lesson.stages.length ? lesson.stages : ['通用'];
  const stageSubjects = {};
  for (const s of stages) stageSubjects[s] = lesson.subject;
  const features = [lesson.subject, lesson.type, '可离线运行'].filter(Boolean);
  const textbook = lesson.textbook || [];
  const description = [
    lesson.question ? `<p>${lesson.question}</p>` : '',
    lesson.steps && lesson.steps.length
      ? `<p>课堂环节：${lesson.steps.join(' · ')}</p>`
      : '',
    textbook.length
      ? `<p>对应教材：${textbook.join('；')}</p>`
      : '',
  ].join('');
  products.push({
    id,
    title: lesson.title,
    subject: lesson.subject,
    subjectKey: lesson.subject,
    stages,
    stage: stages[0],
    stageSubjects,
    tagline: lesson.question || `${lesson.subject} · ${lesson.type}`,
    description: description || `<p>${lesson.title}</p>`,
    features,
    kind: '课件',
    device: '电脑 · 平板 · 手机',
    format: 'HTML · 离线课件',
    dimension: '3d',
    edition: '开源版',
    modules: [],
    taxonomy: [],
    mode: 'free',
    publicationStatus: 'published',
    updatedAt: '2026-11-16',
    cover: cover(lesson.cover),
    owned: installed,
    accessible: installed,
    onlineAccessible: installed,
    available: installed,
    downloadable: installed,
    canDownload: installed,
    canPurchase: false,
    downloadReason: installed ? '' : 'local-missing',
    localReason: installed ? '' : '本地未收录',
    localInstalled: installed,
    launchUrl: `/api/launch/${id}`,
    source: 'tongjiang',
    author: lesson.author,
    license: lesson.license,
    sourceUrl: lesson.sourceUrl ? ATTRIBUTION_URL : '',
  });
}

/*
 * The open science simulations.  Each one draws itself and asks for
 * nothing but a copy of three.js, which the shared folder already holds.
 */
const labsimCatalog = fs.existsSync(path.join(LABSIMS, 'catalog.json'))
  ? JSON.parse(read(path.join(LABSIMS, 'catalog.json')))
  : [];
for (const lesson of labsimCatalog) {
  const id = `labsims-${lesson.slug}`;
  const installed = hasBody(id);
  const stages = lesson.stages && lesson.stages.length ? lesson.stages : ['通用'];
  const stageSubjects = {};
  for (const s of stages) stageSubjects[s] = lesson.subject;
  const features = [lesson.subject, stages.join(' · '), '英文原版', '可离线运行'];
  products.push({
    id,
    title: lesson.title,
    subject: lesson.subject,
    subjectKey: lesson.subject,
    stages,
    stage: stages[0],
    stageSubjects,
    tagline: lesson.tagline,
    description: lesson.description,
    features,
    kind: '课件',
    device: '电脑 · 平板 · 手机',
    format: 'HTML · 离线课件',
    dimension: lesson.dimension || '2d',
    edition: '开源版',
    modules: [],
    taxonomy: [],
    mode: 'free',
    publicationStatus: 'published',
    updatedAt: '2026-11-16',
    cover: cover(lesson.cover),
    owned: installed,
    accessible: installed,
    onlineAccessible: installed,
    available: installed,
    downloadable: installed,
    canDownload: installed,
    canPurchase: false,
    downloadReason: installed ? '' : 'local-missing',
    localReason: installed ? '' : '本地未收录',
    localInstalled: installed,
    launchUrl: `/api/launch/${id}`,
    source: 'labsims',
    author: lesson.author,
    license: lesson.license,
    sourceUrl: lesson.sourceUrl ? ATTRIBUTION_URL : '',
  });
}

/*
 * The physics laboratories of The Physics Aviary.  Every program is one
 * self-contained document, so it needs nothing but the file itself.
 */
const aviaryCatalog = fs.existsSync(path.join(AVIARY, 'catalog.json'))
  ? JSON.parse(read(path.join(AVIARY, 'catalog.json')))
  : [];
for (const lesson of aviaryCatalog) {
  const id = `aviary-${lesson.slug}`;
  const installed = hasBody(id);
  const stages = lesson.stages && lesson.stages.length ? lesson.stages : ['初中', '高中'];
  const stageSubjects = {};
  for (const s of stages) stageSubjects[s] = lesson.subject;
  const features = [lesson.subject, stages.join(' · '), '英文原版', '可离线运行'];
  products.push({
    id,
    title: lesson.title,
    subject: lesson.subject,
    subjectKey: lesson.subject,
    stages,
    stage: stages[0],
    stageSubjects,
    tagline: lesson.titleEn,
    description: lesson.description,
    features,
    kind: lesson.kind || '课件',
    device: '电脑 · 平板 · 手机',
    format: 'HTML · 离线课件',
    dimension: lesson.dimension || '2d',
    edition: '开源版',
    modules: [],
    taxonomy: [],
    mode: 'free',
    publicationStatus: 'published',
    updatedAt: '2026-11-16',
    cover: cover(lesson.cover),
    owned: installed,
    accessible: installed,
    onlineAccessible: installed,
    available: installed,
    downloadable: installed,
    canDownload: installed,
    canPurchase: false,
    downloadReason: installed ? '' : 'local-missing',
    localReason: installed ? '' : '本地未收录',
    localInstalled: installed,
    launchUrl: `/api/launch/${id}`,
    source: 'aviary',
    author: 'Frank McCulley 的物理实验室',
    license: '课堂免费使用（作者授权）',
    sourceUrl: lesson.sourceUrl ? ATTRIBUTION_URL : '',
  });
}

/*
 * The 3D physics laboratories of 3JCN.  They are published under a
 * Creative Commons licence, so the whole set is kept here with its
 * author and its licence written beside it.
 */
const jcnCatalog = fs.existsSync(path.join(THREEJCN, 'catalog.json'))
  ? JSON.parse(read(path.join(THREEJCN, 'catalog.json')))
  : [];
for (const lesson of jcnCatalog) {
  /* The laboratories are published under a name of our own. */
  const id = `lab-${lesson.slug.replace(/^3jcn-/, '')}`;
  const installed = hasBody(id);
  const stages = lesson.stages && lesson.stages.length ? lesson.stages : ['初中', '高中'];
  const stageSubjects = {};
  for (const s of stages) stageSubjects[s] = lesson.subject;
  const features = [lesson.subject, stages.join(' · '), '3D 交互仿真', '可离线运行'];
  products.push({
    id,
    title: lesson.title,
    subject: lesson.subject,
    subjectKey: lesson.subject,
    stages,
    stage: stages[0],
    stageSubjects,
    tagline: lesson.titleEn,
    description: lesson.description,
    features,
    kind: lesson.kind || '课件',
    device: '电脑 · 平板',
    format: 'HTML · 离线课件',
    dimension: '3d',
    edition: '开源版',
    modules: [],
    taxonomy: [],
    mode: 'free',
    publicationStatus: 'published',
    updatedAt: '2026-11-17',
    cover: cover(lesson.cover),
    owned: installed,
    accessible: installed,
    onlineAccessible: installed,
    available: installed,
    downloadable: installed,
    canDownload: installed,
    canPurchase: false,
    downloadReason: installed ? '' : 'local-missing',
    localReason: installed ? '' : '本地未收录',
    localInstalled: installed,
    launchUrl: `/api/launch/${id}`,
    source: 'lab',
    author: 'Thomas Nguyen 的开源物理仿真',
    license: 'CC BY 4.0',
    sourceUrl: lesson.sourceUrl ? ATTRIBUTION_URL : '',
  });
}

/*
 * The block-programming games of Google.  Each one is a little web
 * application, so it travels with its own folder of pictures and sounds.
 */
const blocklyCatalog = fs.existsSync(path.join(BLOCKLY, 'catalog.json'))
  ? JSON.parse(read(path.join(BLOCKLY, 'catalog.json')))
  : [];
for (const lesson of blocklyCatalog) {
  const id = `blocklygames-${lesson.slug}`;
  const installed = hasBody(id);
  const stages = lesson.stages && lesson.stages.length ? lesson.stages : ['小学'];
  const stageSubjects = {};
  for (const s of stages) stageSubjects[s] = lesson.subject;
  const features = [lesson.subject, stages.join(' · '), '中文界面', '可离线运行'];
  products.push({
    id,
    title: lesson.title,
    subject: lesson.subject,
    subjectKey: lesson.subject,
    stages,
    stage: stages[0],
    stageSubjects,
    tagline: lesson.titleEn,
    description: lesson.description,
    features,
    kind: '课件',
    device: '电脑 · 平板',
    format: 'HTML · 离线课件',
    dimension: '2d',
    edition: '开源版',
    modules: [],
    taxonomy: [],
    mode: 'free',
    publicationStatus: 'published',
    updatedAt: '2026-11-16',
    cover: cover(lesson.cover),
    owned: installed,
    accessible: installed,
    onlineAccessible: installed,
    available: installed,
    downloadable: installed,
    canDownload: installed,
    canPurchase: false,
    downloadReason: installed ? '' : 'local-missing',
    localReason: installed ? '' : '本地未收录',
    localInstalled: installed,
    launchUrl: `/api/launch/${id}`,
    source: 'blocklygames',
    author: 'Blockly 积木编程课',
    license: 'Apache-2.0',
    sourceUrl: lesson.sourceUrl ? ATTRIBUTION_URL : '',
  });
}

/*
 * The quality gate has already looked at every course that opens here.
 * The ones it turned away do not go into the catalogue and do not stay
 * on the disk, so the library only ever shows what is worth opening.
 */
const gateFile = path.join(LQ, 'quality-decisions.json');
const gate = fs.existsSync(gateFile) ? JSON.parse(read(gateFile)) : { drop: {} };
const droppedIds = new Set(Object.keys(gate.drop || {}));
if (droppedIds.size) {
  const before = products.length;
  for (let i = products.length - 1; i >= 0; i--) {
    if (droppedIds.has(products[i].id)) products.splice(i, 1);
  }
  console.log(`  质检剔除: ${before - products.length} 门`);
}

/*
 * The words of a lesson were written by whoever published it, and now
 * and then one of them names another house: two module descriptions
 * said "参考 PhET 的…".  The physics stays; the name of somebody else's
 * platform does not.  Only the text a reader reads is touched — the
 * ids, the paths and the attribution columns keep their names, because
 * those belong to the works themselves.
 */
const VISIBLE_BRAND_WORDS = [
  [/参考\s*PhET\s*的/g, '参考经典实验的'],
  [/PhET/g, '该模拟'],
  [/图灵智赋/g, '乐启享'],
  [/图小灵/g, '乐启享助手'],
  [/小白教育/g, '乐启享'],
];
const scrubVisible = (value) => {
  if (typeof value !== 'string') return value;
  let out = value;
  for (const [re, to] of VISIBLE_BRAND_WORDS) out = out.replace(re, to);
  return out;
};
for (const p of products) {
  for (const key of [
    'title',
    'tagline',
    'description',
    'subject',
    'kind',
    'format',
    'device',
  ]) {
    if (typeof p[key] === 'string') p[key] = scrubVisible(p[key]);
  }
  for (const key of ['stages', 'features']) {
    if (Array.isArray(p[key])) p[key] = p[key].map(scrubVisible);
  }
  if (Array.isArray(p.modules)) {
    for (const m of p.modules) {
      if (typeof m.title === 'string') m.title = scrubVisible(m.title);
      if (typeof m.description === 'string') {
        m.description = scrubVisible(m.description);
      }
    }
  }
  if (Array.isArray(p.taxonomy)) {
    for (const t of p.taxonomy) {
      if (typeof t.domain === 'string') t.domain = scrubVisible(t.domain);
      if (typeof t.chapter === 'string') t.chapter = scrubVisible(t.chapter);
      if (Array.isArray(t.topics)) t.topics = t.topics.map(scrubVisible);
    }
  }
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
  /*
   * No mailbox and no phone number go into the catalogue.  The library is
   * read on a teacher's own machine; a number that rings somebody's phone
   * from inside a lesson is somebody else's business, not ours.
   */
  support: '',
  icp: BRAND.icp,
  securityNumber: '',
  channels: [],
  downloadWarning:
    '本地离线副本，保存后用浏览器打开即可。仅供教学使用。',
};
write(path.join(LQ, 'catalog.json'), JSON.stringify(merged));

/*
 * The shell is read by a teacher, not by a colleague.  Nothing that
 * rings a phone, opens a mailbox or carries a filing number may sit in
 * the files the browser downloads.  The about dialog used to print two
 * mobile numbers and a credit code, and the audit only ever looked at
 * HTML, so the shell slipped through it.  This gate reads the shell
 * itself: the pages, the scripts and the catalogue.
 *
 * A number inside a file name is a hash, not a telephone number, so
 * the rule needs a word boundary on both sides.
 */
{
  const shipped = [];
  for (const name of fs.readdirSync(SITE)) {
    if (/\.(html?|js|css)$/i.test(name)) shipped.push(path.join(SITE, name));
  }
  shipped.push(path.join(LQ, 'catalog.json'));
  const forbidden = [
    ['手机号', /(?<![\w.-])1[3-9]\d{9}(?![\w.-])/g],
    ['邮箱', /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g],
    [
      '统一社会信用代码',
      /统一社会信用代码\s*[:：]?\s*[0-9A-HJ-NPQRTUWXY]{18}/g,
    ],
    ['客服电话', /(?:客服|联系电话|服务热线|咨询热线)\s*[:：]?\s*[\d-]{7,}/g],
  ];
  const bad = [];
  for (const file of shipped) {
    const text = fs.readFileSync(file, 'utf8');
    for (const [name, re] of forbidden) {
      re.lastIndex = 0;
      const hits = text.match(re);
      if (hits?.length) {
        bad.push(
          path.relative(ROOT, file).replace(/\\/g, '/') +
            ' · ' +
            name +
            ' ×' +
            hits.length
        );
      }
    }
  }
  if (bad.length) {
    throw new Error('外壳里留着敏感信息，先清掉再构建：' + bad.join('；'));
  }
}

const installed = products.filter((p) => p.localInstalled).length;
console.log(`catalogue: ${products.length} entries, ${installed} playable`);
console.log(`  互动课件: ${products.filter((p) => p.source === 'xbjiaoyu').length}`);
console.log(
  `  课堂作品: ${products.filter((p) => p.source === 'aifunengjiaoyu' && p.kind !== '精品课').length}`
);
console.log(`  精品课: ${products.filter((p) => p.kind === '精品课').length}`);
console.log(
  `  精品课已本地化: ${products.filter((p) => p.kind === '精品课' && p.localInstalled).length}`
);
console.log(
  `  开源互动课件: ${products.filter((p) => p.source === 'openlab').length}`
);
console.log(
  `  开源互动模拟（来源二）: ${products.filter((p) => p.source === 'phet').length}`
);
console.log(
  `  3D 互动课（来源三）: ${products.filter((p) => p.source === 'tongjiang').length}`
);
console.log(
  `  开源科学仿真（来源四）: ${products.filter((p) => p.source === 'labsims').length}`
);
console.log(
  `  物理实验室课件（来源五）: ${products.filter((p) => p.source === 'aviary').length}`
);
console.log(
    `  3D 物理仿真: ${products.filter((p) => p.source === 'lab').length}`
);
console.log(
  `  积木编程课（来源六）: ${products.filter((p) => p.source === 'blocklygames').length}`
);

/*
 * A 图灵智赋 body points at a signed folder address that carries the
 * wechat id of whoever opened the course.  The local server rewrites that
 * address away when it serves the document, so the signature is dead
 * weight on disk — and an account id in the repository.  Scrub it.
 */
try {
  execFileSync(
    process.execPath,
    [path.join(ROOT, 'tools', 'scrub-afe-leases.mjs'), '--write'],
    { stdio: 'inherit' }
  );
} catch {
  console.warn('scrub-afe-leases 没跑成，继续（构建产物里会带着签名租约）');
}
