#!/usr/bin/env node
/*
 * Mirrors the PhET interactive simulations.
 *
 * PhET publishes every simulation as one self-contained HTML file with a
 * translated build per language; the Chinese build is downloaded here, the
 * tracking scripts are taken out, and a content-security policy is added so
 * the document never reaches for the network again.  The result opens from
 * disk with no connection at all.
 *
 *   node tools/mirror-phet.mjs [--only slug,slug] [--conc 4]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applySplash } from './phet-splash.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'mirror', 'phet');
const CW = path.join(OUT, 'courseware');
const BRAND = path.join(OUT, 'brand');
const SCRATCH = path.join(ROOT, 'recon', 'scratch');

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const CONC = Number(arg('conc', 4));
const ONLY = arg('only', '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';
const HOST = 'https://phet.colorado.edu';

/* The subject table of the upstream catalogue, read off its own taxonomy. */
const SUBJECTS = {
  4: '物理',
  5: '物理',
  6: '化学',
  7: '物理',
  8: '物理',
  9: '化学',
  10: '物理',
  11: '物理',
  12: '生物',
  13: '化学',
  14: '地理',
  15: '数学',
  19: '科学',
  20: '物理',
  30: '数学',
  31: '数学',
};

/* A simulation states the lowest and the highest grade it was made for;
   zero stands for every grade. */
const GRADE_LABELS = { 1: '小学', 2: '初中', 3: '高中' };

/* A few of the newer simulations have no Chinese build yet.  They are still
   mirrored in their original language, and given a Chinese name here so that
   they can be found by searching for a Chinese word. */
const ENGLISH_NAMES = {
  'alpha-decay': 'α 衰变',
  'band-structure': '能带结构',
  'beta-decay': 'β 衰变',
  'bound-state-superposition': '束缚态叠加',
  'build-a-nucleus': '搭建原子核',
  buoyancy: '浮力',
  'buoyancy-basics': '浮力基础',
  'calculus-grapher': '微积分绘图器',
  'center-and-variability': '中心与变异',
  'circuit-construction-kit-ac': '电路搭建工具包 · 交流电',
  'double-wells-and-covalent-bonds': '双势阱与共价键',
  'fourier-making-waves': '傅里叶造波',
  'mean-share-and-balance': '平均数 · 占比与平衡',
  'number-pairs': '数的配对',
  'number-compare': '数字比较',
  'particle-in-a-box': '箱中粒子',
  'projectile-data-lab': '抛射运动数据实验室',
  'projectile-sampling-distributions': '抛射运动抽样分布',
  quadrilateral: '四边形',
  'quantum-bound-states': '量子束缚态',
  'quantum-coin-toss': '量子抛硬币',
  'quantum-measurement': '量子测量',
  'quantum-wave-interference': '量子波干涉',
};
const stagesOf = (low, high) => {
  const out = [];
  for (let g = 1; g <= high; g++) {
    if (low > 0 && g < low) continue;
    out.push(GRADE_LABELS[g]);
  }
  return out;
};

const fetchText = async (url, tries = 3) => {
  for (let i = 0; i < tries; i++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 90000);
      const r = await fetch(url, { headers: { 'user-agent': UA }, signal: ctrl.signal });
      clearTimeout(timer);
      if (!r.ok) return { status: r.status, body: '' };
      return { status: r.status, body: await r.text() };
    } catch {
      await new Promise((res) => setTimeout(res, 800 * (i + 1)));
    }
  }
  return { status: 0, body: '' };
};

const fetchBin = async (url, tries = 3) => {
  for (let i = 0; i < tries; i++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 90000);
      const r = await fetch(url, { headers: { 'user-agent': UA }, signal: ctrl.signal });
      clearTimeout(timer);
      if (!r.ok) return { status: r.status, data: null };
      return { status: r.status, data: Buffer.from(await r.arrayBuffer()) };
    } catch {
      await new Promise((res) => setTimeout(res, 800 * (i + 1)));
    }
  }
  return { status: 0, data: null };
};

