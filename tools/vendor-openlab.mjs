#!/usr/bin/env node
/*
 * Add the open interactive physics lessons to the library.
 *
 * The two platforms the library mirrors are both exhausted: every work
 * that is free has been downloaded, and the rest sit behind a paid gate.
 * What is left is to bring in courseware that is openly licensed, so the
 * library can still grow without borrowing anything that is not free.
 *
 * The source is Physics Notebook (https://github.com/CasberryIndia/Physics-Notebook),
 * MIT licensed.  Twenty-two single-page lessons, each with a canvas
 * simulation, a written explanation and its own formula set.
 *
 * What this tool does to every lesson:
 *
 *   - the stylesheet, the script and the fonts travel with the lesson, so
 *     it opens from disk with no network at all
 *   - the upstream name in the title and the navigation becomes 乐启享
 *   - the "ask an AI" row of buttons, the analytics beacon and the
 *     GitHub badge are dropped — the library keeps no third-party calls
 *   - the MathJax bundle stays on its public address, because the local
 *     server already mirrors it and rewrites the address for both the
 *     preview and the download
 *
 *   node tools/vendor-openlab.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'recon', 'vendor', 'Physics-Notebook');
const OUT = path.join(ROOT, 'mirror', 'openlab');
const CW = path.join(OUT, 'courseware');
const LQ = path.join(ROOT, 'mirror', 'leqixiang');
const SHARED = path.join(LQ, '_shared-ext', 'openlab');
const LUCIDE =
  'https://unpkg.com/lucide@0.469.0/dist/umd/lucide.min.js';
const LUCIDE_LOCAL = path.join(
  LQ,
  '_shared-ext',
  'unpkg.com',
  'lucide@0.469.0',
  'dist',
  'umd',
  'lucide.min.js'
);

/* The upstream files use CRLF; the local copy uses LF so that the
   patterns below only have to deal with one line ending. */
const read = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const write = (p, text) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text);
};

/* Every lesson: the Chinese title, the line on the card, the stage and a
   sentence about what the lesson actually shows. */
const LESSONS = [
  ['simple-pendulum', '单摆', '周期运动 · 简谐振动 · 能量守恒', '初中', '拖动摆锤改变摆长与初角，看周期怎么变、能量怎么在动能与势能之间来回搬。'],
  ['simple-oscillations', '简谐振动', '弹簧振子 · 阻尼 · 驱动力', '高中', '给弹簧振子加阻尼和驱动力，看振幅怎么衰减、又怎么被重新撑起来。'],
  ['projectile-motion', '抛体运动', '分解运动 · 射程 · 轨道', '高中', '调初速度与发射角，让抛体落在靶上，顺手验证水平与竖直两路运动互不干扰。'],
  ['work-energy-principle', '功与能原理', '做功 · 动能 · 势能转化', '初中', '推箱子、爬坡、拉弹簧，看外力做的功最后都变成了哪一种能量。'],
  ['conservation-of-energy', '能量守恒', '机械能 · 碰撞 · 能量转化', '高中', '在轨道上放开小车并改变摩擦，看动能与势能如何互换、系统总能量是否守恒。'],
  ['conservation-of-momentum', '动量守恒', '碰撞 · 冲量 · 二维动量', '高中', '对撞小球、斜碰与二维碰撞，逐项核对动量在碰撞前后的分量。'],
  ['newtons-laws-of-motion', '牛顿运动定律', '受力分析 · 合力 · 运动方程', '高中', '给物块加力、调摩擦，逐步读出加速度与运动方程，并画出受力图。'],
  ['orbital-mechanics', '轨道力学', '万有引力 · 轨道形状 · 开普勒定律', '高中', '改中心天体质量与初速度，观察轨道从圆变成椭圆、开普勒三定律逐条对上。'],
  ['gravitational-waves', '引力波', '时空涟漪 · 波源 · 探测', '高中', '让双星系统在屏幕上引力波，画出波前，看它怎样被探测器读出来。'],
  ['rotational-dynamics', '转动动力学', '角动量 · 转动惯量 · 扭矩', '高中', '给飞轮加扭矩，看角速度怎么积累，角动量在碰撞中又怎么交接。'],
  ['wave-equation', '波动方程', '传播 · 叠加 · 色散', '高中', '在绳子上造波、调波长与波速，看波前传播、相加与色散。'],
  ['wave-interference', '波的干涉', '双源干涉 · 驻波 · 相位差', '高中', '两个波源同相与异相各出一次，节线、驻波与相位差一一对应。'],
  ['diffraction', '衍射', '单缝 · 障碍物 · 波长', '高中', '改变缝宽与波长，看影子边缘怎么散开，衍射图样随条件变化。'],
  ['double-slit-experiment', '双缝干涉实验', '干涉条纹 · 波长测量', '高中', '自己调双缝间距与屏距，读出条纹间距，反过来量出光的波长。'],
  ['polarization-of-waves', '波的偏振', '偏振方向 · 马吕斯定律', '高中', '旋转偏振片，让光强按马吕斯定律起伏，并演示偏振方向的变化。'],
  ['electric-fields', '电场', '场强 · 电势 · 电场线', '高中', '移动点电荷与试探电荷，读出场强与电势，画出电场线的走向。'],
  ['magnetic-fields', '磁场', '磁感应强度 · 洛伦兹力 · 磁矩', '高中', '在磁场里放带电粒子，看螺旋轨道与洛伦兹力，转动线圈看磁矩。'],
  ['special-relativity', '狭义相对论', '同时性 · 长度收缩 · 能量', '高中', '让一列飞船掠过站台，比较两边的时钟、尺子和能量算式。'],
  ['chaos-and-nonlinear-dynamics', '混沌与非线性动力学', '相图 · 吸引子 · 蝴蝶效应', '高中', '调节非线性系统的参数，看轨道从规则走向混沌，相图上出现吸引子。'],
  ['lagrangian-hamiltonian-mechanics', '拉格朗日与哈密顿力学', '广义坐标 · 守恒量 · 哈密顿量', '高中', '把系统换成广义坐标，比较拉格朗日量与哈密顿量，找出各自的守恒量。'],
  ['noethers-theorem', '诺特定理', '对称性 · 守恒定律 · 诺特荷', '高中', '从时间与空间平移对称性，直接读出能量与动量为什么守恒。'],
  ['principle-of-least-action', '最小作用量原理', '作用量 · 变分 · 路径', '高中', '让小球在两条候选路径间选择，看看作用量最小的那条究竟长什么样。'],
];

