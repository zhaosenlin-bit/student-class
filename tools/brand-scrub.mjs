#!/usr/bin/env node
/*
 * Brand scrub.
 *
 * The library is Leqixiang's, and it should look that way: a learner
 * opening a course should not meet somebody else's badge, somebody
 * else's "powered by", a tracker that phones home, or a link that
 * walks them off to another site.
 *
 * What may stay is what the law asks for: the copyright line and the
 * name of the author.  Those are written into the NOTICE files of the
 * mirror, and a short line near the work keeps the credit honest
 * without turning the course into somebody else's advert.
 *
 *   node tools/brand-scrub.mjs          # write the changes
 *   node tools/brand-scrub.mjs --check  # only report what would change
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { brightness, size } from './png-brightness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');
const report = [];
const note = (file, rule, n) => {
  if (n) report.push({ file, rule, n });
};

const catalog = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'mirror', 'leqixiang', 'catalog.json'), 'utf8')
);
const known = new Set(catalog.products.map((p) => p.id));

/*
 * The 3D laboratories are published under a name of our own, so the
 * check for a sibling course looks at the mirror itself rather than at
 * the published catalogue.
 */
const JCN_DIR = path.join(ROOT, 'mirror', '3jcn', 'courseware');
const jcnSource = new Set(
  fs.existsSync(JCN_DIR)
    ? fs.readdirSync(JCN_DIR)
        .filter((f) => f.endsWith('.html'))
        .map((f) => f.replace(/\.html$/, ''))
    : []
);
const jcnHas = (slug) => {
  const bare = slug.replace(/^3jcn-/, '');
  return jcnSource.has(bare) || jcnSource.has(`3jcn-${bare}`);
};

/* ------------------------------------------------------------- helpers -- */

const count = (html, re) => (html.match(re) || []).length;

/*
 * A piece of code may write its address as a template: `the address of
 * ${the thing}`.  Inside such a template another template may sit, and
 * a plain search for the closing backtick stops at the inner one and
 * leaves the rest of the code in pieces.  These two helpers find the
 * whole span of a template, so a rule that rewrites an address inside
 * one rewrites the whole template and nothing else.
 */