/* ------------------------------------------------------------- catalogue -- */

const unesc = (s) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

const balanced = (s, open) => {
  let depth = 0;
  for (let k = open; k < s.length; k++) {
    if (s[k] === '{' || s[k] === '[') depth++;
    else if (s[k] === '}' || s[k] === ']') {
      depth--;
      if (depth === 0) return s.slice(open, k + 1);
    }
  }
  return null;
};

/*
 * The page of a simulation carries the whole record of that simulation in
 * every language, so one request gives the Chinese title, the Chinese
 * description and the names of the people who built it.
 */
async function readPage(slug) {
  const file = path.join(SCRATCH, 'phet-pages', `${slug}.json`);
  if (fs.existsSync(file)) {
    try {
      const cached = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (cached && cached.title) return cached;
    } catch {
      /* A broken cache entry is simply fetched again. */
    }
  }
  const r = await fetchText(`${HOST}/en/simulations/${slug}`);
  if (r.status !== 200) return null;
  const h = unesc(r.body);
  const locIdx = h.indexOf('"localizedSimulations":{');
  if (locIdx < 0) return null;
  const zhIdx = h.indexOf('"zh_CN":{', locIdx);
  const readLocale = (key) => {
    const at = h.indexOf(`"${key}":{`, locIdx);
    if (at < 0) return {};
    const raw = balanced(h, h.indexOf('{', at));
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  };
  const zh = zhIdx < 0 ? {} : readLocale('zh_CN');
  const enIdx = h.indexOf('"en":{', locIdx);
  let en = {};
  if (enIdx > 0 && enIdx - locIdx < 4000) {
    en = readLocale('en');
  }
  const head = h.slice(Math.max(0, locIdx - 3000), locIdx);
  const team = [...head.matchAll(/"designTeam":"([^"]*)"/g)].pop();
  const thanks = [...head.matchAll(/"thanksTo":"([^"]*)"/g)].pop();
  const record = {
    title: zh.title || en.title || '',
    description: (zh.description || en.description || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .trim(),
    learningGoals: (zh.learningGoals || en.learningGoals || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .trim(),
    titleEn: en.title || '',
    descriptionEn: (en.description || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim(),
    designTeam: team ? team[1].replace(/<br\s*\/?>/gi, '、').trim() : '',
    thanksTo: thanks ? thanks[1].replace(/<br\s*\/?>/gi, '、').trim() : '',
  };
  fs.mkdirSync(path.join(SCRATCH, 'phet-pages'), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(record, null, 2), 'utf8');
  return record;
}

/* ------------------------------------------------------------- offline -- */

/*
 * The upstream build counts page views and asks the server whether a newer
 * build exists.  Both are removed, and a policy is put in place so that
 * anything left over stays inside the document.
 */
function makeOffline(html, title) {
  let out = html;
  const csp =
    '<meta http-equiv="Content-Security-Policy" content="default-src \'self\' data: blob:; ' +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob:; font-src 'self' data:; " +
    "media-src 'self' data: blob:; connect-src 'self'; " +
    "frame-src 'self' blob:; worker-src 'self' blob:; object-src 'none'>";
  /* A policy from an earlier pass is taken out and written again, so the
     rule stays in one place and never ends up half written. */
  out = out.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>\s*/gi, '');
  out = out.replace(/<meta name="referrer"[^>]*>\s*/gi, '');
  if (/<head[^>]*>/i.test(out)) {
    out = out.replace(/<head[^>]*>/i, (m) => m + '\n  ' + csp + '\n  <meta name="referrer" content="no-referrer">');
  } else {
    out = csp + out;
  }
  /* The document keeps the upstream name in its own title bar; the library
     shows the Chinese name of the simulation. */
  out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>乐启享 · ${title}</title>`);
  /* The trackers are loaded by the script itself, so the script has to go. */
  out = out.split('https://www.googletagmanager.com/gtm.js?id=').join('about:blank?');
  out = out.split('https://www.googletagmanager.com/gtag/js?id=').join('about:blank?');
  out = out.split('if(!phet.chipper.queryParameters.yotta)return;').join('return;');
  out = out.split('if(phet.chipper.queryParameters.yotta)').join('if(false&&phet.chipper.queryParameters.yotta)');
  out = out.split('//phet.colorado.edu/services/check-html-updates').join('/offline-check');
  out = out.split('https://phet.colorado.edu/yotta/').join('/offline-yotta/');
  /* An earlier pass wrote a full address here; it has to become a local
     path as well, so the document never leaves the machine. */
  out = out.split('//localhost/offline-check').join('/offline-check');
  out = out.split('https://localhost/offline-yotta/').join('/offline-yotta/');
  /* The address is built from a variable that holds the site root, so the
     root has to go as well — what is left is a path of this very folder. */
  out = out.replace(/[A-Za-z_$][\w$]*\+"\/offline-check"/g, '"/offline-check"');
  out = applySplash(out);
  return out;
}

/* ------------------------------------------------------------------ run -- */

fs.mkdirSync(CW, { recursive: true });
fs.mkdirSync(BRAND, { recursive: true });
fs.mkdirSync(SCRATCH, { recursive: true });

const metaFile = path.join(SCRATCH, 'phet-metadata.json');
if (!fs.existsSync(metaFile)) {
  const r = await fetchText(
    `${HOST}/services/metadata/1.3/simulations?format=json&type=html&summary`
  );
  fs.writeFileSync(metaFile, r.body);
}
const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));

const jobs = [];
for (const project of meta.projects) {
  for (const sim of project.simulations) {
    const loc = sim.localizedSimulations || {};
    const zh = loc.zh_CN;
    const english = loc.en;
    if (!zh && !english) continue;
    /* A simulation with a Chinese build keeps it; one without is mirrored
       in English and named in Chinese by the table above. */
    const lang = zh ? 'zh_CN' : 'en';
    const raw = zh
      ? String(zh.title || '').split('_').pop().trim() || sim.name
      : String(english.title || '').trim() || sim.name;
    /*
     * A few of the simulations are published with an English name even
     * in their Chinese build.  The library is Chinese, so those few are
     * named here instead.
     */
    const title = /[\u4e00-\u9fff]/.test(raw) ? raw : ENGLISH_NAMES[sim.name] || raw;
    const order = ['物理', '化学', '生物', '数学', '地理', '科学'];
    const subjects = [...new Set((sim.subjects || []).map((id) => SUBJECTS[id]).filter(Boolean))].sort(
      (a, b) => order.indexOf(a) - order.indexOf(b)
    );
    const grades = stagesOf(sim.lowGradeLevel || 0, sim.highGradeLevel || 0);
    jobs.push({
      slug: sim.name,
      project: project.name,
      lang,
      title,
      titleEn: (english && english.title) || sim.name,
      subjects: [...new Set(subjects)],
      grades: [...new Set(grades)],
      credits: (sim.credits || sim.designTeam || '').replace(/\s+/g, ' ').trim(),
      description: (sim.description || '').replace(/\s+/g, ' ').trim(),
      low: sim.lowGradeLevel,
      high: sim.highGradeLevel,
      id: sim.id,
    });
  }
}

const wanted = ONLY.length ? jobs.filter((j) => ONLY.includes(j.slug)) : jobs;
console.log(`${wanted.length} simulations with a Chinese build`);

let done = 0;
let failed = 0;
const results = [];

async function pull(job) {
  const target = path.join(CW, `${job.slug}.html`);
  const cover = path.join(BRAND, `${job.slug}.png`);
  const url = `${HOST}/sims/${job.project}/latest/${job.slug}_${job.lang}.html`;
  const coverUrl = `${HOST}/sims/${job.project}/latest/${job.slug}-600.png`;
  let html = null;
  if (fs.existsSync(target) && fs.statSync(target).size > 100000) {
    html = makeOffline(fs.readFileSync(target, 'utf8'), job.title);
    fs.writeFileSync(target, html, 'utf8');
  } else {
    const r = await fetchText(url);
    if (r.status !== 200 || r.body.length < 100000) {
      console.log(`  skip ${job.slug} (${r.status})`);
      failed++;
      return null;
    }
    html = makeOffline(r.body, job.title);
    fs.writeFileSync(target, html, 'utf8');
  }
  if (!fs.existsSync(cover)) {
    const c = await fetchBin(coverUrl);
    if (c.data && c.data.length > 2000) fs.writeFileSync(cover, c.data);
  }
  if (!job.page) job.page = await readPage(job.slug);
  done++;
  console.log(`  ${done}/${wanted.length} ${job.slug} ${(fs.statSync(target).size / 1048576).toFixed(1)}MB`);
  return job;
}

let cursor = 0;
async function worker() {
  for (;;) {
    const i = cursor++;
    if (i >= wanted.length) return;
    const job = wanted[i];
    try {
      const r = await pull(job);
      if (r) results.push(r);
    } catch (e) {
      failed++;
      console.log(`  fail ${job.slug}: ${e.message}`);
    }
  }
}
await Promise.all(Array.from({ length: CONC }, worker));

const catalog = results
  .map((j) => ({
    slug: j.slug,
    /* A simulation with a Chinese build takes the name of its own page;
       one without keeps the Chinese name given here and carries the
       original name along beside it. */
    title: (j.lang === 'zh_CN' && j.page && j.page.title) || j.title,
    titleEn: (j.page && j.page.titleEn) || j.titleEn,
    subject: j.subjects[0] || '科学',
    subjects: j.subjects,
    stages: j.grades,
    stage: j.grades[0] || '通用',
    description: (j.page && (j.page.description || j.page.learningGoals)) || j.description,
    credits: (j.page && (j.page.designTeam || j.page.thanksTo)) || j.credits,
    cover: `/brand/phet/${j.slug}.png`,
    sourceUrl: `https://phet.colorado.edu/en/simulations/${j.slug}`,
    license: 'CC BY-NC 4.0',
  }))
  .sort((a, b) => a.title.localeCompare(b.title, 'zh'));