/* Drop a top-level block of the upstream script by its name, together
   with the comment that introduces it. */
function dropBlock(src, name) {
  let start = src.indexOf(`const ${name} = {`);
  if (start < 0) return src;
  /* The comment that introduces the block is only its own when nothing
     but blank space stands between the comment and the declaration. */
  const before = src.slice(0, start);
  const docEnd = before.lastIndexOf('*/');
  if (docEnd >= 0 && /^\s*$/.test(before.slice(docEnd + 2))) {
    const docStart = before.lastIndexOf('/**', docEnd);
    if (docStart >= 0) start = docStart;
  }
  const end = src.indexOf('\n};', start);
  if (end < 0) return src;
  return src.slice(0, start) + src.slice(end + 3);
}

/* The upstream script reaches out to an AI provider, a badge service and
   an analytics beacon.  None of that belongs in a local library. */
/*
 * Remove one method of an object.
 *
 * The method is found by its name and ends at the closing brace that
 * stands at the same depth, so the body of the method is taken away
 * whole and nothing else in the file is touched.
 */
function dropMethod(src, name) {
  /* The head of a method is looked for, not every mention of the name:
     a call such as `this.labelAIButtons();` must not be mistaken for
     the method itself. */
  const head = new RegExp(`\\n\\s*${name}\\s*\\([^)]*\\)\\s*\\{`);
  const m = head.exec(src);
  if (!m) return src;
  const start = m.index;
  const bodyStart = src.indexOf('{', m.index + m[0].length - 1);
  if (bodyStart < 0) return src;
  let depth = 0;
  for (let i = bodyStart; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        /* The comma and the line break that follow the method go too. */
        let end = i + 1;
        if (src[end] === ',') end++;
        if (src[end] === '\n') end++;
        return src.slice(0, start) + src.slice(end);
      }
    }
  }
  return src;
}

function cleanCommonJs(src) {
  let out = src;
  for (const name of ['AIProviderLauncher', 'GitHubStats', 'AILinksManager', 'GoogleAnalytics']) {
    out = dropBlock(out, name);
  }
  /* The icon table only exists to fill the AI buttons. */
  const icons = out.indexOf('const AI_ICONS = {');
  if (icons >= 0) {
    const end = out.indexOf('\n};', icons);
    if (end >= 0) out = out.slice(0, icons) + out.slice(end + 3);
  }
  out = out.replace(/\n\s*AILinksManager\.init\(\);/g, '');
  out = out.replace(/\n\s*GitHubStats\.init\(\);/g, '');
  out = out.replace(/\n\s*GoogleAnalytics\.init\(\);/g, '');
  out = out.replace(/window\.launchAIPrompt\s*=[^;]+;/g, '');
  /* The buttons that asked an AI are gone, so the code that dressed
     them is gone as well. */
  out = dropMethod(out, 'labelAIButtons');
  out = dropMethod(out, 'inferAIButtonLabel');
  out = out.replace(/\n\s*this\.labelAIButtons\(\);/g, '');
  out = out.replace(
    /\n\s*\/\/ Initialize Lucide icons if library is present\n\s*if \(window\.lucide\) \{\n\s*window\.lucide\.createIcons\(\);\n\s*\}/g,
    ''
  );
  /* The rules for the buttons that are gone now.  The selector has to
     stand right in front of the brace, otherwise the rule is a piece
     of script and not a rule of the style sheet. */
  out = out.replace(/\.ai-[a-z-]+\s*\{[^}]*\}/g, '');
  out = out.replace(/\/\* AI Links[^*]*\*\//g, '');
  out = out.replace(/Physics Notebook/g, '乐启享');
  return out;
}