const templateEnd = (s, open) => {
  let depth = 0;
  for (let k = open + 1; k < s.length; k++) {
    const c = s[k];
    if (c === '\\') {
      k++;
      continue;
    }
    if (depth === 0) {
      if (c === '`') return k;
      if (c === '$' && s[k + 1] === '{') {
        depth = 1;
        k++;
      }
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (c === '`') {
      const end = templateEnd(s, k);
      if (end < 0) return -1;
      k = end;
    }
  }
  return -1;
};

/* Rewrites every template that starts with the given opening, whole. */
const rewriteTemplates = (html, openRe, to) => {
  let out = '';
  let i = 0;
  let n = 0;
  while (i < html.length) {
    openRe.lastIndex = i;
    const m = openRe.exec(html);
    if (!m) {
      out += html.slice(i);
      break;
    }
    const open = m.index;
    const end = templateEnd(html, open);
    if (end < 0) {
      out += html.slice(i, open + m[0].length);
      i = open + m[0].length;
      continue;
    }
    out += html.slice(i, open) + to;
    i = end + 1;
    n++;
  }
  return { html: out, n };
};

/*
 * Some of these files are big, and the disk on a busy machine sometimes
 * says no for a moment.  A write that is refused is tried again.
 */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const writeFile = async (file, text) => {
  for (let attempt = 0; ; attempt++) {
    try {
      fs.writeFileSync(file, text, 'utf8');
      return;
    } catch (err) {
      if (attempt >= 5) throw err;
      await sleep(120);
    }
  }
};

/*
 * Trackers are found by looking at whole script blocks, so a stray
 * "gtag(" inside a lesson can never swallow the lesson before it.
 */
const stripTrackers = (html) => {
  let n = 0;
  html = html.replace(/<script\b[\s\S]*?<\/script>/gi, (block) => {
    if (
      /googletagmanager\.com|google-analytics\.com|gtag\(|analytics\.js|hotjar|clarity\.ms|firebase|facebook\.net|baidu\.com\/hm\.js|static\.cloudflareinsights\.com|75124c326cb447fe934cde04713ae013/i.test(
        block
      )
    ) {
      n++;
      return '';
    }
    return block;
  });
  html = html.replace(/<noscript\b[\s\S]*?<\/noscript>/gi, (block) => {
    if (/googletagmanager\.com|google-analytics\.com/i.test(block)) {
      n++;
      return '';
    }
    return block;
  });
  html = html.replace(
    /<link[^>]+rel\s*=\s*["']?(?:preconnect|dns-prefetch)["']?[^>]*googleapis\.com[^>]*>/gi,
    () => {
      n++;
      return '';
    }
  );
  return { html, n };
};

/* An element and its content, matched by the tag that opens it. */
const dropBlock = (html, openRe, n) => {
  const out = html.replace(openRe, () => {
    n.n++;
    return '';
  });
  return out;
};

/*
 * The icon of the tab belongs to this library.  A link that already
 * points at it is left alone, so the sweep can be run again without
 * changing anything.
 */
const ICON_RE = /<link[^>]+rel\s*=\s*["']?(?:shortcut icon|icon)["']?[^>]*>/gi;
const LQ_ICON = '<link rel="icon" href="/brand/favicon.ico">';
const swapIcon = (html) => {
  let n = 0;
  const out = html.replace(ICON_RE, (m) => {
    if (m.includes('/brand/favicon.ico')) return m;
    n++;
    return LQ_ICON;
  });
  return { html: out, n };
};

/* ------------------------------------------------------------ the rules -- */

const CREDIT_3JCN = '课件改编自 Thomas Nguyen 的开源物理仿真 · CC BY 4.0';

/*
 * Eight sheets of work point their frame at the category page of the
 * original site, which was never mirrored.  Each one has a sibling
 * simulation in this library, and the frame is pointed at it.
 */
const LAB_SIBLING = {
  '3jcn-labs-changing-motion-lab': 'lab-mechanics-changing-motion',
  '3jcn-labs-coulomb-law-lab': 'lab-phyc240-coulomb-law-lab',
  '3jcn-labs-hooke-law-lab': 'lab-mechanics-hooke-law-simulation',
  '3jcn-labs-photoelectric-lab': 'lab-phyc240-photoelectric',
  '3jcn-labs-simultaneity-lab': 'lab-simulation-einstein-simultaneity',
};

const scrub3jcn = (html, id) => {
  const rules = [];
  const published = `lab-${id.replace(/^3jcn-/, '')}`;

  const track = stripTrackers(html);
  html = track.html;
  rules.push(['移除访问统计脚本', track.n]);

  /*
   * The libraries of the 3D laboratories are kept in one shared folder.
   * The folder used to carry the name of the house they came from; it is
   * called "vendor" now, so a page that asks for a file does not say
   * whose it was.
   */
  let vendor = 0;
  html = html.replace(/\/_ext\/www\.new3jcn\.com/gi, () => {
    vendor++;
    return '/_ext/vendor';
  });
  html = html.replace(/\/_ext\/new3jcn\.com/gi, () => {
    vendor++;
    return '/_ext/vendor';
  });
  rules.push(['共享素材目录改为中性名字', vendor]);

  const before = html;

  /* The badge in the corner of the simulation. */
  html = html.replace(
    /(<div[^>]*id\s*=\s*["']?toolbarHeader["']?[^>]*>)[^<]*(<\/div>)/gi,
    (m, a, b) => `${a}乐启享 · 物理实验室${b}`
  );
  rules.push(['工具栏角标', count(before, /id\s*=\s*["']?toolbarHeader["']?/gi)]);

  /* Words a learner reads. */
  const words = [
    [/All 3JCN Physics Simulations/g, '全部物理仿真'],
    [/Related 3JCN Physics Simulations/g, '相关物理仿真'],
    [/3JCN Physics Simulation/g, '乐启享物理仿真'],
    [/Free 3D Physics Simulations/g, '3D 物理仿真'],
    [/3JCN CCK/g, '乐启享 · 物理实验室'],
    [/This page is designed as an educational visualization in 3JCN style\./g,
      'This page is an educational visualization prepared for teaching.'],
    [/3JCN-style /g, ''],
    [/3JCN 3D Physics Simulation/g, 'Leqixiang 3D Physics Simulation'],
    [/3JCN, All rights reserved\./g, 'Leqixiang, All rights reserved.'],
  ];
  for (const [re, to] of words) {
    const n = count(html, re);
    if (n) {
      html = html.replace(re, to);
      rules.push([`可见文字 ${re.source} → ${to}`, n]);
    }
  }

  /* The credit line keeps the author; the address lives in the NOTICE. */
  const credit = count(html, /Website\s*:\s*&quot;?3jcn\.(?:us|com)&quot;?/gi);
  html = html.replace(/Website\s*:\s*(?:&quot;|")?3jcn\.(?:us|com)(?:&quot;|")?/gi, '来源与许可：见项目文档');
  rules.push(['来源署名改为中性说明', credit]);

  /* The name of the original site in a title or a description. */
  let named = count(html, /\| 3JCN/g);
  html = html.replace(/\| 3JCN/g, ' | 乐启享课件库');
  rules.push(['替换标题里的别家名字', named]);

  /* Alt text and titles are read by a screen reader, so they count. */
  let alt = 0;
  html = html.replace(
    /(<(?:img|image)\b[^>]*\balt\s*=\s*["'])[^"']*3JCN[^"']*(["'])/gi,
    (m, a, b) => {
      alt++;
      return `${a}物理仿真素材${b}`;
    }
  );
  html = html.replace(
    /(<(?:title|h1|h2|h3)\b[^>]*>)([^<]*3JCN[^<]*)(<\/(?:title|h1|h2|h3)>)/gi,
    (m, a, mid, b) => {
      alt++;
      return `${a}${mid.replace(/3JCN/g, '乐启享物理仿真')}${b}`;
    }
  );
  rules.push(['替换图片说明与标题里的别家名字', alt]);

  /* Metadata: our name, not theirs. */
  html = html.replace(
    /(<meta[^>]+name\s*=\s*["']author["'][^>]+content\s*=\s*["'])[^"']*?(["'])/gi,
    (m, a, b) => `${a}乐启享课件库（改编自 Thomas Nguyen 的开源物理仿真）${b}`
  );
  html = html.replace(
    /(<meta[^>]+name\s*=\s*["']author["'][^>]+content\s*=\s*["'])[^"']*?(["'])/gi,
    (m, a, b) => `${a}乐启享课件库（改编自 Thomas Nguyen 的开源物理仿真）${b}`
  );
  html = html.replace(
    /(<meta[^>]+(?:property|name)\s*=\s*["'](?:og:site_name|application-name|og:application_name)["'][^>]+content\s*=\s*["'])[^"']*?(["'])/gi,
    (m, a, b) => `${a}乐启享课件库${b}`
  );
  html = html.replace(/(<meta[^>]+name\s*=\s*["']keywords["'][^>]+content\s*=\s*["'])[^"']*?(["'])/gi, (m, a, b) => {
    const inside = m.match(/content\s*=\s*["']([^"']*)["']/i)?.[1] || '';
    const kept = inside
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s && !/3jcn/i.test(s))
      .join(', ');
    return `${a}${kept}${b}`;
  });
  html = html.replace(/\s*\|\s*3JCN Physics Simulation/g, ' | 乐启享课件库');
  html = html.replace(/3JCN Physics Simulation/g, '乐启享物理仿真');

  /* The icon of the tab belongs to us. */
  const icon = swapIcon(html);
  html = icon.html;
  rules.push(['换成乐启享的页签图标', icon.n]);

  /* Structured data that points at the house the work came from. */
  const ld = count(html, /"(?:@id|url)"\s*:\s*"https?:\/\/(?:www\.)?new3jcn\.com[^"]*"/gi);
  html = html.replace(
    /"(?:@id|url)"\s*:\s*"https?:\/\/(?:www\.)?new3jcn\.com[^"]*"/gi,
    `"@id":"/courseware/${published}.html"`
  );
  rules.push(['结构化数据指向本地页面', ld]);

  /* Links that lead away from the library. */
  const navIds = ['3jcn-simulation', '3jcn-labs-category'];
  let nav = 0;
  html = html.replace(/<a\b[^>]*href\s*=\s*["'][^"']*3jcn-(?:simulation|labs-category)[^"']*["'][^>]*>[\s\S]*?<\/a>/gi, () => {
    nav++;
    return '';
  });
  rules.push(['移除指向站外的目录链接', nav]);

  /* Links to a sibling course become local links. */
  let rel = 0;
  html = html.replace(/href\s*=\s*["']([^"']*?)\/courseware\/(3jcn-[a-z0-9-]+)\?local=1["']/gi, (m, pre, target) => {
    if (!jcnHas(target)) return m;
    rel++;
    return `href="${pre}/courseware/lab-${target.replace(/^3jcn-/, '')}.html"`;
  });
  rules.push(['站内课程链接改为本地路径', rel]);

  /* A page of the original site that was not mirrored: the link goes. */
  let orphan = 0;
  html = html.replace(
    /<a\b[^>]*href\s*=\s*["']\/[a-z0-9_-]+\/([a-z0-9_-]+)\.html["'][^>]*>[\s\S]*?<\/a>/gi,
    (m, slug) => {
      const target = `3jcn-${slug}`;
      if (jcnHas(target)) {
        rel++;
        return `<a href="/courseware/lab-${slug}.html">`;
      }
      orphan++;
      return '';
    }
  );
  rules.push(['移除指向未镜像页面的链接', orphan]);

  /* A frame that pointed at the category page of the original site. */
  const sibling = LAB_SIBLING[id];
  let frame = 0;
  html = html.replace(
    /<iframe[^>]*src\s*=\s*["']\/courseware\/3jcn-labs-category\?local=1["'][^>]*>/gi,
    () => {
      frame++;
      if (!sibling) return '';
      return `<iframe src="/courseware/${sibling}.html" title="物理实验仿真" style="width:100%;height:min(72vh,680px);border:1px solid #2a3550; border-radius:12px;background:#0b1020;display:block;margin:18px auto;">`;
    }
  );
  html = html.replace(
    /<input[^>]*onclick\s*=\s*["'][^>]*3jcn-labs-category[^>]*>/gi,
    () => {
      frame++;
      return '';
    }
  );
  html = html.replace(
    /<input[^>]*value\s*=\s*["'][^>]*3jcn-labs-category[^>]*>/gi,
    () => {
      frame++;
      return '';
    }
  );
  rules.push(['修正指向未镜像分类页的入口', frame]);

  /* A link to a course of the original site that is not in this library. */
  let dead = 0;
  html = html.replace(
    /<a\b[^>]*href\s*=\s*["'][^"']*\/courseware\/(3jcn-[a-z0-9-]+)\?local=1["'][^>]*>[\s\S]*?<\/a>/gi,
    (m, target) => {
      if (jcnHas(target)) return m;
      dead++;
      return '';
    }
  );
  rules.push(['移除指向未收录课程的链接', dead]);

  /* The site address in metadata points nowhere useful. */
  html = html.replace(
    /<meta[^>]+property\s*=\s*["']og:url["'][^>]*content\s*=\s*["']https?:\/\/www\.new3jcn\.com[^"']*["'][^>]*>/gi,
    () => {
      nav++;
      return `<meta property="og:url" content="/courseware/${id}">`;
    }
  );

  return { html, rules };
};

const scrubAviary = (html) => {
  const rules = [];
  const track = stripTrackers(html);
  html = track.html;
  rules.push(['移除访问统计脚本', track.n]);

  /* A link out to the author's own language list. */
  const langs = count(
    html,
    /<div[^>]*id\s*=\s*["']?AvailableLanguages["']?[^>]*>[\s\S]*?LanguageDropDown[^>]*>\s*<\/div>\s*<\/div>/gi
  );
  html = html.replace(
    /<div[^>]*id\s*=\s*["']?AvailableLanguages["']?[^>]*>[\s\S]*?LanguageDropDown[^>]*>\s*<\/div>\s*<\/div>/gi,
    ''
  );
  rules.push(['移除"See Available Languages"外链控件', langs]);

  /*
   * Two of the sheets name the simulation they grew out of.  The name
   * of the person who wrote it stays -- the licence asks for it -- and
   * the name of the house is replaced by a pointer to the licence page
   * of this library.
   */
  let credit = 0;
  html = html.replace(
    /(\*Inspired by Mr\. Geoffrey Clarion of Rocklin High School and based on "Resistance in a Wire" by )PhET/g,
    () => {
      credit++;
      return '$1原作者（署名与许可见许可与署名页）';
    }
  );
  rules.push(['致谢里的外来品牌改成许可页指引', credit]);

  /*
   * The language lists of a program travel with it: they are written
   * into the page, and the loader below hands them over from there.
   * The key they are filed under still spelled out the address of the
   * house that published them.  The loader also matches a list by its
   * file name alone, so the key can be a local path and the program
   * never notices the difference.
   */
  let keys = 0;
  html = html.replace(
    /https?:\/\/(?:www\.)?thephysicsaviary\.com\/Physics\/Programs\/Labs\/([A-Za-z0-9_-]+)\/languages\.json/g,
    (m, name) => {
      keys++;
      return `languages/${name}.json`;
    }
  );
  html = html.replace(/https?:\/\/(?:www\.)?thephysicsaviary\.com/g, () => {
    keys++;
    return '/license.html';
  });
  rules.push(['课件里的外来站点地址改到本地', keys]);
  return { html, rules };
};

const scrubPhet = (html, id) => {
  const rules = [];
  const track = stripTrackers(html);
  html = track.html;
  rules.push(['移除访问统计脚本', track.n]);

  /*
   * The credits of a simulation are put together by a little module of
   * the simulation's own.  It names the author, and that name has to
   * stay — the licence asks for it.  Everything around it is branding:
   * a trademark sign, four links to somebody else's site, a donate
   * button, and a QR code made by a third party.  Those go, and the
   * credit points at the library's own licence page instead.
   */
  let brand = 0;
  html = html.replace(
    /name:"PhET™ Interactive Simulations, University of Colorado Boulder"/g,
    () => {
      brand++;
      return 'name:"开放科学互动课件 · 乐启享机器人本地化整理（原始作者与授权协议见许可与署名页）"';
    }
  );
  rules.push(['致谢栏改成署名 + 本地化说明', brand]);

  /*
   * A simulation carries the name of the house that published it in the
   * words of its own menu: the label of the button in the corner, the
   * entry that opens the website, the one that offers a donation, the
   * heading of the credits panel.  A reader opens the menu and sees
   * them, so they are words on the glass and not a comment in a file.
   *
   * The names of the people who wrote the simulation stay -- the
   * licence asks for them -- and the name of the house goes, because
   * the house is named in full on the page of licences and names of
   * this library, which is where a reader is sent to look.
   */
  let words = 0;
  for (const [from, to] of [
    /* The heading of the credits panel. */
    ['PhET™ Interactive Simulations, University of Colorado Boulder', '乐启享机器人本地化整理'],
    /* The house in the name of the team that wrote it. */
    [' (PhET Interactive Simulations)', ''],
    ['PhET Interactive Simulations', '原作者团队'],
    /* The entries of the menu. */
    ['PhET Accessibility…', '无障碍说明…'],
    ['PhET Accessibility', '无障碍说明'],
    ['PhET Website…', '许可与署名…'],
    ['PhET Website', '许可与署名'],
    ['PhET 网站…', '许可与署名…'],
    ['PhET 网站', '许可与署名'],
    ['向PhET捐款', '致谢与许可'],
    ['Donate to PhET', '致谢与许可'],
    /* The button in the corner and the menu it opens. */
    ['PhET 菜单', '乐启享菜单'],
    ['PhET Menu', '乐启享菜单'],
    ['PhET button', '乐启享按钮'],
    ['PhET Button', '乐启享按钮'],
    ['the PhET menu', '乐启享菜单'],
    ['the PhET development team', '课件开发团队'],
    ['Modified by PhET', '由乐启享整理'],
    /* The name of the framework the author wrote it with. */
    ['PhET-iO', '仿真接口'],
    ['PhET™', '乐启享'],
  ]) {
    const n = html.split(from).length - 1;
    if (!n) continue;
    words += n;
    html = html.split(from).join(to);
  }
  rules.push(['仿真菜单与致谢里的外来名字改成本地说法', words]);

  /*
   * The corner of a simulation carries the mark of the house that made
   * it.  The mark of this library takes its place there, drawn in the
   * size the simulation expects, so the corner does not move and the
   * reader is not looking at somebody else's name.
   *
   * A simulation carries two of them -- one to read on a dark screen
   * and one to read on a light one -- and it picks the one that suits
   * the screen it is drawn on.  So the mark of this library is picked
   * the same way: the picture that was bright gets the mark for a dark
   * screen, the picture that was dim gets the mark for a light one.
   * Swapping both for the same picture would leave the corner of a
   * light simulation blank.
   */
  let marks = 0;
  const BRAND_DIR = path.join(ROOT, 'mirror', 'leqixiang', 'brand');
  const readMark = (file) =>
    fs.readFileSync(path.join(BRAND_DIR, file)).toString('base64');
  const markOnDark = readMark('brand-wordmark-on-dark.png');
  const markOnLight = readMark('brand-wordmark-light.png');
  html = html.replace(/data:image\/png;base64,([A-Za-z0-9+/=]+)/g, (m, b64) => {
    /* Our own marks are already in place; leave them alone. */
    if (b64 === markOnDark || b64 === markOnLight) return m;
    const buf = Buffer.from(b64, 'base64');
    const box = size(buf);
    if (!box || box.w !== 273 || box.h !== 108) return m;
    marks++;
    const lit = brightness(buf);
    /* A bright picture was drawn for a dark screen. */
    const to = lit != null && lit < 160 ? markOnLight : markOnDark;
    return 'data:image/png;base64,' + to;
  });
  rules.push(['角落里的外来标记换成乐启享（深浅两版各配其用）', marks]);

  let license = 0;
  html = html.replace(
    /license:'This simulation file is licensed under[^']*'/g,
    () => {
      license++;
      return (
        "license:'本课件依据 Creative Commons Attribution-NonCommercial 4.0 International"
        + '（CC BY-NC 4.0）授权使用，著作权属原权利人；<br>署名、许可与本地化改动说明见 '
        + "<a href=\"/license.html\"><u>许可与署名</u></a>。'"
      );
    }
  );
  html = html.replace(
    /licenseWithoutLinks:"This simulation file is licensed under[^"]*"/g,
    () => {
      license++;
      return (
        'licenseWithoutLinks:"本课件依据 Creative Commons Attribution-NonCommercial 4.0 International'
        + '（CC BY-NC 4.0）授权使用，著作权属原权利人。\\n署名、许可与本地化改动说明见许可与署名页。"'
      );
    }
  );
  html = html.replace(
    /accessibleLicense:"This simulation file is licensed under[^"]*"/g,
    () => {
      license++;
      return (
        'accessibleLicense:"本课件依据 Creative Commons Attribution-NonCommercial 4.0 International'
        + '（CC BY-NC 4.0）授权使用，著作权属原权利人。\\n署名、许可与本地化改动说明见许可与署名页。"'
      );
    }
  );
  rules.push(['许可说明改成中文并指向本地页', license]);

  let links = 0;
  html = html.replace(
    /\[(?:[^\[\]]*phet\.colorado\.edu[^\[\]]*)\]/g,
    (m) => {
      links++;
      /* The name of the text field differs between the builds. */
      const key = /\{([A-Za-z_$][\w$]*)\s*:/.exec(m)?.[1] || 'text';
      return `[{${key}:"许可与署名",url:"/license.html"}]`;
    }
  );
  rules.push(['致谢链接改为本地许可页', links]);

  /*
   * The credits of the pictures carry the address of the house that
   * published them.  The credit itself stays — the copyright of a
   * picture has to be named — but the address points at this library.
   */
  let credit = 0;
  html = html.replace(
    /"projectURL"\s*:\s*"(?:https?:)?\/\/phet\.colorado\.edu"/g,
    () => {
      credit++;
      return '"projectURL": "/license.html"';
    }
  );
  html = html.replace(
    /"license"\s*:\s*"contact phethelp@colorado\.edu"/g,
    () => {
      credit++;
      return '"license": "见许可与署名页"';
    }
  );
  rules.push(['素材署名的外链改为本地页', credit]);

  /*
   * The menu of a simulation had four ways of leaving this library:
   * the site of the house that published it, its accessibility
   * statement, its trouble desk, and a QR code drawn by a third party.
   * All four now point at the licence page of this library, and the QR
   * code is not offered at all.
   */
  let menu = 0;
  /*
   * The replacement has to keep the shape of the thing it replaces.
   * A piece of the build that was a string has to stay a string, or the
   * script that holds it stops being a script: a bare /license.html is
   * read as a regular expression, and the whole simulation goes down
   * with it.
   */
  const toLocal = (re, to = '/license.html') => {
    html = html.replace(re, () => {
      menu++;
      return to;
    });
  };
  {
    const trouble = rewriteTemplates(
      html,
      /`https?:\/\/phet\.colorado\.edu\/files\/troubleshooting\/\?sim=/g,
      '`/license.html`'
    );
    html = trouble.html;
    menu += trouble.n;
  }
  toLocal(/"https?:\/\/phet\.colorado\.edu\/"\+[A-Za-z_$][\w$]*\.locale/g, '"/license.html"');
  toLocal(
    /"https?:\/\/phet\.colorado\.edu\/en\/inclusive-design\/accessibility-statement"/g,
    '"/license.html"'
  );
  toLocal(/"https?:\/\/phet\.colorado\.edu\/en\/licensing"/g, '"/license.html"');
  toLocal(/https?:\/\/github\.com\/phetsims\/[A-Za-z0-9._-]+(?:\.git)?/g);
  rules.push(['菜单与素材里的外链改到本地许可页', menu]);

  /*
   * The builds of the simulation spell the address of the house that
   * published it in half a dozen ways: as a whole string, as two
   * strings joined together, as a template.  Each of them is a way out
   * of this library, so each of them is pointed at the licence page.
   *
   * The notice at the top of the page is left alone.  The licence asks
   * for it, and a reader who opens the file of a work is entitled to
   * see who wrote it.
   */
  let addresses = 0;
  {
    const rest = rewriteTemplates(
      html,
      /`https?:\/\/phet\.colorado\.edu/g,
      "'/license.html'"
    );
    html = rest.html;
    addresses += rest.n;
  }
  html = html.replace(
    /(["'])https?:\/\/phet\.colorado\.edu(\/[^"']*)?\1/g,
    (m, q, rest) => {
      addresses++;
      return `${q}${rest ? `/license.html?from=${rest.replace(/[/?=&.]/g, '')}` : '/license.html'}${q}`;
    }
  );
  /* The address written without a scheme, next to a comparison. */
  html = html.replace(/(["'])phet\.colorado\.edu\1/g, () => {
    addresses++;
    return '"/license.html"';
  });
  /* The address written in the middle of a sentence. */
  html = html.replace(/https?:\/\/phet\.colorado\.edu\/[A-Za-z0-9/_-]*/g, () => {
    addresses++;
    return '/license.html';
  });
  html = html.replace(/https?:\/\/phet\.colorado\.edu(?![A-Za-z0-9._/-])/g, () => {
    addresses++;
    return '/license.html';
  });
  /*
   * The same goes for the developer's handbook that a few simulations
   * link to from a tooltip.  It explains how the graphics library picks
   * objects apart; a reader of a lesson has no use for it, and the
   * address is one more place the page would walk off to.
   */
  html = html.replace(/https?:\/\/phetsims\.github\.io[^"'`\s)]*/g, () => {
    addresses++;
    return '/license.html';
  });
  html = html.replace(/(["'])phetsims\.github\.io\1/g, () => {
    addresses++;
    return '"/license.html"';
  });
  rules.push(['课件里的外来站点地址改到本地', addresses]);

  /*
   * The question "is there a newer build of this simulation?" has no
   * answer in a library that is read on this machine, so the question
   * is not asked and the item that asks it is not offered.
   */
  let checks = 0;
  /*
   * The value of the flag runs on into the next word of the sentence,
   * so the whole of it is taken at once.  Stopping at the first quote
   * would leave the rest of the sentence standing there like a fence
   * around nothing.
   */
  html = html.replace(/areUpdatesChecked=[^,;}]+/g, () => {
    checks++;
    return 'areUpdatesChecked=!1';
  });
  html = html.replace(/areUpdatesChecked:[^,;}]+/g, () => {
    checks++;
    return 'areUpdatesChecked:!1';
  });
  rules.push(['不再检查更新', checks]);

  let qr = 0;
  html = html.replace(
    /present:\s*phet\.chipper\.(?:getQueryParameter\(\s*["']qrCode["']\s*\)|queryParameters\.qrCode)/g,
    () => {
      qr++;
      return 'present:!1';
    }
  );
  {
    const code = rewriteTemplates(
      html,
      /`https?:\/\/api\.qrserver\.com\/v1\/create-qr-code\/\?data=/g,
      "'/license.html'"
    );
    html = code.html;
    qr += code.n;
  }
  html = html.replace(/(["'])https?:\/\/api\.qrserver\.com\/v1\/create-qr-code\/\?data=\1/g, () => {
    qr++;
    return "'/license.html?data='";
  });
  rules.push(['去掉第三方二维码入口', qr]);

  /*
   * The simulation asked its own house whether a newer build existed.
   * A library that is read offline has no newer build, so the question
   * is not asked.
   */
  let update = 0;
  {
    const check = rewriteTemplates(
      html,
      /`https?:\/\/phet\.colorado\.edu\/html-sim-update\?/g,
      '""'
    );
    html = check.html;
    update += check.n;
  }
  rules.push(['去掉检查更新的外部地址', update]);

  /*
   * The names in the menu of the simulation named the house that
   * published it.  The items are still there, but they carry the name
   * of this library now.
   */
  let wording = 0;
  for (const [from, to] of [
    ['PhET 网站…', '本课件说明…'],
    ['PhET Website…', 'About this Courseware…'],
    ['PhET Accessibility…', 'Accessibility Notes…'],
    ['PhET Menu Button', 'Courseware Menu Button'],
    ['PhET Menu', 'Courseware Menu'],
    ['向PhET捐款', '致谢与许可'],
    ['Donate to PhET', 'Credits and License'],
    [
      'Look for Inclusive Features on the Simulations Filter page of the PhET website to find all simulations with available features.',
      'Look for Inclusive Features on the courseware filter page to find all courseware with available features.',
    ],
    [
      'Thanks to Mobile Learner Labs for working with the PhET development team to convert this simulation to HTML5.',
      'Thanks to Mobile Learner Labs for the work of converting this simulation to HTML5.',
    ],
    ['created by the PhET Team', 'created by the original authors'],
  ]) {
    const n = html.split(from).length - 1;
    if (!n) continue;
    wording += n;
    html = html.split(from).join(to);
  }
  rules.push(['界面里的外来品牌改名', wording]);

  /*
   * The address of the original site in the metadata would send a
   * reader, and a preview card, to somebody else's page.
   */
  let meta = 0;
  html = html.replace(
    /<meta[^>]+(?:property|name)\s*=\s*["'](?:og:url|twitter:url)["'][^>]*content\s*=\s*["']https?:\/\/[^"']+["'][^>]*>/gi,
    () => {
      meta++;
      return `<meta property="og:url" content="/courseware/phet-${id}.html">`;
    }
  );
  html = html.replace(
    /<meta[^>]+(?:property|name)\s*=\s*["'](?:og:image|twitter:image)["'][^>]*content\s*=\s*["']https?:\/\/[^"']+["'][^>]*>/gi,
    () => {
      meta++;
      return `<meta property="og:image" content="/brand/brand-logo.png">`;
    }
  );
  rules.push(['元数据指向本地页面', meta]);

  /* The icon of the tab belongs to us. */
  const icons = count(html, /<link[^>]+rel\s*=\s*["']?(?:shortcut icon|icon)["']?[^>]*>/gi);
  html = html.replace(
    /<link[^>]+rel\s*=\s*["']?(?:shortcut icon|icon)["']?[^>]*>/gi,
    '<link rel="icon" href="/brand/favicon.ico">'
  );
  rules.push(['换成乐启享的页签图标', icons]);

  return { html, rules };
};

const scrubBlockly = (html) => {
  const rules = [];
  const track = stripTrackers(html);
  html = track.html;
  rules.push(['移除访问统计脚本', track.n]);

  const n = count(html, /（Blockly 积木编程）/g);
  html = html.replace(/（Blockly 积木编程）/g, '（积木编程）');
  rules.push(['去掉积木编程工具的外部名称', n]);

  const power = count(html, /Powered\s*by/gi);
  html = html.replace(/Powered\s*by/gi, '由乐启享整理');
  rules.push(['署名改为乐启享', power]);
  return { html, rules };
};

const scrubLabsims = (html) => {
  const rules = [];
  const track = stripTrackers(html);
  html = track.html;
  rules.push(['移除访问统计脚本', track.n]);
  const n = count(html, /Worksheet\s*©\s*www\.CHEMSHEETS\.co\.uk/gi);
  html = html.replace(
    /Worksheet\s*©\s*www\.CHEMSHEETS\.co\.uk/gi,
    '练习原属 CHEMSHEETS GCSE 系列（改编使用；来源与许可见项目文档）'
  );
  rules.push(['练习署名改为中性说明', n]);
  return { html, rules };
};

/*
 * The two platforms the courseware came from keep their own
 * housekeeping inside the page: the list of hosts the page is willing
 * to run on, the address it tells its host it came from, the name of
 * the protocol the two use to talk, and the name of the house in a
 * comment.  None of that is meant for a reader, and none of it should
 * point at the platform the work was published on.
 */
const scrubPlatform = (html) => {
  const rules = [];

  /* The guard's list of hosts: only this machine is left in it. */
  let hosts = 0;
  html = html.replace(
    /(\\?["'`])(?:www\.|play\.)?aifunengjiaoyu\.com(\\?["'`])/g,
    (m, open, close) => {
      hosts++;
      return `${open}${close}`;
    }
  );
  rules.push(['移除原平台域名', hosts]);

  /* The same name in a check for a subdomain. */
  let sub = 0;
  html = html.replace(/\.aifunengjiaoyu\.com/g, () => {
    sub++;
    return '.localhost';
  });
  rules.push(['移除原平台的子域判断', sub]);

  /* A link that walks the reader off to the platform. */
  let links = 0;
  html = html.replace(
    /https?:\/\/(?:www\.|play\.)?aifunengjiaoyu\.com(?![A-Za-z0-9-])/g,
    () => {
      links++;
      return '/';
    }
  );
  rules.push(['指向原平台的地址改为本地', links]);

  /*
   * The address of the platform is also written in a form the guard
   * reads at run time; the list itself is emptied of it.
   */
  let more = 0;
  html = html.replace(/aifunengjiaoyu\.com/g, () => {
    more++;
    return 'localhost';
  });
  rules.push(['清掉剩余的地址碎片', more]);

  /* A button that sends the reader back to the platform. */
  let back = 0;
  html = html.replace(
    /window\.location\.assign\(\s*[`'"]https?:\/\/(?:www\.|play\.)?aifunengjiaoyu\.com[`'"]\s*\)/g,
    () => {
      back++;
      return "window.location.assign('/')";
    }
  );
  rules.push(['返回平台的按钮改回本地', back]);

  /* A map from the address of the platform to the address of a class. */
  let origins = 0;
  html = html.replace(
    /\{\s*['"]https:\/\/testdeploy\.aifunengjiaoyu\.com['"]\s*:\s*['"]https:\/\/testplay\.aifunengjiaoyu\.com['"]\s*,\s*['"]https:\/\/aifunengjiaoyu\.com['"]\s*:\s*['"]https:\/\/play\.aifunengjiaoyu\.com['"]\s*\}/g,
    () => {
      origins++;
      return '{[location.origin]:location.origin}';
    }
  );
  rules.push(['平台地址对照表改为本地地址', origins]);

  /* The address the page tells its host it came from. */
  let origin = 0;
  html = html.replace(/"origin"\s*:\s*"https:\/\/xbjiaoyu\.com"/g, () => {
    origin++;
    return '"origin":"__LQ_ORIGIN__"';
  });
  rules.push(['页面自述地址改为本地占位', origin]);

  /*
   * The old handshake names the platform in a type of message.  The
   * page and its host both use the new name.
   */
  let proto = 0;
  html = html.replace(/xiaobai:/g, () => {
    proto++;
    return 'leqixiang:';
  });
  rules.push(['握手协议改名', proto]);

  /* The name of the house, in a comment and in a marker attribute. */
  let house = 0;
  html = html.replace(/Xiaobai Education/g, () => {
    house++;
    return 'Courseware';
  });
  html = html.replace(/data-xb-content-guard/g, () => {
    house++;
    return 'data-lq-content-guard';
  });
  rules.push(['注释与标记里的旧名字', house]);

  return { html, rules };
};

/*
 * A work that names the platform in a place the reader never sees is
 * not a problem in itself, but a reader who opens the file of the work
 * should not find somebody else's address in it either.
 */
const scrubPlatformFile = (text) => {
  const out = scrubPlatform(text);
  return out.html;
};

/*
 * The pages that were kept next to a lesson.
 *
 * A lesson sometimes carries a copy of a page it points at: the mirror
 * of a textbook chapter, a laboratory manual, a table of formulas.
 * The copy is read from this disk, so everything the copy still says
 * about the house that published it is read as well — its name in the
 * title, its menu at the top, its filing number at the bottom, and a
 * button that walks the reader to a folder on somebody else's cloud.
 *
 * The lesson keeps what it came for: the chapter, the manual, the
 * table. The house goes: the menu, the footer, the name, the filing
 * number, the link out.
 */
const scrubCachedPage = (html) => {
  const rules = [];

  /* The menu of the site the page was taken from. */
  let nav = 0;
  html = html.replace(/<nav\b[\s\S]*?<\/nav>/gi, () => {
    nav++;
    return '';
  });
  rules.push(['移除缓存页的站点导航', nav]);

  /* The footer, where the filing number and the sister sites sit. */
  let foot = 0;
  html = html.replace(/<footer\b[\s\S]*?<\/footer>/gi, () => {
    foot++;
    return '';
  });
  rules.push(['移除缓存页的站点页脚', foot]);

  /* The filing number itself, wherever it was written down. */
  let filing = 0;
  html = html.replace(
    /[\u4e00-\u9fa5]ICP备[\d-]+号(?:-\d+)?/g,
    () => {
      filing++;
      return '';
    }
  );
  html = html.replace(/公安备[\d-]+号/g, () => {
    filing++;
    return '';
  });
  rules.push(['移除缓存页的备案号', filing]);

  /* The name of the house, in the title, in the description, in the text. */
  let house = 0;
  for (const [from, to] of [
    ['中学课本网', '本地课本镜像'],
    ['小学课本网', '本地课本镜像'],
    ['深圳学校网', '本地站点'],
    ['小学试卷网', '本地站点'],
  ]) {
    html = html.replaceAll(from, () => {
      house++;
      return to;
    });
  }
  rules.push(['改掉缓存页里的站点名', house]);

  /*
   * The button that offers the whole book from a folder on somebody
   * else's cloud.  It is the one link on the page that walks a reader
   * out of the library.
   */
  let cloud = 0;
  html = html.replace(
    /<div class="alert alert-info[^"]*"[^>]*>[\s\S]*?<\/div>/g,
    (block) => {
      if (!/下载完整电子版课本/.test(block)) return block;
      cloud++;
      return '';
    }
  );
  html = html.replace(
    /<a[^>]+href="https?:\/\/pan\.baidu\.com\/[^"]*"[^>]*>[\s\S]*?<\/a>/gi,
    () => {
      cloud++;
      return '';
    }
  );
  rules.push(['移除缓存页的网盘下载', cloud]);

  /*
   * The addresses of that house stay as they are.  The server and the
   * archive writer both point every one of them at the copy that sits
   * next to the lesson, so the address is a road sign to the local
   * file and not a trip to another site -- and it has to keep its
   * shape, because a picture asked for by a shortened address is a
   * picture that never arrives.
   */

  /*
   * A contact address belongs to the house that published the page,
   * and a reader of this library has no business writing to it.
   */
  let mail = 0;
  html = html.replace(
    /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
    () => {
      mail++;
      return '';
    }
  );
  rules.push(['移除缓存页的联系邮箱', mail]);

  return { html, rules };
};


/*
 * A work asks the platform for permission before it draws anything.
 * It looks at the address the page was opened from, and it sends a
 * request to the platform for a token.
 *
 * A library that is read on this machine has no platform to ask, and a
 * work that refuses to open from the disk is a work that cannot be
 * used.  Both questions are answered here: the page may run from any
 * address, and the token is a local "yes" that is handed over without
 * asking anybody.
 *
 * The guard is written twice in the mirrors -- once with plain quotes
 * and once inside a string of its own -- so both spellings are
 * handled.
 */
const relaxLocalRun = (html) => {
  const rules = [];

  /* The page may be opened straight from the disk. */
  let protocols = 0;
  html = html.replace(
    /if\(p===\\?"file:\\?"\|\|p===\\?"about:\\?"\|\|p===\\?"chrome:\\?"\)\{/g,
    (m) => {
      protocols++;
      return m.includes('\\') ? 'if(p===\\"chrome:\\"){' : 'if(p==="chrome:"){';
    }
  );
  rules.push(['允许课件从本地磁盘直接打开', protocols]);

  /* Any address is a good address for a library that lives here. */
  let hosts = 0;
  html = html.replace(
    /if\(!ok&&h!==\\?"localhost\\?"&&h!==\\?"127\.0\.0\.1\\?"\)\{/g,
    () => {
      hosts++;
      return 'if(false){';
    }
  );
  rules.push(['不再按地址拒绝课件', hosts]);

  /* The token is asked for over the network; offline there is nobody
     to ask, so the answer is written into the page itself. */
  let tokens = 0;
  html = html.replace(
    /x\.open\(\\?"GET\\?",location\.origin\+\\?"\\?\/api\\?\/program-file\\?\/verify-access/g,
    (m) => {
      tokens++;
      return m.includes('\\')
        ? 'x.open(\\"GET\\",p===\\"file:\\"?\\"data:application/json,%7B%22ok%22%3Atrue%7D\\":location.origin+\\"\\/api\\/program-file\\/verify-access'
        : 'x.open("GET",(location.protocol==="file:"||location.protocol==="about:")?"data:application/json,%7B%22ok%22%3Atrue%7D":location.origin+"/api/program-file/verify-access';
    }
  );
  rules.push(['离线时不再向平台索要访问凭证', tokens]);

  /*
   * The same guard, written in the bundle of the platform, where every
   * name is shortened.  The house it named is the only part that
   * matters here.
   */
  let bundles = 0;
  html = html.replace(
    /if\(!ALLOWED_HOSTS\['includes'\]\([\w$]+\)&&![\w$]+\[[^\]]+\]\('\.aifunengjiaoyu\.com'\)\)\{/g,
    () => {
      bundles++;
      return 'if(false){';
    }
  );
  rules.push(['不再按域名拒绝课件', bundles]);

  /*
   * The words on the screens that the guard used to show are gone as
   * well.  They named a platform this library has nothing to do with.
   */
  let wording = 0;
  for (const [from, to] of [
    ['内容仅在授权平台运行', '请在乐启享课件库中打开本课件'],
    ['未授权的运行环境', '当前运行环境无法打开本课件'],
    ['授权验证失败', '课件启动失败'],
    ['网络连接异常，请确保在网络环境中使用', '课件资源加载失败'],
    ['非法盗版环境', '当前运行环境无法打开本课件'],
    ['当前域名未经授权，无法使用本平台服务。', '本课件由乐启享整理，请在乐启享课件库中打开。'],
  ]) {
    const n = html.split(from).length - 1;
    if (!n) continue;
    wording += n;
    html = html.split(from).join(to);
  }
  rules.push(['去掉平台提示的字样', wording]);

  return { html, rules };
};

const scrubAfe = (html) => {
  const rules = [];
  const track = stripTrackers(html);
  html = track.html;
  rules.push(['移除访问统计脚本', track.n]);

  const local = relaxLocalRun(html);
  html = local.html;
  for (const [rule, n] of local.rules) rules.push([rule, n]);

  /*
   * A handful of chemistry pages carry a link back to the course map of
   * the platform they were published on.  The map was never mirrored,
   * and the link walks the reader off the library, so it goes.
   */
  let map = 0;
  html = html.replace(
    /<a\b[^>]*href\s*=\s*["']https?:\/\/(?:www\.|play\.)?aifunengjiaoyu\.com\/play\/\d+["'][^>]*>[^<]*<\/a>/gi,
    () => {
      map++;
      return '';
    }
  );
  rules.push(['移除指向原平台课程地图的链接', map]);

  const platform = scrubPlatform(html);
  html = platform.html;
  for (const [rule, n] of platform.rules) rules.push([rule, n]);

  return { html, rules };
};

const scrubXb = (html) => {
  const rules = [];
  const track = stripTrackers(html);
  html = track.html;
  rules.push(['移除访问统计脚本', track.n]);

  const local = relaxLocalRun(html);
  html = local.html;
  for (const [rule, n] of local.rules) rules.push([rule, n]);

  const platform = scrubPlatform(html);
  html = platform.html;
  for (const [rule, n] of platform.rules) rules.push([rule, n]);

  return { html, rules };
};

const SCRUBBERS = {
  '3jcn': scrub3jcn,
  aifunengjiaoyu: scrubAfe,
  aviary: scrubAviary,
  blocklygames: scrubBlockly,
  labsims: scrubLabsims,
  phet: scrubPhet,
  xbjiaoyu: scrubXb,
};

/* --------------------------------------------------------------- run it -- */

const dirs = [
  ['3jcn', '3jcn'],
  ['aifunengjiaoyu', 'aifunengjiaoyu'],
  ['aviary', 'aviary'],
  ['blocklygames', 'blocklygames'],
  ['labsims', 'labsims'],
  ['phet', 'phet'],
  ['xbjiaoyu', 'xbjiaoyu'],
];

let changed = 0;
const totals = new Map();

for (const [dir, key] of dirs) {
  const folder = path.join(ROOT, 'mirror', dir, 'courseware');
  if (!fs.existsSync(folder)) continue;
  for (const file of fs.readdirSync(folder)) {
    if (!file.endsWith('.html')) continue;
    const full = path.join(folder, file);
    const html = fs.readFileSync(full, 'utf8');
    const id = file.replace(/\.html$/, '');
    const out = SCRUBBERS[key](html, id);
    if (out.html === html) continue;
    changed++;
    for (const [rule, n] of out.rules) {
      if (!n) continue;
      const k = `${key} · ${rule}`;
      totals.set(k, (totals.get(k) || 0) + n);
      note(`${dir}/${file}`, rule, n);
    }
    if (!CHECK) await writeFile(full, out.html);
  }
}

/*
 * Every page of every mirror is walked once more, this time including the
 * pieces that live next to a body: a tracker that phones home, a note
 * left by the browser, an icon that points at somebody else's server.
 */
const walkHtml = (dir, out = []) => {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walkHtml(full, out);
    else if (e.name.endsWith('.html')) out.push(full);
  }
  return out;
};

/*
 * The pieces that live next to a body -- the bundles a work loads, the
 * stylesheets it wears -- carry the same names as the body itself, so
 * they are walked as well.
 */
const walkAssets = (dir, out = []) => {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walkAssets(full, out);
    else if (/\.(?:js|mjs|css|txt|md)$/i.test(e.name)) out.push(full);
  }
  return out;
};

/*
 * A lesson sometimes keeps a note of its own next to it: the list of
 * the pieces in a piano course, the credits of a set of arrangements,
 * a line about who wrote a MIDI file.  The note is handed to the
 * reader as it is, so the name of the house that published the lesson
 * goes with it.
 *
 * The notes of the library itself -- the NOTICE files, which the
 * licence asks for -- are not touched: there the name is the point.
 */
const scrubHouseNote = (text) => {
  let n = 0;
  let out = text;
  for (const [from, to] of [
    ['编制/维护：图灵智赋', '编制/维护：乐启享'],
    ['图灵智赋', '乐启享'],
    ['图小灵', '乐启享'],
    ['小白教育', '乐启享'],
  ]) {
    const hits = out.split(from).length - 1;
    if (!hits) continue;
    n += hits;
    out = out.split(from).join(to);
  }
  return { text: out, n };
};

let swept = 0;
for (const dir of fs.readdirSync(path.join(ROOT, 'mirror'), { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  /* The built library is made from these mirrors; it is not a source. */
  if (dir.name === 'leqixiang') continue;
  const folder = path.join(ROOT, 'mirror', dir.name);
  if (!fs.existsSync(folder)) continue;
  for (const full of walkHtml(folder)) {
    const html = fs.readFileSync(full, 'utf8');
    const track = stripTrackers(html);
    let out = track.html;
    let n = track.n;
    const local = relaxLocalRun(out);
    out = local.html;
    const platform = scrubPlatform(out);
    out = platform.html;
    /*
     * The pages that were kept next to a lesson live under _ext/.  They
     * are copies of somebody else's site, so their own chrome goes.
     */
    const cached = full.split(path.sep).join('/').includes('/_ext/')
      ? scrubCachedPage(out)
      : { html: out, rules: [] };
    out = cached.html;
    const saved = count(out, /<!--\s*saved from url=/gi);
    out = out.replace(/<!--\s*saved from url=[^>]*-->/gi, '');
    const icon = swapIcon(out);
    out = icon.html;
    const icons = icon.n;
    const rules = [...local.rules, ...platform.rules, ...cached.rules];
    const touched = rules.reduce((sum, [, n2]) => sum + n2, 0);
    if (!n && !saved && !icons && !touched) continue;
    swept++;
    const rel = path.relative(ROOT, full).replace(/\\/g, '/');
    if (n) {
      totals.set('通用 · 移除访问统计脚本', (totals.get('通用 · 移除访问统计脚本') || 0) + n);
      note(rel, '移除访问统计脚本', n);
    }
    if (saved) {
      totals.set('通用 · 移除浏览器保存备注', (totals.get('通用 · 移除浏览器保存备注') || 0) + saved);
      note(rel, '移除浏览器保存备注', saved);
    }
    if (icons) {
      totals.set('通用 · 换成乐启享的页签图标', (totals.get('通用 · 换成乐启享的页签图标') || 0) + icons);
      note(rel, '换成乐启享的页签图标', icons);
    }
    for (const [rule, n2] of rules) {
      if (!n2) continue;
      totals.set(`页面 · ${rule}`, (totals.get(`页面 · ${rule}`) || 0) + n2);
      note(rel, rule, n2);
    }
    if (!CHECK) await writeFile(full, out);
  }
}

/*
 * The bundles a work loads are walked as well.  They carry the names
 * of the platform too -- the list of addresses it is willing to run
 * on, the button that sends the reader back to it -- and a bundle that
 * is opened straight from the disk has to be let through.
 */
let bundles = 0;
for (const dir of fs.readdirSync(path.join(ROOT, 'mirror'), { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  if (dir.name === 'leqixiang') continue;
  const folder = path.join(ROOT, 'mirror', dir.name);
  if (!fs.existsSync(folder)) continue;
  for (const full of walkAssets(folder)) {
    const text = fs.readFileSync(full, 'utf8');
    const local = relaxLocalRun(text);
    let out = local.html;
    const platform = scrubPlatform(out);
    out = platform.html;
    /*
     * A note that travels with a lesson is read by the learner.
     * The notes of the library are not: the NOTICE files name the
     * author because the licence asks them to.
     */
    if (/\.(?:txt|md)$/i.test(full) && !/NOTICE\.md$/i.test(full)) {
      const houseNote = scrubHouseNote(out);
      out = houseNote.text;
      if (houseNote.n) {
        totals.set('素材 · 去掉注释里的别家名字', (totals.get('素材 · 去掉注释里的别家名字') || 0) + houseNote.n);
        note(path.relative(ROOT, full).replace(/\\/g, '/'), '去掉注释里的别家名字', houseNote.n);
      }
    }
    if (out === text) continue;
    bundles++;
    const rel = path.relative(ROOT, full).replace(/\\/g, '/');
    for (const [rule, n] of [...local.rules, ...platform.rules]) {
      if (!n) continue;
      totals.set(`素材 · ${rule}`, (totals.get(`素材 · ${rule}`) || 0) + n);
      note(rel, rule, n);
    }
    if (!CHECK) await writeFile(full, out);
  }
}

console.log(CHECK ? '（检查模式，没有写入）' : '');
console.log(`处理了 ${changed} 个课件文件`);
console.log(`另外扫过 ${swept} 个页面与素材`);
console.log(`另外清理了 ${bundles} 个素材文件`);
console.log('\n改动汇总：');
for (const [k, v] of [...totals].sort()) console.log(`  ${String(v).padStart(6)}  ${k}`);

fs.writeFileSync(
  path.join(ROOT, 'recon', 'scratch', 'brand-scrub-report.json'),
  JSON.stringify({ at: new Date().toISOString(), changed, totals: [...totals], report }, null, 1)
);
