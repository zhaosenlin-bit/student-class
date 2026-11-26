#!/usr/bin/env node
/*
 * 同一份东西只留一份。
 *
 * 一千多门课件里，很多课件用的是同一份库、同一张图、同一段字体，
 * 结果每个课件的文件夹里都放了一份。一千五百门课件，一多半的体积都
 * 花在这些重复的副本上。
 *
 * 这个工具把完全一样的副本收到站点根下的 shared/ 里，每门课件只留
 * 一份自己独有的东西，并把课件里指向那些副本的名字改成指向收好的那
 * 一份。课件照旧打开、照旧能下载——下载下来的单课仍然是完整的。
 *
 * 收之前有三条规矩，一条都不能破：
 *
 *   一份被收走的文件，它读到的每一样东西也必须一起被收走，
 *     而且在所有用它的那几门课件里必须是同一份，否则收走以后，
 *     同一份文件在不同课件里会指向不同地方。
 *
 *   有些课件是在运行的时候把目录拼出来再去找文件的（外部地址改写成
 *     本地目录、模块映射表、着色器读贴图）。这样的目录要么整个收
 *     走，要么一个都不收——收一半就会找不到文件。
 *
 *   说不清读法的地方（json 里的路径），指到的东西一律不动。
 *
 * 破不了规矩的就留在原处，宁可多占一点地方，也不让课件坏掉。
 *
 *   node tools/hoist-shared.mjs --root dist
 *   node tools/hoist-shared.mjs --root dist --dry   # 只算，不落盘
 *
 * 另外两个开关：
 *   --min-size <字节>   小于这个大小的文件不收（默认 64KB）
 *   --skip <编号,编号>   这些门课原样不动
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const ROOT = path.resolve(arg('root', path.join(HERE, '..', 'dist')));
const COURSES = path.join(ROOT, 'courseware');
const SHARED = path.join(ROOT, 'shared');
const DRY = args.includes('--dry');
/* 太大的文件收起来最费劲，收益却不成比例；太小的文件收起来省不了多少，
 * 却到处都可能是坏引用的源头。这里定一条线，线以下的原样留着。 */
const MIN_SIZE = Number(arg('min-size', 0)) || 0;
const SKIP = new Set(
  String(arg('skip', ''))
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
);
/* 追一条线索时用：DEBUG_REF=文件名 时把改写前后的名字都打出来。 */
const DEBUG_REF = String(process.env.DEBUG_REF || '');

const posix = path.posix;
const sha1 = (buf) => crypto.createHash('sha1').update(buf).digest('hex');
const readText = (file) => fs.readFileSync(file, 'utf8');

/* ------------------------------------------------------------ 读法 --- */

/*
 * 课件里的文件名有几种读法：页面按它自己的位置读，样式表按它自己
 * 的位置读，脚本按它自己的位置读；json 里的路径到底按谁的位置读，
 * 各有各的做法，说不准——这样的引用一律按“读不准”对待。
 *
 * 每条规则带一个“基准”：
 *   self  —— 按文件自己的位置（样式表、脚本里 import 这类写法）
 *   page  —— 按打开课件那个页面的位置（document.baseURI 这类写法）
 *   dual  —— 先按文件自己的位置，找不到再按页面的位置
 *   dualp —— 先按页面的位置，找不到再按文件自己的位置
 *   vague —— 基准说不准，指到的东西就不许动
 *
 * 为什么脚本里要两套：同一门课里，脚本可以 import 旁边的模块（按脚本
 * 自己的位置算），也可以把一段 html 塞到页面里，其中的 src 是按页面
 * 的位置算的。两种都真实存在，只能两种都试，哪个真的指向了文件就用
 * 哪个。
 */
function kindOf(rel) {
  if (/\.(?:html?|svg)$/i.test(rel)) return 'page';
  if (/\.css$/i.test(rel)) return 'style';
  if (/\.(?:js|mjs)$/i.test(rel)) return 'script';
  return 'vague';
}

const LOOKS_LOCAL =
  /^[\w.\-\/\\ ()\u4e00-\u9fa5]+?\.(?:png|jpe?g|gif|svg|webp|bmp|ico|mp3|wav|ogg|m4a|mp4|webm|mov|glb|gltf|bin|json|js|mjs|css|html?|wasm|ttf|otf|woff2?|ktx2?|basis|txt|md|glsl|wgsl|vert|frag|obj|mtl|ply|csv|xml)$/i;

/* 兜底的写法：一段看起来就是本地文件名的字符串。别的写法没认出来时，
 * 靠它把最后这一层补上——宁可多认几个，也不要漏。 */