/* The navigation keeps the theme switch and loses the link back to the
   upstream library, which is meaningless here. */
const NAV = [
  '<nav class="sticky">',
  '        <div class="nav-bg"></div>',
  '        <span class="logo">乐启享</span>',
  '        <button id="themeBtn">',
  '            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
  '            Theme',
  '        </button>',
  '    </nav>',
].join('\n');

/* The lesson may not reach out to the network, may not keep the upstream
   name, and may not offer a row of "ask an AI" buttons. */
function cleanLesson(html, lesson) {
  const [slug, title] = lesson;
  const id = `openlab-${slug}`;
  let out = html;

  /* Stylesheet and script travel with the lesson. */
  const commonCss = read(path.join(SRC, 'css', 'common.css'));
  const articleCss = read(path.join(SRC, 'css', 'article.css'));
  const fontUrl = (_match, _quote, file) =>
    `url('/api/program-assets/${id}/_ext/openlab/fonts/${path.basename(file)}')`;
  const css = (commonCss + '\n' + articleCss)
    .replace(/url\((['"]?)(\.\.\/assets\/fonts\/[^'")]+)\1\)/g, fontUrl)
    .replace(/Physics Notebook/g, '乐启享');
  /* A function keeps the replacement literal: a "$" in the upstream code
     would otherwise be read as a pattern. */
  out = out.replace(
    /<link rel="stylesheet" href="\.\.\/css\/common\.css">\s*<link rel="stylesheet" href="\.\.\/css\/article\.css">/,
    () => `<style>\n${css}\n</style>`
  );
  const commonJs = cleanCommonJs(read(path.join(SRC, 'js', 'common.js')));
  out = out.replace(
    /<script src="\.\.\/js\/common\.js"><\/script>/,
    () => `<script>\n${commonJs}\n</script>`
  );

  /* The icon library is pinned to one version and mirrored locally, so a
     lesson that draws an icon of its own still works offline. */
  out = out.replace(
    /<script src="https:\/\/unpkg\.com\/lucide@latest"><\/script>/,
    `<script src="${LUCIDE}"></script>`
  );
  /* The animation library is loaded but never called in these lessons. */
  out = out.replace(/\s*<script src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/gsap[^"]*"><\/script>/g, '');

  /* The row of buttons that opened a third-party chat. */
  out = out.replace(/<div class="ai-links">[\s\S]*?<\/div>/g, '');
  out = out.replace(/<span class="ai-label">[\s\S]*?<\/span>/g, '');
  /* The helper that opened it, and the rules that dressed it. */
  out = out.replace(/\n\s*function openAI\(topic, model\) \{[\s\S]*?\n\s{8}\}/g, '');
  out = out.replace(/\.ai-[a-z-]+\s*\{[^}]*\}/g, '');
  out = out.replace(/\/\* AI Links[^*]*\*\//g, '');

  /* Navigation. */
  out = out.replace(/<nav class="sticky">[\s\S]*?<\/nav>/, NAV);

  /* Name. */
  out = out.replace(/<title>[\s\S]*?<\/title>/, `<title>${title} · 乐启享互动课件</title>`);
  out = out.replace(/Physics Notebook/g, '乐启享');
  out = out.replace(/<html lang="en">/, '<html lang="zh-CN">');

  /* The provenance belongs in the file. */
  const banner = [
    '<!DOCTYPE html>',
    '<!--',
    `  ${title} · 乐启享互动课件`,
    '  来源：Physics Notebook (CasberryIndia/Physics-Notebook)，MIT 许可。',
    '  本地化：样式、脚本与字体随课件一起分发，可完全离线打开；',
    '  名称、导航与第三方按钮已换成乐启享。',
    '-->',
  ].join('\n');
  out = out.replace('<!DOCTYPE html>', banner);

  /*
   * A lesson may run in a frame the browser keeps on a separate origin,
   * or straight from disk, and there the browser refuses to hand out
   * storage.  The theme then simply keeps its default.
   */
  out = out.replace(/\blocalStorage\./g, 'window.lqStore.');
  out = out.replace(/\bsessionStorage\./g, 'window.lqSession.');
  const shim = [
    '<script>',
    '/* The browser may refuse storage in a sandboxed frame or on disk. */',
    "window.lqStore = (() => { try { const k = '__lq_probe'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return localStorage; } catch (e) { return { getItem: () => null, setItem: () => {}, removeItem: () => {} }; } })();",
    "window.lqSession = (() => { try { const k = '__lq_probe'; sessionStorage.setItem(k, '1'); sessionStorage.removeItem(k); return sessionStorage; } catch (e) { return { getItem: () => null, setItem: () => {}, removeItem: () => {} }; } })();",
    '</script>',
  ].join('\n');
  out = out.replace(/<head([^>]*)>/i, (m) => `${m}\n${shim}`);
  return out;
}

if (!fs.existsSync(SRC)) {
  console.error('找不到源目录，请先克隆 Physics-Notebook：');
  console.error('  git clone --depth 1 https://github.com/CasberryIndia/Physics-Notebook.git recon/vendor/Physics-Notebook');
  process.exit(1);
}

/* The fonts are shared by every lesson, so they sit in one place. */
fs.mkdirSync(path.join(SHARED, 'fonts'), { recursive: true });
const fontDir = path.join(SRC, 'assets', 'fonts');
for (const file of fs.readdirSync(fontDir)) {
  if (!/\.woff2$/.test(file)) continue;
  fs.copyFileSync(path.join(fontDir, file), path.join(SHARED, 'fonts', file));
}

/* The icon library, mirrored once. */
if (!fs.existsSync(LUCIDE_LOCAL)) {
  fs.mkdirSync(path.dirname(LUCIDE_LOCAL), { recursive: true });
  const res = await fetch(LUCIDE);
  if (!res.ok) throw new Error(`lucide 镜像失败：${res.status}`);
  fs.writeFileSync(LUCIDE_LOCAL, Buffer.from(await res.arrayBuffer()));
}

fs.rmSync(CW, { recursive: true, force: true });
fs.mkdirSync(CW, { recursive: true });

const catalogue = [];
for (const lesson of LESSONS) {
  const [slug, title, tagline, stage, description] = lesson;
  const src = path.join(SRC, 'Concepts', `${slug}.html`);
  if (!fs.existsSync(src)) {
    console.warn(`跳过 ${slug}：源文件不存在`);
    continue;
  }
  const html = cleanLesson(read(src), lesson);
  write(path.join(CW, `${slug}.html`), html);
  catalogue.push({
    id: `openlab-${slug}`,
    slug,
    title,
    tagline,
    stage,
    description,
    subject: '物理',
    cover: `/brand/openlab/${slug}.svg`,
    source: 'Physics Notebook (MIT)',
    sourceUrl: 'https://github.com/CasberryIndia/Physics-Notebook',
    license: 'MIT',
  });
}

write(path.join(OUT, 'catalog.json'), JSON.stringify(catalogue, null, 2) + '\n');
write(path.join(OUT, 'LICENSE'), read(path.join(SRC, 'LICENSE')).replace(/\r\n/g, '\n'));
write(
  path.join(OUT, 'NOTICE.md'),
  [
    '# 开源互动课件',
    '',
    '本目录收录来自 [Physics Notebook](https://github.com/CasberryIndia/Physics-Notebook)',
    '的交互式物理课件，采用 [MIT 许可](../LICENSE)。',
    '',
    '## 乐启享的改编与再创作',
    '',
    '本目录里的课件由乐启享机器人（[codebn.cn](https://codebn.cn/)）整理、改编并本地化后收录。',
    '乐启享完成的工作有：中文标题与中文说明的撰写、封面截图与品牌接入、',
    '脚本与样式表与字体与模型与贴图的本地化改写、离线打包与本地服务，',
    '以及课件质量的分级筛选（结论见 `mirror/leqixiang/quality-decisions.json`）。',
    '课件本身的著作权仍属于原作者；上游链接、作者署名与许可协议一并保留在下面，',
    '并写进目录条目的 `author` / `license` / `sourceUrl` 字段里。',
    '',
    '本地化处理：',
    '',
    '- 样式、脚本与字体随课件一起分发，课件可以完全离线打开',
    '- 标题与导航换成乐启享，原站的"问 AI"按钮、统计代码与徽章接口全部移除',
    '- MathJax 仍从公共地址取用，本地服务器与下载包都会把它改写成本地副本',
    '',
    '原始作者与版权声明保留在 `LICENSE` 与每份课件的头部注释里。',
    '',
  ].join('\n')
);

console.log(`开源课件已落地：${catalogue.length} 门`);
console.log('  课件正文: mirror/openlab/courseware/');
console.log('  共享字体: mirror/leqixiang/_shared-ext/openlab/fonts/');