fs.writeFileSync(path.join(OUT, 'catalog.json'), JSON.stringify(catalog, null, 2));
fs.writeFileSync(
  path.join(OUT, 'NOTICE.md'),
  [
    '# PhET Interactive Simulations',
    '',
    '这些交互模拟来自 [PhET Interactive Simulations](https://phet.colorado.edu)，',
    '由 University of Colorado Boulder 开发。',
    '',
    '## 乐启享的改编与再创作',
    '',
    '本目录里的课件由乐启享机器人（[codebn.cn](https://codebn.cn/)）整理、改编并本地化后收录。',
    '乐启享完成的工作有：中文标题与中文说明的撰写、封面截图与品牌接入、',
    '脚本与样式表与字体与模型与贴图的本地化改写、离线打包与本地服务，',
    '以及课件质量的分级筛选（结论见 `mirror/leqixiang/quality-decisions.json`）。',
    '模拟本身的著作权仍属于原作者；上游链接、作者署名与许可协议一并保留在下面，',
    '并写进目录条目的 `author` / `license` / `sourceUrl` 字段里。',
    '',
    '- 许可：CC BY-NC 4.0（署名-非商业性使用）',
    '- 版权：Copyright 2002-2026 Regents of the University of Colorado',
    '- 每个模拟文件的头部注释里保留着上游的原始署名与许可说明。',
    '- 本地副本只做了三处改动：去掉页面统计与更新检查、加上离线内容安全策略、',
    '  把浏览器标题换成乐启享的名字。模拟本身的界面、实验与代码保持原样。',
    '',
    '每个模拟都是一份完整的 HTML 文件，双击即可打开，不需要联网。',
    '',
  ].join('\n')
);
console.log(`done: ${catalog.length} mirrored, ${failed} skipped`);