const CATCH_ALL = /(["'`])([^"'`\r\n]{1,400})\1/g;

function cleanRef(raw) {
  let s = String(raw).trim();
  if (s.length > 400) return null;
  s = s.replace(/^["'`]|["'`]$/g, '');
  if (!s) return null;
  if (/^(?:[a-z][a-z0-9+.\-]*:|\/\/)/i.test(s)) return null;
  if (s.startsWith('#') || s.startsWith('/')) return null;
  return s;
}

/* 一段文字里，属于 <base> 标签的那个 href 不算引用。 */
function notBaseTag(m, text) {
  const lt = text.lastIndexOf('<', m.index);
  return lt >= 0 && /^<base\b/i.test(text.slice(lt, m.index));
}

/* 画面上给人看的字，不是地址。 */
function notPlainText(m, text) {
  const before = text.slice(Math.max(0, m.index - 24), m.index);
  return /\b(?:alt|title|aria-label|placeholder|content)\s*=\s*["']?$/i.test(before);
}

/* 能指到一个本地文件的名字。 */
function refPatterns(kind) {
  if (kind === 'page') {
    return [
      [
        /\b(?:src|href|poster|data-src|data-poster|data-url|action|formaction|xlink:href|data-background-image)\s*=\s*(["'])([^"']{1,600})\1/gi,
        2,
        'self',
        notBaseTag,
      ],
      [/\burl\(\s*(["']?)([^)"']{1,400})\1\s*\)/gi, 2, 'self'],
      /* 页面里内联的脚本，名字按页面的基准算。 */
      [/\bimport\s+(?:[^'";]*?\sfrom\s*)?(["'])([^'"]{1,400})\1/g, 2, 'self'],
      [/\bimport\s*\(\s*(["'])([^'"]{1,400})\1/g, 2, 'self'],
      [/\brequire\s*\(\s*(["'])([^'"]{1,400})\1/g, 2, 'self'],
      [/\bfetch\s*\(\s*(["'])([^'"]{1,400})\1/g, 2, 'dualp'],
      [/\bnew\s+URL\s*\(\s*(["'])([^'"]{1,400})\1\s*,\s*import\.meta\.url/g, 2, 'self'],
      [/\bnew\s+URL\s*\(\s*(["'])([^'"]{1,400})\1\s*,\s*document\.currentScript\.src/g, 2, 'self'],
      [/\bnew\s+URL\s*\(\s*(["'])([^'"]{1,400})\1\s*,\s*[A-Za-z_$][\w.$]*\s*\)/g, 2, 'vague'],
      [/\bnew\s+(?:Worker|SharedWorker|Audio|Video)\s*\(\s*(["'])([^'"]{1,400})\1/g, 2, 'dualp'],
      [/\.(?:src|href)\s*=\s*(["'])([^'"]{1,400})\1/g, 2, 'self'],
      [CATCH_ALL, 2, 'self', notPlainText],
    ];
  }
  if (kind === 'style') {
    return [
      [/\burl\(\s*(["']?)([^)"']{1,400})\1\s*\)/gi, 2, 'self'],
      [/@import\s+(?:url\()?\s*(["'])([^"']{1,400})\1/gi, 2, 'self'],
      [CATCH_ALL, 2, 'self', notPlainText],
    ];
  }
  if (kind === 'script') {
    return [
      /* 模块的引入按脚本自己的位置算；页面里内联的模块按页面的位置算，
       * 两种都试一遍，谁真的指向了文件就用谁。 */
      [/\bimport\s+(?:[^'";]*?\sfrom\s*)?(["'])([^'"]{1,400})\1/g, 2, 'dual'],
      [/\bimport\s*\(\s*(["'])([^'"]{1,400})\1/g, 2, 'dual'],
      [/\brequire\s*\(\s*(["'])([^'"]{1,400})\1/g, 2, 'dual'],
      /* 取数据、起后台任务、装图片：浏览器都按页面的位置算。 */
      [/\bfetch\s*\(\s*(["'])([^'"]{1,400})\1/g, 2, 'dualp'],
      [/\bnew\s+URL\s*\(\s*(["'])([^'"]{1,400})\1\s*,\s*import\.meta\.url/g, 2, 'self'],
      [/\bimport\.meta\.resolve\s*\(\s*(["'])([^'"]{1,400})\1/g, 2, 'self'],
      [/\bnew\s+URL\s*\(\s*(["'])([^'"]{1,400})\1\s*,\s*document\.currentScript\.src/g, 2, 'self'],
      [/\bnew\s+URL\s*\(\s*(["'])([^'"]{1,400})\1\s*,\s*(?:window\.)?document\.baseURI/g, 2, 'page'],
      [/\bnew\s+URL\s*\(\s*(["'])([^'"]{1,400})\1\s*,\s*(?:window\.)?location\.href/g, 2, 'page'],
      [/\bnew\s+URL\s*\(\s*(["'])([^'"]{1,400})\1\s*,\s*[A-Za-z_$][\w.$]*\s*\)/g, 2, 'vague'],
      [/\bnew\s+(?:Worker|SharedWorker|Audio|Video)\s*\(\s*(["'])([^'"]{1,400})\1/g, 2, 'dualp'],
      [/\.open\s*\(\s*(["'])[A-Za-z]+["']\s*,\s*(["'])([^'"]{1,400})\2/g, 3, 'dualp'],
      /* 装到页面上的图片、样式、脚本：浏览器按页面的位置算。 */
      [/\.(?:src|href)\s*=\s*(["'])([^'"]{1,400})\1/g, 2, 'dualp'],
      [/\.setAttribute\s*\(\s*(["'])(?:src|href|data-src)["']\s*,\s*(["'])([^'"]{1,400})\2/g, 3, 'dualp'],
      [/\.setAttributeNS\s*\(\s*(["'])[^"']{1,200}\1\s*,\s*(["'])(?:xlink:href|href|src)["']\s*,\s*(["'])([^'"]{1,400})\3/g, 4, 'dualp'],
      /* 脚本里拼出来的 html 片段，src/href 是按页面的位置算的。 */
      [/(?<![\w.$])(?:src|href)\s*=\s*(["'])([^'"]{1,400})\1/g, 2, 'page'],
      [/\bxlink:href\s*=\s*(["'])([^'"]{1,400})\1/g, 2, 'page'],
      /* 样式里的图，浏览器按页面的位置算。 */
      [/\burl\(\s*(["']?)([^)"']{1,400})\1\s*\)/gi, 2, 'dualp'],
      [CATCH_ALL, 2, 'dualp'],
    ];
  }
  return [];
}

/* 一条规则可能按哪个基准去找那个文件。 */
function basesFor(mode, rec) {
  if (mode === 'self') return [rec.base];
  if (mode === 'page') return [rec.pageBase];
  if (mode === 'dual') return [rec.base, rec.pageBase];
  if (mode === 'dualp') return [rec.pageBase, rec.base];
  return [rec.base];
}

/* 页面上写明的“名字从哪里起算”。 */
function baseOfPage(text, rel) {
  const dir = posix.dirname(rel);
  const m = /<base\b[^>]*\bhref\s*=\s*["']([^"']+)["']/i.exec(text);
  if (!m) return { base: dir, offset: '' };
  const base = posix.normalize(posix.join(dir, m[1]));
  return { base, offset: posix.relative(dir, base) || '.' };
}

/*
 * 运行的时候把目录拼出来再去找文件的地方。课件里常见的有三处：
 * 外部地址改写成本地目录的那张表、模块映射表、着色器读贴图的路径。
 * 这些目录要么整个收走，要么一个都不收。
 */
function dirBuilders(text) {
  const out = [];
  const tests = new Set();
  /* base 写的是“名字从哪里起算”，不是拿来拼的目录，不能动。 */
  const body = text.replace(/<base\b[^>]*>/gi, '');
  /* 只用来比对的“前缀表”（判断某个地址是不是本地的）不算。 */
  const T = /\bprefixes\s*=\s*\[([^\]]{0,4000})\]/g;
  let t;
  while ((t = T.exec(body))) {
    const S = /(["'])([^"']{1,300})\1/g;
    let s;
    while ((s = S.exec(t[1]))) tests.add(s[2]);
  }
  /* 外部地址 → 本地目录，一张一张对。 */
  const M = /\[\s*(["'])https?:\/\/[^"']{1,200}\1\s*,\s*(["'])(\.{1,2}\/[^"']{1,300}?\/)\2\s*\]/g;
  let m;
  while ((m = M.exec(body))) out.push(m[3]);
  /* 模块映射表里的值。 */
  const I = /<script[^>]*type\s*=\s*["']importmap["'][^>]*>([\s\S]*?)<\/script>/gi;
  while ((m = I.exec(body))) {
    const J = /"[^"]*"\s*:\s*"([^"]{1,300})"/g;
    let j;
    while ((j = J.exec(m[1]))) out.push(j[1]);
  }
  /* 其它写出来的目录：后面接着别的东西，就是拿来拼的。 */
  const D = /(["'])(\.{1,2}\/[^"']{1,300}?\/)\1/g;
  while ((m = D.exec(body))) {
    const s = m[2];
    if (tests.has(s)) continue;
    const after = body.slice(m.index + m[0].length, m.index + m[0].length + 30);
    const before = body.slice(Math.max(0, m.index - 30), m.index);
    if (/^\s*[+]/.test(after) || /[+]\s*$/.test(before) || /=\s*$/.test(before)) out.push(s);
  }
  /* 脚本里写死的目录名（运行时拿来拼地址），没有开头的 ./。
   * 这种目录是按页面的位置算的，所以放在外面统一处理。 */
  const R = /(["'])([\w.\-]+(?:\/[\w.\-]+){0,12}\/)\1/g;
  while ((m = R.exec(body))) {
    const s = m[2];
    if (tests.has(s)) continue;
    if (s.startsWith('.')) continue;
    out.push(s);
  }
  return { builders: [...new Set(out)], tests };
}

/* json 之类说不清的地方：只把像本地路径的字符串记下来。 */
function vagueRefs(text) {
  const out = [];
  const re = /(["'`])((?:[\w.\-\/\\ ()\u4e00-\u9fa5]+?\.(?:png|jpe?g|gif|svg|webp|mp3|wav|ogg|mp4|glb|gltf|bin|json|js|mjs|css|html?|wasm|ttf|otf|woff2?|txt|md|csv|xml)))\1/gi;
  let m;
  while ((m = re.exec(text))) out.push(m[2]);
  return out;
}

/*
 * 运行的时候把名字拆开拼起来的那种写法：
 *   const img = 's/f58' + 'fb13e' + 'a186.png';
 * 静态看不出来，但拼起来就是一个文件。这种文件不能收走——收走了，
 * 拼出来的地方还是找不到它。
 */
function concatLiterals(text) {
  const out = [];
  const re =
    /(["'`])((?:[^"'`\\\r\n]|\\.){1,200})\1(\s*\+\s*)(["'`])((?:[^"'`\\\r\n]|\\.){1,200})\4/g;
  let m;
  while ((m = re.exec(text))) {
    let joined = m[2] + m[5];
    /* 继续往后接：'a' + 'b' + 'c' */
    let tail = text.slice(m.index + m[0].length);
    for (let i = 0; i < 8; i++) {
      const next = /^\s*\+\s*(["'`])((?:[^"'`\\\r\n]|\\.){1,200})\1/.exec(tail);
      if (!next) break;
      joined += next[2];
      tail = tail.slice(next[0].length);
    }
    if (joined.length >= 4) out.push(joined);
  }
  return out;
}

/* ------------------------------------------------------------ 收齐 --- */

if (!fs.existsSync(COURSES)) {
  console.error('没有找到课件目录：' + COURSES);
  process.exit(1);
}

const lessons = new Map();
const lessonIds = fs
  .readdirSync(COURSES, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

let totalBytes = 0;
for (const id of lessonIds) {
  const root = path.join(COURSES, id);
  const files = new Map();
  const walk = (dir, rel) => {
    for (const it of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, it.name);
      const r = rel ? rel + '/' + it.name : it.name;
      if (it.isDirectory()) walk(p, r);
      else {
        const buf = fs.readFileSync(p);
        const st = fs.statSync(p);
        files.set(r, { rel: r, size: st.size, hash: sha1(buf), abs: p });
        totalBytes += st.size;
      }
    }
  };
  walk(root, '');
  lessons.set(id, files);
}

const groupKey = (rel, hash) => rel + '\u0000' + hash;
const groupInfo = new Map();
for (const [rel, byHash] of (() => {
  const m = new Map();
  for (const [id, files] of lessons) {
    for (const f of files.values()) {
      if (!m.has(f.rel)) m.set(f.rel, new Map());
      const byH = m.get(f.rel);
      if (!byH.has(f.hash)) byH.set(f.hash, { lessons: [], size: f.size });
      byH.get(f.hash).lessons.push(id);
    }
  }
  return m;
})()) {
  for (const [hash, info] of byHash) {
    groupInfo.set(groupKey(rel, hash), { rel, hash, lessons: info.lessons, size: info.size });
  }
}

const hashAt = new Map(); // id|rel -> hash
for (const [id, files] of lessons) for (const f of files.values()) hashAt.set(id + '|' + f.rel, f.hash);

/* 运行的时候拼出来的文件名，记在这里：这些文件不收。 */
const runtimeBuilt = new Map(); // id -> Set(rel)

/* -------------------------------------------------------- 读引用 --- */

function refsOfLesson(id) {
  const files = lessons.get(id);
  const out = new Map();
  const scriptTexts = [];
  /* 打开课件的那个页面，它的位置是脚本里 document.baseURI 的基准。 */
  let pageBase = '';
  const pageFile = files.get('index.html');
  if (pageFile) {
    try {
      pageBase = baseOfPage(readText(pageFile.abs), 'index.html').base;
    } catch {
      pageBase = '';
    }
  }
  /* 这门课里有哪些目录。 */
  const dirs = new Set();
  for (const rel of files.keys()) {
    const cut = rel.lastIndexOf('/');
    if (cut < 0) continue;
    const parts = rel.slice(0, cut).split('/');
    for (let i = 1; i <= parts.length; i++) dirs.add(parts.slice(0, i).join('/'));
  }

  for (const f of files.values()) {
    const kind = kindOf(f.rel);
    const textish =
      kind !== 'vague' || /\.(?:json|txt|md|csv|xml|glsl|wgsl|vert|frag)$/i.test(f.rel);
    if (!textish) continue;
    if (f.size > 12 * 1024 * 1024) continue;
    let text;
    try {
      text = readText(f.abs);
    } catch {
      continue;
    }
    if (kind === 'script') scriptTexts.push(text);
    const rec = {
      kind,
      base: posix.dirname(f.rel),
      offset: '',
      pageBase,
      files: new Set(),
      dirs: new Set(),
      builders: new Map(),
      imports: new Map(),
      vague: new Set(),
      /* 一段地址只定一次：先定下来的那个基准说了算。
       * 同一段地址可能同时被好几条规则认出来（import 是一种，兜底又是一种），
       * 各定各的就会改出自相矛盾的结果——同一个文件，import 说是一种，
       * 兜底说是另一种。 */
      map: new Map(),
    };
    if (kind === 'page') {
      const b = baseOfPage(text, f.rel);
      rec.base = b.base;
      rec.offset = b.offset;
    }
    /* 运行的时候拼出来的目录，最后都是变成一个地址去取东西，
     * 浏览器按页面的位置算它。 */
    rec.builderBase = kind === 'page' ? rec.base : pageBase;
    /* 指到文件的名字。一段地址只认第一回。 */
    for (const [re, pick, mode, guard] of refPatterns(kind)) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text))) {
        if (guard && guard(m, text)) continue;
        const raw = cleanRef(m[pick]);
        if (!raw) continue;
        if (!LOOKS_LOCAL.test(raw)) {
          /* 没有常见后缀的名字也认：只要它真的指到本课件里的一个文件。
           * 有些资源就叫 "css2"、"scene.bin" 这种，看着不像地址。 */
          if (!raw.includes('/') && !raw.includes('\\')) continue;
          const probe = raw.split('#')[0].split('?')[0];
          if (!probe) continue;
          let hit = false;
          for (const base of basesFor(mode, rec)) {
            const t = posix.normalize(posix.join(base, probe));
            if (t.startsWith('..')) continue;
            if (files.has(t)) {
              hit = true;
              break;
            }
          }
          if (!hit) continue;
        }
        if (rec.map.has(raw)) continue;
        const clean = raw.split('#')[0].split('?')[0];
        if (!clean) continue;
        /* 哪个基准真的指向了文件，就按那个基准算。 */
        for (const base of basesFor(mode, rec)) {
          const target = posix.normalize(posix.join(base, clean));
          if (target.startsWith('..')) continue;
          if (!files.has(target)) continue;
          rec.files.add(target);
          const how = base === rec.pageBase && rec.base !== rec.pageBase ? 'page' : 'self';
          rec.map.set(raw, { target, base, how, tail: raw.slice(clean.length) });
          if (mode === 'vague') rec.vague.add(target);
          break;
        }
      }
    }
    /* 一张图给几种尺寸，写在一起；每一个都要单独看一眼。 */
    if (kind === 'page') {
      const S = /\bsrcset\s*=\s*(["'])([^"']{1,1600})\1/gi;
      let m;
      while ((m = S.exec(text))) {
        for (const part of m[2].split(',')) {
          const raw = cleanRef(part.trim().split(/\s+/)[0]);
          if (!raw || !LOOKS_LOCAL.test(raw)) continue;
          const clean = raw.split('#')[0].split('?')[0];
          if (!clean) continue;
          const target = posix.normalize(posix.join(rec.base, clean));
          if (target.startsWith('..')) continue;
          if (!files.has(target)) continue;
          rec.files.add(target);
        }
      }
    }
    /* 模块映射表：里面的名字按页面的基准算。 */
    if (kind === 'page') {
      const I = /<script[^>]*type\s*=\s*["']importmap["'][^>]*>([\s\S]*?)<\/script>/gi;
      let im;
      while ((im = I.exec(text))) {
        const J = /"[^"]*"\s*:\s*"([^"]{1,300})"/g;
        let j;
        while ((j = J.exec(im[1]))) {
          const raw = cleanRef(j[1]);
          if (!raw) continue;
          const clean = raw.split('#')[0].split('?')[0];
          if (!clean) continue;
          const target = posix.normalize(posix.join(rec.base, clean));
          if (target.startsWith('..')) continue;
          if (files.has(target)) {
            rec.files.add(target);
            rec.imports.set(j[1], target);
          } else {
            const dir = target.replace(/\/+$/, '');
            if (dirs.has(dir)) {
              rec.dirs.add(dir);
              rec.builders.set(j[1], dir);
            }
          }
        }
      }
    }
    /* 运行的时候拼出来的目录。 */
    if (kind !== 'vague') {
      const { builders } = dirBuilders(text);
      for (const raw of builders) {
        const clean = raw.split('#')[0].split('?')[0];
        if (!clean) continue;
        const target = posix.normalize(posix.join(rec.builderBase, clean)).replace(/\/+$/, '');
        if (target.startsWith('..')) continue;
        if (!dirs.has(target)) continue;
        rec.dirs.add(target);
        rec.builders.set(raw, target);
      }
    }
    /* 说不清的引用。 */
    if (kind === 'vague') {
      for (const raw of vagueRefs(text)) {
        const clean = raw.split('#')[0].split('?')[0];
        if (!clean) continue;
        for (const base of [posix.dirname(f.rel), '']) {
          const target = posix.normalize(posix.join(base, clean));
          if (target.startsWith('..')) continue;
          if (files.has(target)) {
            rec.vague.add(target);
            rec.files.add(target);
            break;
          }
        }
      }
    }
    out.set(f.rel, rec);
  }

  /*
   * 运行的时候把名字拼出来的那种文件：静态看不出来，只能靠把相邻的
   * 几段字面量接起来才认得出。认出来了，这种文件就不收。
   */
  const built = new Set();
  for (const t of scriptTexts) for (const s of concatLiterals(t)) built.add(s);
  if (built.size) {
    const bySuffix = new Set();
    for (const s of built) {
      if (s.length >= 6) bySuffix.add(s);
    }
    for (const rel of files.keys()) {
      /* 拼出来的名字可能只对上路径的后半截，所以拿整条路径的后缀比。 */
      for (let i = 0; i + 6 <= rel.length; i++) {
        const tail = rel.slice(i);
        if (!bySuffix.has(tail)) continue;
        if (runtimeBuilt.has(id)) runtimeBuilt.get(id).add(rel);
        break;
      }
    }
  }
  return out;
}

const refs = new Map();
for (const id of lessons.keys()) refs.set(id, refsOfLesson(id));

/* -------------------------------------------------------- 收拢的账 --- */

/* hoist: 一组内容 → 收走它的那些课件 */
const hoist = new Map();
const dropped = new Map(); // key -> 原因
for (const [key, g] of groupInfo) {
  if (g.lessons.length < 2) continue;
  /* 太小的不收：省不了多少地方，却是坏引用的主要来源。 */
  if (g.size < MIN_SIZE) continue;
  const ids = g.lessons.filter((id) => !SKIP.has(id));
  if (ids.length < 2) continue;
  /* 入口页永远留在原处：它就是打开课件的那个页面，收走就没有页面了。 */
  if (posix.basename(g.rel) === 'index.html') {
    dropped.set(key, '课件的入口页');
    continue;
  }
  /* 运行的时候把名字拼出来找的文件不收：收走了它就找不到了。 */
  let built = false;
  for (const id of ids) {
    const s = runtimeBuilt.get(id);
    if (s && s.has(g.rel)) {
      built = true;
      break;
    }
  }
  if (built) {
    dropped.set(key, '运行的时候拼出来的文件名');
    continue;
  }
  hoist.set(key, new Set(ids));
}

/*
 * 一份被收走的文件，它读到的每一样东西也得被收走；而且在所有用它
 * 的那几门课件里，那些东西必须是同一份——不然收走之后，同一份文件
 * 在不同课件里会指向不同地方。
 */

/* 基准的层数：算出来的新名字里要带上它。 */
const depthOf = (base) => (base ? base.split('/').length : 0);

/*
 * 同一份文件在不同的课件里改出来必须一模一样，否则就不能收成一份。
 * 签名里装着：每段地址是按谁的基准找到的、找到的是哪个文件、那个文件
 * 是不是同一份、页面基准有几层。
 */
function sigOf(id, rel) {
  const rec = refs.get(id).get(rel);
  if (!rec) return '（没有读出引用）';
  const parts = ['k=' + rec.kind, 'b=' + depthOf(rec.base), 'p=' + depthOf(rec.pageBase)];
  for (const raw of [...rec.map.keys()].sort()) {
    const e = rec.map.get(raw);
    parts.push(`${raw}|${e.how}|${e.tail}|${e.target}|${hashAt.get(id + '|' + e.target)}`);
  }
  return parts.join('\n');
}

for (const [key] of [...hoist]) {
  let why = null;
  const info = groupInfo.get(key);
  /* 改出来不一样的，不收成一份。 */
  const sigs = new Set();
  for (const id of info.lessons) {
    if (!refs.get(id).has(info.rel)) continue;
    sigs.add(sigOf(id, info.rel));
  }
  if (sigs.size > 1) {
    hoist.delete(key);
    dropped.set(key, '在不同课件里改出来不一样');
    continue;
  }
  for (const id of info.lessons) {
    const rec = refs.get(id).get(info.rel);
    if (!rec) continue;
    /* 会拼目录的文件留在原处：它拼出来的地方没法跟着搬。 */
    if (rec.dirs.size) {
      why = '会在运行的时候拼目录';
      break;
    }
    for (const target of rec.files) {
      const variants = new Set();
      for (const other of info.lessons) {
        const h = hashAt.get(other + '|' + target);
        if (h) variants.add(h);
      }
      if (variants.size > 1) {
        why = '引用了在不同课件里不一样的东西';
        break;
      }
    }
    if (why) break;
  }
  if (why) {
    hoist.delete(key);
    dropped.set(key, why);
  }
}

/* 收走以后放在哪里：同名同路的第一份，其余的按指纹分开放。 */
function assignDest() {
  const dest = new Map();
  /*
   * 大小写不算新的名字。在 Windows 上 Audio 和 audio 是同一个地方，
   * 在对象存储上是两个地方——两份都占那个位置的话，后写的那份会盖掉
   * 前一份，课件里指过去的名字就有一半走不通了。
   * 所以按不挑大小写的名字归组：组里最常用的那个写法作准，别的写法
   * 一律指到它那儿；内容确实不一样的，另按指纹分开放。
   */
  const byBucket = new Map();
  for (const [key, ids] of hoist) {
    const g = groupInfo.get(key);
    const bucket = g.rel.toLowerCase();
    if (!byBucket.has(bucket)) byBucket.set(bucket, []);
    byBucket.get(bucket).push([key, ids.size, g.hash]);
  }
  for (const list of byBucket.values()) {
    list.sort((a, b) => (b[1] - a[1]) || (a[0] < b[0] ? -1 : 1));
    /* 这一组里最常用的那个写法作准。 */
    const canonical = groupInfo.get(list[0][0]).rel;
    const byHash = new Map();
    list.forEach(([key, , hash], index) => {
      const g = groupInfo.get(key);
      /*
       * 内容一样的，只是写法不一样——指到同一个地方去。
       * 内容不一样的，另开一个地方，两边都不覆盖。
       */
      if (byHash.has(hash)) {
        dest.set(key, byHash.get(hash));
        return;
      }
      const place = index === 0 ? canonical : '~' + hash.slice(0, 8) + '/' + canonical;
      byHash.set(hash, place);
      dest.set(key, place);
    });
  }
  return dest;
}

/* 某个文件收走以后，它在 shared 里的那一层。 */
function rootOf(dest, rel) {
  if (dest.length <= rel.length) return '';
  return dest.slice(0, dest.length - rel.length);
}

/* 反复算到不再变化为止。 */
let changed = true;
while (changed) {
  changed = false;
  const dest = assignDest();

  /* 一份被收走的文件，它读到的东西也得被收走。 */
  for (const [key, ids] of [...hoist]) {
    const g = groupInfo.get(key);
    for (const id of [...ids]) {
      const rec = refs.get(id).get(g.rel);
      if (!rec) continue;
      let drop = false;
      for (const target of rec.files) {
        const tKey = groupKey(target, hashAt.get(id + '|' + target));
        const set = hoist.get(tKey);
        if (!set || !set.has(id)) {
          drop = true;
          break;
        }
      }
      if (rec.vague.size) drop = true;
      if (drop) {
        ids.delete(id);
        changed = true;
        if (!ids.size) {
          hoist.delete(key);
          dropped.set(key, '引用了留在原处的文件');
        }
      }
    }
  }

  /* 拼出来的目录要么整个收走，要么一个都不收。 */
  for (const [id, files] of lessons) {
    const byDir = new Map();
    for (const rec of refs.get(id).values()) {
      for (const d of rec.dirs) {
        if (!byDir.has(d)) byDir.set(d, []);
        for (const rel of files.keys()) {
          if (rel.startsWith(d + '/')) byDir.get(d).push(rel);
        }
      }
    }
    for (const [d, list] of byDir) {
      let ok = true;
      let root = null;
      for (const rel of list) {
        const key = groupKey(rel, hashAt.get(id + '|' + rel));
        const set = hoist.get(key);
        if (!set || !set.has(id)) {
          ok = false;
          break;
        }
        const r = rootOf(dest.get(key), rel);
        if (root === null) root = r;
        else if (root !== r) {
          ok = false;
          break;
        }
      }
      if (ok) continue;
      for (const rel of list) {
        const key = groupKey(rel, hashAt.get(id + '|' + rel));
        const set = hoist.get(key);
        if (set && set.delete(id)) {
          changed = true;
          if (!set.size) {
            hoist.delete(key);
            dropped.set(key, '目录要整个收走');
          }
        }
      }
    }
  }
  if (!changed) break;
}

/* ------------------------------------------------------------ 落位 --- */

/* 每门课里，每个被收走的文件的新地址（站点相对）。 */
const locOf = new Map();
for (const [id, files] of lessons) {
  const map = new Map();
  const dest = assignDest();
  for (const f of files.values()) {
    const key = groupKey(f.rel, f.hash);
    const set = hoist.get(key);
    if (!set || !set.has(id)) continue;
    map.set(f.rel, 'shared/' + dest.get(key));
  }
  locOf.set(id, map);
}

/* 两个站点相对地址之间怎么走。 */
function relativeTo(from, to) {
  const a = from.replace(/\/+$/, '').split('/');
  const b = to.replace(/\/+$/, '').split('/');
  let i = 0;
  while (i < a.length - 1 && i < b.length - 1 && a[i] === b[i]) i++;
  const up = a.slice(i).map(() => '..');
  return [...up, ...b.slice(i)].join('/');
}

/* ------------------------------------------------------------ 改名 --- */

/*
 * 把一段文字里指到本地文件的名字换掉，其余部分原样保留。
 * 换的时候只看括号里那一段，其余的写法一个字都不动。
 */
function replaceRefs(text, re, pick, rewrite, guard) {
  const withIndex = new RegExp(re.source, re.flags.includes('d') ? re.flags : re.flags + 'd');
  let out = '';
  let last = 0;
  let m;
  while ((m = withIndex.exec(text))) {
    if (guard && guard(m, text)) continue;
    const raw = cleanRef(m[pick]);
    const next = raw ? rewrite(raw) : null;
    if (next == null) continue;
    const span = m.indices[pick];
    const head = m[0].slice(0, span[0] - m.index);
    const tail = m[0].slice(span[1] - m.index);
    out += text.slice(last, m.index) + head + next + tail;
    last = m.index + m[0].length;
    if (m[0].length === 0) withIndex.lastIndex += 1;
  }
  return out + text.slice(last);
}

let changedFiles = 0;
const sharedWrites = new Map(); // shared 相对路径 -> {abs, text, size}

for (const [id, files] of lessons) {
  const loc = locOf.get(id);
  const dest = assignDest();
  for (const f of files.values()) {
    const rec = refs.get(id).get(f.rel);
    const moved = loc.get(f.rel);
    let body = null;
    let text = null;
    let original = null;

    if (rec && rec.kind !== 'vague') {
      const fileLoc = moved || 'courseware/' + id + '/' + f.rel;
      /* 文件换了地方以后，它读名字的起点也跟着换。 */
      const dir = posix.dirname(fileLoc);
      const newBase = moved
        ? rec.offset
          ? posix.normalize(posix.join(dir, rec.offset))
          : dir
        : posix.join('courseware', id, rec.base);
      const oldBase = rec.base;
      /* 页面自己换了地方，document.baseURI 的起点也跟着换。 */
      const pageMoved = loc.get('index.html');
      const oldPageBase = rec.pageBase;
      const newPageBase = pageMoved
        ? posix.dirname(pageMoved)
        : posix.join('courseware', id, oldPageBase);

      text = readText(f.abs);
      original = text;

      /*
       * 改写一段地址：
       *   fromBase —— 改之前是按谁的基准找到那个文件的
       *   toBase   —— 改之后，写出来的名字是按谁的基准算的
       * 目标文件的落位由 loc 决定（留在原处还是去了 shared）。
       */
      const rewrite = (raw, fromBase, toBase, knownTarget) => {
        const clean = raw.split('#')[0].split('?')[0];
        if (!clean) return null;
        const target = knownTarget || posix.normalize(posix.join(fromBase, clean));
        if (!knownTarget) {
          if (target.startsWith('..')) return null;
          if (!files.has(target)) return null;
        }
        const targetLoc = loc.get(target) || 'courseware/' + id + '/' + target;
        let next = relativeTo(toBase, targetLoc);
        if (!next.startsWith('.')) next = './' + next;
        const tail = raw.slice(clean.length);
        if (next === clean) return null;
        return next + tail;
      };

      /* 我们自己改出来的名字，已经是最后的样子了，后面的规则不要再碰它。 */
      const produced = new Set();

      /* 一条规则可能有几个基准，按次序一个个试。 */
      const pairsFor = (mode) => {
        if (mode === 'self') return [[oldBase, newBase]];
        if (mode === 'page') return [[oldPageBase, newPageBase]];
        if (mode === 'dual') return [[oldBase, newBase], [oldPageBase, newPageBase]];
        if (mode === 'dualp') return [[oldPageBase, newPageBase], [oldBase, newBase]];
        return [[oldBase, newBase]];
      };

      let patIndex = 0;
      for (const [re, pick, mode, guard] of refPatterns(rec.kind)) {
        const thisPattern = patIndex++;
        text = replaceRefs(text, re, pick, (raw) => {
          if (produced.has(raw)) return null;
          /* 分析阶段已经定过这一段地址按谁的基准找，改的时候就按那一个来。 */
          const known = rec.map.get(raw);
          if (known) {
            const toBase = known.how === 'page' ? newPageBase : newBase;
            const out = rewrite(raw, known.base, toBase, known.target);
            if (out != null) {
              const cleanOut = out.slice(0, out.length - known.tail.length);
              produced.add(cleanOut + known.tail);
            }
            return out;
          }
          /* 分析阶段没定下来的（多半是文件太大没读），这里再自己试一遍。 */
          for (const [fromBase, toBase] of pairsFor(mode)) {
            const clean = raw.split('#')[0].split('?')[0];
            if (!clean) continue;
            const target = posix.normalize(posix.join(fromBase, clean));
            if (target.startsWith('..')) continue;
            if (!files.has(target)) continue;
            /* 指到了文件：改写就按这个基准来，不用再试别的。 */
            if (DEBUG_REF && f.rel.includes(DEBUG_REF)) {
              const targetLoc = loc.get(target) || 'courseware/' + id + '/' + target;
              console.log(
                `   ${id} ${f.rel}  「${raw}」 规则#${thisPattern}/${mode} 基准 ${fromBase} → ${toBase}` +
                  `  目标 ${target} → ${targetLoc}  结果 ${relativeTo(toBase, targetLoc)}`
              );
            }
            return rewrite(raw, fromBase, toBase);
          }
          return null;
        }, guard);
      }

      /* 一张图给几种尺寸，写在一起；每一个都要单独换。 */
      if (rec.kind === 'page') {
        const S = /\bsrcset\s*=\s*(["'])([^"']{1,1600})\1/gi;
        text = text.replace(S, (all, q, value) => {
          const parts = value.split(',').map((part) => {
            const bits = part.trim().split(/\s+/);
            const next = rewrite(bits[0], oldBase, newBase);
            return next == null ? part : [next, ...bits.slice(1)].join(' ');
          });
          const joined = parts.join(',');
          return joined === value ? all : all.replace(value, joined);
        });

        /* 模块映射表里的名字。 */
        const I = /(<script[^>]*type\s*=\s*["']importmap["'][^>]*>)([\s\S]*?)(<\/script>)/gi;
        text = text.replace(I, (all, open, inner, close) => {
          const replaced = inner.replace(/"([^"]*)"\s*:\s*"([^"]{1,300})"/g, (one, k, v) => {
            const next = rewrite(v, oldBase, newBase);
            return next == null ? one : `"${k}": "${next}"`;
          });
          return open + replaced + close;
        });
      }

      body = text;
    }

    /* 会拼目录的页面：把拼出来的目录改到 shared 去。 */
    if (rec && rec.kind !== 'vague' && rec.dirs.size) {
      const newBase = posix.join('courseware', id, rec.builderBase);
      for (const [raw, target] of rec.builders) {
        const list = [];
        for (const rel of files.keys()) if (rel.startsWith(target + '/')) list.push(rel);
        if (!list.length) continue;
        let root = null;
        let ok = true;
        for (const rel of list) {
          const key = groupKey(rel, hashAt.get(id + '|' + rel));
          const set = hoist.get(key);
          if (!set || !set.has(id)) {
            ok = false;
            break;
          }
          const r = rootOf(dest.get(key), rel);
          if (root === null) root = r;
          else if (root !== r) {
            ok = false;
            break;
          }
        }
        if (!ok || root === null) continue;
        let next = relativeTo(newBase, 'shared/' + root + target);
        if (!next.startsWith('.')) next = './' + next;
        text = text.split('"' + raw + '"').join('"' + next + '/"');
        text = text.split("'" + raw + "'").join("'" + next + "/'");
      }
    }

    if (text != null && text !== original) {
      if (!DRY) fs.writeFileSync(f.abs, text);
      changedFiles += 1;
    }
    if (text != null) body = text;

    /* 被收走的文件，它改好的样子要存到 shared/ 下面去。 */
    if (moved) {
      const key = groupKey(f.rel, f.hash);
      const rel = dest.get(key);
      if (!sharedWrites.has(rel)) sharedWrites.set(rel, { abs: f.abs, text: body, size: f.size });
    }
  }
}

/* ------------------------------------------------- 下载用的清单 --- */

/*
 * 课件交给读者下载的那份清单，写着每个文件叫什么、放在哪里。
 * 第一个名字是文件在压缩包里的位置，不动；第二个是去哪里取——
 * 收走过的文件要改成去 shared 取，这样下下来的单课依然是完整的。
 */
let manifestChanged = 0;
let manifestDropped = 0;
for (const [id, files] of lessons) {
  const loc = locOf.get(id);
  const file = path.join(COURSES, id, 'download.json');
  if (!fs.existsSync(file)) continue;
  const data = JSON.parse(readText(file));
  let touched = false;
  /* 清单里写着的路径，有的大小写跟真的对不上；先按真的那个名字找一遍。 */
  const realPath = new Map();
  for (const rel of files.keys()) realPath.set(rel.toLowerCase(), rel);
  const kept = [];
  const names = new Set();
  for (const entry of data.entries || []) {
    if (!Array.isArray(entry) || typeof entry[1] !== 'string') {
      kept.push(entry);
      continue;
    }
    /* 清单里的名字有两个斜杠的时候，先摆正，压缩包里才不会有两个同名的东西。 */
    if (typeof entry[0] === 'string' && entry[0].includes('//')) {
      entry[0] = posix.normalize(entry[0]);
      touched = true;
    }
    /* 有些清单里的路径写着双斜杠或者反斜杠，先摆正了再找。 */
    const full = entry[1];
    const raw = full.split('#')[0].split('?')[0];
    const slashed = raw.replace(/\\/g, '/');
    let target = posix.normalize(slashed);
    if (target !== slashed) {
      entry[1] = target + full.slice(raw.length);
      touched = true;
    }
    if (!files.has(target)) {
      const real = realPath.get(target.toLowerCase());
      if (real) {
        target = real;
        entry[0] = real;
        touched = true;
      } else {
        /* 指的那个东西根本不存在，留在清单里只会下到一个坏文件。 */
        manifestDropped += 1;
        touched = true;
        continue;
      }
    }
    const moved = loc.get(target);
    if (moved) {
      entry[1] = relativeTo('courseware/' + id + '/', moved);
      touched = true;
    }
    /* 摆正之后会有两个名字变成一样的，压缩包里只留一个。 */
    if (typeof entry[0] === 'string') {
      if (names.has(entry[0])) {
        manifestDropped += 1;
        touched = true;
        continue;
      }
      names.add(entry[0]);
    }
    kept.push(entry);
  }
  if (data.entries && data.entries.length !== kept.length) data.entries = kept;
  if (touched) {
    if (!DRY) fs.writeFileSync(file, JSON.stringify(data, null, 1));
    manifestChanged += 1;
  }
}

/* ------------------------------------------------------------ 落盘 --- */

if (!DRY) {
  for (const [rel, info] of sharedWrites) {
    const to = path.join(SHARED, rel);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    if (fs.existsSync(to)) continue;
    if (info.text != null) fs.writeFileSync(to, info.text);
    else fs.copyFileSync(info.abs, to);
  }
  /* 课件里的副本删掉，空了的文件夹也一并收走。 */
  for (const [id, loc] of locOf) {
    for (const rel of loc.keys()) {
      try {
        fs.rmSync(path.join(COURSES, id, rel), { force: true });
      } catch {
        /* 删不掉就留着，只是多占一点地方。 */
      }
    }
    const prune = (dir) => {
      let items = [];
      try {
        items = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return true;
      }
      if (!items.length) {
        try {
          fs.rmdirSync(dir);
        } catch {
          return false;
        }
        return true;
      }
      let empty = true;
      for (const it of items) {
        if (it.isDirectory()) {
          if (!prune(path.join(dir, it.name))) empty = false;
        } else empty = false;
      }
      return empty;
    };
    prune(path.join(COURSES, id));
  }
}

/* ------------------------------------------------------------ 报账 --- */

const mb = (n) => (n / 1048576).toFixed(0);
let saved = 0;
let movedCount = 0;
for (const [key, ids] of hoist) {
  const g = groupInfo.get(key);
  saved += g.size * (ids.size - 1);
  movedCount += ids.size;
}

console.log(`课件 ${lessons.size} 门，原体积 ${mb(totalBytes)} MB`);
console.log(`收走 ${hoist.size} 组、${movedCount} 份副本，shared 里留 ${sharedWrites.size} 个文件`);
console.log(
  `省下 ${mb(saved)} MB，改名的文件 ${changedFiles} 个，改过的清单 ${manifestChanged} 份` +
    (manifestDropped ? `，清掉的坏条目 ${manifestDropped} 个` : '')
);
if (dropped.size) {
  const why = new Map();
  const big = [];
  for (const [key, r] of dropped) {
    const e = why.get(r) || { n: 0, mb: 0 };
    e.n += 1;
    const g = groupInfo.get(key);
    e.mb += g ? g.size * Math.max(0, g.lessons.length - 1) : 0;
    why.set(r, e);
    if (g) big.push([r, g.rel, g.size, g.lessons.length]);
  }
  console.log('留在原处的组：');
  for (const [r, e] of [...why].sort((a, b) => b[1].mb - a[1].mb))
    console.log(`   ${e.n} 组 · ${r} · 本可省 ${mb(e.mb)} MB`);
  if (DEBUG_REF) {
    console.log('留在原处的大块：');
    for (const [r, rel, size, n] of big.sort((a, b) => b[2] - a[2]).slice(0, 25))
      console.log(`   ${mb(size)} MB × ${n} 门 · ${r} · ${rel}`);
  }
}

