#!/usr/bin/env node
/*
 * Mirrors the interactive physics simulations of 3JCN.
 *
 * 3JCN publishes more than three hundred small 3D physics laboratories
 * under a Creative Commons Attribution licence.  Each one is a single
 * page that draws into a canvas, so the mirror writes every program out
 * as one file: its own stylesheet and pictures are folded in, and the
 * public libraries it borrows are mirrored once and shared.
 *
 *   node tools/mirror-3jcn.mjs --pass list
 *   node tools/mirror-3jcn.mjs --pass shared
 *   node tools/mirror-3jcn.mjs --pass build --conc 8
 *   node tools/mirror-3jcn.mjs --pass catalog
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { translateTitle } from './aviary-titles.mjs';
import { translate3jcnTitle } from './3jcn-titles.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'mirror', '3jcn');
const CW = path.join(OUT, 'courseware');
const BRAND = path.join(OUT, 'brand');
const SHARED = path.join(OUT, 'shared');
const SCRATCH = path.join(ROOT, 'recon', 'scratch');
const PAGES = path.join(SCRATCH, '3jcn-pages');
const HOST = 'https://www.new3jcn.com';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const PASS = arg('pass', 'list');
const CONC = Number(arg('conc', 8));
const ONLY = arg('only', '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/126 Safari/537.36';

/*
 * The id the merged site knows the program by.  A few of the pages of
 * the site begin with "3jcn-" already, and the name is not doubled.
 */
const idOf = (slug) => (slug.startsWith('3jcn-') ? slug : `3jcn-${slug}`);

/*
 * A Chinese description for every laboratory.
 *
 * The laboratories of the site are written in English.  The library is
 * read in Chinese, so every card says in Chinese what the laboratory
 * lets a teacher do with it.  The English text of the site is kept
 * beside it in the catalogue, so nothing is lost.
 */
const KIND_TEXT = {
  力学与运动: '可调质量、速度与受力条件，观察运动与受力的关系',
  电磁学: '可调电荷、磁场与电流，观察场分布与电学现象',
  热学: '可调温度、压强与体积，观察能量转化与状态变化',
  光学: '可移动光源、透镜与物体，直接看到光路与成像的变化',
  近代物理: '可调参数观察原子、能级与辐射的变化',
  物理实验: '一步步跟着做，参数一改就能看到现象和数据',
};

const describeZh = (title, kind, fallback) => {
  const what = KIND_TEXT[kind] || '可调参数，直接观察物理过程';
  const text = `${title}：三维物理仿真，${what}。在线即可操作，也可以下载到本地离线使用。`;
  return text.length > 10 ? text : fallback;
};

/* ------------------------------------------------------------- fetching -- */

const cache = new Map();

async function grab(url, asBuffer = false) {
  const key = `${asBuffer ? 'b' : 't'}:${url}`;
  if (cache.has(key)) return cache.get(key);
  const p = (async () => {
    for (let i = 0; i < 5; i++) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 60000);
        const res = await fetch(url, {
          headers: { 'user-agent': UA, referer: `${HOST}/` },
          signal: ctrl.signal,
        });
        clearTimeout(timer);
        /* The site answers "try later" when it is asked too often. */
        if (res.status === 503 || res.status === 429 || res.status === 502) {
          await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
          continue;
        }
        if (!res.ok) return { status: res.status, body: '', data: null };
        if (asBuffer) {
          return { status: 200, body: '', data: Buffer.from(await res.arrayBuffer()) };
        }
        return { status: 200, body: await res.text(), data: null };
      } catch {
        await new Promise((r) => setTimeout(r, 1200 * (i + 1)));
      }
    }
    return { status: 0, body: '', data: null };
  })();
  cache.set(key, p);
  return p;
}

const dirOf = (abs) =>
  abs
    .replace(/^https?:\/\/[^/]+/, '')
    .replace(/[?#].*$/, '')
    .replace(/[^/]*$/, '');

function resolveFrom(fromAbs, ref) {
  if (!ref) return null;
  if (/^data:/i.test(ref)) return null;
  if (/^https?:\/\//i.test(ref)) {
    return ref
      .replace(/^http:\/\/www\.new3jcn\.com/i, HOST)
      .replace(/^https:\/\/www\.new3jcn\.com/i, HOST);
  }
  if (ref.startsWith('//')) return 'https:' + ref;
  if (ref.startsWith('/')) return HOST + ref;
  try {
    const url = new URL(ref, 'https://x' + dirOf(fromAbs));
    return HOST + url.pathname + url.search;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------- listing -- */

const CATEGORY_PAGES = [
  ['motion_category.html', '力学与运动'],
  ['thermo_category.html', '热学'],
  ['electricity_category.html', '电磁学'],
  ['optics_category.html', '光学'],
  ['modern_category.html', '近代物理'],
  ['labs_category.html', '物理实验'],
];

/*
 * The category pages hold their list in two shapes: buttons that send the
 * reader to the program, and cards that link to it.  Both are read the
 * same way — the address, the name and the picture of the card.
 */
function readButtons(html) {
  const out = [];
  /* A commented-out button would swallow the button that follows it. */
  html = html.replace(/<!--[\s\S]*?-->/g, '');
  const re = /<button\b([^>]*)>([\s\S]*?)<\/button>/gi;
  let m;
  while ((m = re.exec(html))) {
    const attrs = m[1];
    const body = m[2]
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const href =
      /location\.href\s*=\s*['"]([^'"]+)['"]/i.exec(attrs)?.[1] ||
      /onclick\s*=\s*['"]([^'"]+\.html)['"]/i.exec(attrs)?.[1];
    if (!href || !body) continue;
    out.push({ href, title: body });
  }
  return out;
}

function readCards(html) {
  const out = [];
  html = html.replace(/<!--[\s\S]*?-->/g, '');
  const re = /<a\b([^>]*href\s*=\s*["']([^"']+)["'][^>]*)>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html))) {
    const href = m[2];
    const body = m[3];
    const title =
      /<h3[^>]*>([\s\S]*?)<\/h3>/i.exec(body)?.[1] ||
      /<img[^>]+alt\s*=\s*["']([^'"]+)["']/i.exec(body)?.[1] ||
      '';
    const clean = title
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const img = /<img[^>]+src\s*=\s*["']([^"']+)["']/i.exec(body)?.[1] || '';
    if (!href || !clean) continue;
    out.push({ href, title: clean, img });
  }
  return out;
}

const slugOf = (href) =>
  href
    .replace(/^https?:\/\/[^/]+/i, '')
    .replace(/^https?:\/\//i, '')
    .replace(/\.html$/i, '')
    .replace(/^\//, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

async function listPrograms() {
  const seen = new Map();
  for (const [page, cat] of CATEGORY_PAGES) {
    const res = await grab(`${HOST}/${page}`);
    if (res.status !== 200) {
      console.log(`  ${page}: HTTP ${res.status}`);
      continue;
    }
    let n = 0;
    const items = [...readButtons(res.body), ...readCards(res.body)];
    for (const item of items) {
      const abs = resolveFrom(`${HOST}/${page}`, item.href);
      if (!abs || !/\.html$/i.test(abs)) continue;
      if (abs.startsWith(HOST + '/')) {
        const p = abs.slice(HOST.length);
        if (/^\/(index|about_3jcn|patent|contact|simulation|[a-z]+_category)\.html$/i.test(p)) continue;
        if (/contact-form/i.test(p)) continue;
      }
      const slug = slugOf(abs);
      if (!slug || seen.has(slug)) continue;
      seen.set(slug, {
        slug,
        url: abs,
        path: abs.slice(HOST.length),
        title: item.title,
        category: cat,
        thumb: item.img ? resolveFrom(`${HOST}/${page}`, item.img) : '',
      });
      n++;
    }
    console.log(`  ${page}: ${n}`);
  }
  return [...seen.values()];
}

/* -------------------------------------------------------- shared files -- */

/*
 * The libraries the programs borrow are the same for nearly all of them,
 * so they are mirrored once and shared.
 */
const SHARED_HOSTS = [
  'maxcdn.bootstrapcdn.com',
  'ajax.googleapis.com',
  'cdnjs.cloudflare.com',
  'cdn.jsdelivr.net',
  'unpkg.com',
  'threejs.org',
  'ga.jspm.io',
  'code.jquery.com',
  's3.amazonaws.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdn.skypack.dev',
  'www.new3jcn.com',
  'new3jcn.com',
  'gwosc.org',
];

const isSharedHost = (host) => SHARED_HOSTS.includes(host);

/* The names that point at a file rather than at a place. */
const ASSET_PATH =
  /\.(?:png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot|json|css|m?js|pdf|docx|txt|glb|gltf|hdr|wav|mp3|mp4)(?:[?#].*)?$/i;

/* A version number without its third part still names a real release. */
const withPatch = (v) => (/^\d+\.\d+\.\d+$/.test(v) ? v : `${v}.0`);

/*
 * A few of the addresses the site asks for have moved since the
 * programs were written.  The library that answers today stands in.
 */
function fixUrl(url) {
  let u = url.replace(/^http:\/\//i, 'https://');
  /* The site answers under two spellings; one folder holds them both. */
  u = u.replace(/^https:\/\/new3jcn\.com\//i, 'https://www.new3jcn.com/');
  u = u.replace(
    /^https:\/\/threejs\.org\/build\/three\.min\.js$/i,
    'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
  );
  u = u.replace(
    /^https:\/\/threejs\.org\/examples\/js\//i,
    'https://unpkg.com/three@0.128.0/examples/js/'
  );
  u = u.replace(
    /^https:\/\/ajax\.googleapis\.com\/ajax\/libs\/jquery\/([\d.]+)\//i,
    'https://cdnjs.cloudflare.com/ajax/libs/jquery/$1/'
  );
  u = u.replace(
    /^https:\/\/code\.jquery\.com\/jquery-([\d.]+)\.min\.js$/i,
    'https://cdnjs.cloudflare.com/ajax/libs/jquery/$1/jquery.min.js'
  );
  /* three.js moved to unpkg; the version may be missing its last part. */
  u = u.replace(
    /^https:\/\/cdn\.jsdelivr\.net\/npm\/three@(\d+\.\d+)(?:\.\d+)?\/(.*)$/i,
    (_, v, rest) => `https://unpkg.com/three@${withPatch(v)}/${rest}`
  );
  /* That one file is only in the newer layout. */
  u = u.replace(
    /^https:\/\/unpkg\.com\/three@0\.128\.0\/examples\/js\/loaders\/FontLoader\.js$/i,
    'https://unpkg.com/three@0.147.0/examples/jsm/loaders/FontLoader.js'
  );
  u = u.replace(
    /^https:\/\/unpkg\.com\/three@0\.149\.0\/examples\/jsm\/postprocessing\/OutputPass\.js$/i,
    'https://unpkg.com/three@0.158.0/examples/jsm/postprocessing/OutputPass.js'
  );
  u = u.replace(
    /^https:\/\/cdn\.jsdelivr\.net\/npm\/chart\.js$/i,
    'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.7.2/Chart.min.js'
  );
  u = u.replace(
    /^https:\/\/cdn\.jsdelivr\.net\/npm\/chart\.js@3\.7\.1$/i,
    'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.7.1/chart.min.js'
  );
  u = u.replace(
    /^https:\/\/cdn\.jsdelivr\.net\/npm\/chart\.js@4\.4\.7\/dist\/chart\.umd\.min\.js$/i,
    'https://unpkg.com/chart.js@4.4.7/dist/chart.umd.js'
  );
  u = u.replace(
    /^https:\/\/cdn\.jsdelivr\.net\/npm\/chartjs-plugin-annotation@([\d.]+)$/i,
    'https://unpkg.com/chartjs-plugin-annotation@$1/dist/chartjs-plugin-annotation.min.js'
  );
  u = u.replace(
    /^https:\/\/cdn\.jsdelivr\.net\/npm\/dat\.gui\/build\/dat\.gui\.module\.js$/i,
    'https://unpkg.com/dat.gui@0.7.9/build/dat.gui.module.js'
  );
  u = u.replace(
    /^https:\/\/ga\.jspm\.io\/npm:es-module-shims@([\d.]+)\//i,
    'https://unpkg.com/es-module-shims@$1/'
  );
  u = u.replace(
    /^https:\/\/cdn\.jsdelivr\.net\/npm\/es-module-shims@([\d.]+)\//i,
    'https://unpkg.com/es-module-shims@$1/'
  );
  u = u.replace(
    /^https:\/\/raw\.githubusercontent\.com\/mrdoob\/three\.js\/master\/examples\/fonts\//i,
    'https://threejs.org/examples/fonts/'
  );
  u = u.replace(
    /^https:\/\/cdn\.jsdelivr\.net\/npm\/bootstrap@([\d.]+)\/dist\/css\/bootstrap(\.min)\.css$/i,
    'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/$1/css/bootstrap$2.css'
  );
  /* The bundler that answered yesterday is gone; the plain modules serve. */
  u = u.replace(
    /^https:\/\/cdn\.skypack\.dev\/three@(\d+\.\d+(?:\.\d+)?)$/i,
    (_, v) => `https://unpkg.com/three@${withPatch(v)}/build/three.module.js`
  );
  u = u.replace(
    /^https:\/\/cdn\.skypack\.dev\/three@(\d+\.\d+(?:\.\d+)?)\/(.*)$/i,
    (_, v, rest) => `https://unpkg.com/three@${withPatch(v)}/${rest}.js`
  );
  u = u.replace(
    /^https:\/\/cdn\.rawgit\.com\/chandlerprall\/Physijs\/master\/examples\/js\/ammo\.js$/i,
    'https://unpkg.com/ammo.js@0.0.10/ammo.js'
  );
  u = u.replace(
    /^https:\/\/cdn\.jsdelivr\.net\/gh\/Sean-Bradley\/React-Three-Fiber-Boilerplate@obstacleCourse\/public\/img\/rustig_koppie_puresky_1k\.hdr$/i,
    'https://threejs.org/examples/textures/equirectangular/venice_sunset_1k.hdr'
  );
  return u;
}

const hostOf = (url) => {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
};

/* The path of an address, without the host and without the query. */
const pathOf = (url) => {
  try {
    return new URL(url).pathname.replace(/^\//, '');
  } catch {
    return '';
  }
};

/* Where a shared file is written, and how it is named in the catalogue. */
const sharedRel = (url) => `${hostOf(url)}/${pathOf(url)}`;
const sharedFile = (rel) => path.join(SHARED, ...rel.split('/'));

/* -------------------------------------------------------------- reading -- */

/*
 * Every absolute address the page names is found, not only the ones in
 * tags — a program may name its library inside its own script.
 */
const ABS_URL = /https?:\/\/[A-Za-z0-9._-]+\/[^\s"'<>()\\]+/g;

function absUrls(text) {
  const out = new Set();
  ABS_URL.lastIndex = 0;
  let m;
  while ((m = ABS_URL.exec(text))) {
    /* A closing bracket or a comma is not part of the address. */
    out.add(m[0].replace(/[)\]},;]+$/, ''));
  }
  return [...out];
}

/* The import maps of a page: the tables that give a short name a file. */
function parseImportMaps(html) {
  const maps = [];
  const re = /<script[^>]+type\s*=\s*["']importmap["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    const body = m[1]
      .trim()
      .replace(/^\/\*[\s\S]*?\*\//, '')
      .trim();
    let obj = null;
    try {
      obj = JSON.parse(body);
    } catch {
      try {
        obj = JSON.parse(body.replace(/,(\s*[}\]])/g, '$1'));
      } catch {
        obj = null;
      }
    }
    if (obj && obj.imports && typeof obj.imports === 'object') maps.push(obj);
  }
  return maps;
}

/* The short names the scripts of a page ask for. */
const BARE_RE = /(?:from|import)\s*["']([A-Za-z@][^"'\n]{0,200})["']/g;

function bareNames(text) {
  const out = new Set();
  BARE_RE.lastIndex = 0;
  let m;
  while ((m = BARE_RE.exec(text))) out.add(m[1]);
  return [...out];
}

/*
 * The files a document names.  A program reaches for its libraries in
 * three ways: a tag, a picture inside a style rule, and a name inside a
 * script.  All three are read here.
 */
const HTML_REFS = [
  /<script[^>]+src\s*=\s*["']([^"']+)["']/gi,
  /<link[^>]+href\s*=\s*["']([^"']+)["']/gi,
  /<img[^>]+src\s*=\s*["']([^"']+)["']/gi,
  /<source[^>]+src\s*=\s*["']([^"']+)["']/gi,
  /<audio[^>]+src\s*=\s*["']([^"']+)["']/gi,
  /<video[^>]+src\s*=\s*["']([^"']+)["']/gi,
  /url\(\s*["']?([^"')]+)["']?\s*\)/gi,
];
const CSS_REFS = [/url\(\s*["']?([^"')]+)["']?\s*\)/gi];
CSS_REFS.push(/@import\s+(?:url\()?\s*["']([^"')]+)["']/gi);
const JS_IMPORTS = [
  /(?:from|import)\s*["']([^"'\n]{1,240})["']/g,
  /import\s*\(\s*["']([^"'\n]{1,240})["']\s*\)/g,
];
const JS_STRINGS = [
  /["']([^"'\n]{1,240})["']/g,
];

/* The scripts that stand inside a page are read as scripts. */
function inlineScripts(html) {
  const out = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    if (/\bsrc\s*=/i.test(m[1])) continue;
    out.push(m[2]);
  }
  return out;
}

function refsOf(text, kind) {
  const out = new Set();
  const list = kind === 'css' ? CSS_REFS : kind === 'js' ? [] : HTML_REFS;
  for (const re of list) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) {
      const v = m[1].trim();
      if (!v || v.startsWith('#') || v.startsWith('data:')) continue;
      if (/\s/.test(v)) continue;
      out.add(v);
    }
  }
  if (kind === 'js') {
    for (const re of JS_IMPORTS) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text))) {
        const v = m[1].trim();
        if (!v || v.startsWith('#') || v.startsWith('data:')) continue;
        if (/\s/.test(v)) continue;
        out.add(v);
      }
    }
    /* A script may also name a file it fetches while it runs. */
    for (const re of JS_STRINGS) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text))) {
        const v = m[1].trim();
        if (!ASSET_PATH.test(v)) continue;
        if (/\s/.test(v)) continue;
        out.add(v);
      }
    }
  }
  if (kind === 'html') {
    for (const code of inlineScripts(text)) {
      for (const re of JS_IMPORTS) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(code))) {
          const v = m[1].trim();
          if (!v || v.startsWith('#') || v.startsWith('data:')) continue;
          if (/\s/.test(v)) continue;
          out.add(v);
        }
      }
      for (const re of JS_STRINGS) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(code))) {
          const v = m[1].trim();
          if (!ASSET_PATH.test(v)) continue;
          if (/\s/.test(v)) continue;
          out.add(v);
        }
      }
    }
  }
  return [...out];
}

/* The files a page names in its tags — the ones that are written down. */
function tagRefs(html) {
  const out = new Set();
  for (const re of HTML_REFS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(html))) {
      const v = m[1].trim();
      if (!v || v.startsWith('#') || v.startsWith('data:')) continue;
      if (/\s/.test(v)) continue;
      out.add(v);
    }
  }
  return [...out];
}

/*
 * A name of the site's own that ends in a page is a way to another
 * program, not a file that is needed.
 */
const isProgramLink = (url) =>
  hostOf(url) === 'www.new3jcn.com' && /\.html?($|\?)/i.test(url);

/* What a short name means, according to the maps of the page. */
function resolveBare(name, maps, baseUrl) {
  for (const imports of maps) {
    if (Object.prototype.hasOwnProperty.call(imports, name)) {
      const value = imports[name];
      try {
        return new URL(value, baseUrl).href;
      } catch {
        return null;
      }
    }
    for (const [key, value] of Object.entries(imports)) {
      if (!key.endsWith('/') || !name.startsWith(key)) continue;
      try {
        return new URL(value + name.slice(key.length), baseUrl).href;
      } catch {
        return null;
      }
    }
  }
  return null;
}

/*
 * A file that is named by a program but does not exist is looked for
 * under another name before it is given up on.
 */
const FALLBACKS = [
  [
    /^https:\/\/unpkg\.com\/three@0\.149\.0\/examples\/jsm\/postprocessing\/OutputPass\.js$/i,
    'https://unpkg.com/three@0.158.0/examples/jsm/postprocessing/OutputPass.js',
  ],
  [
    /^https:\/\/unpkg\.com\/three@0\.115\.0\/examples\/js\/loaders\//i,
    'https://unpkg.com/three@0.128.0/examples/js/loaders/',
  ],
];

async function grabShared(url) {
  const res = await grab(url, true);
  if (res.status === 200 && res.data) return res;
  /* A face of a cube that the site has deleted is taken from three.js. */
  const face = path.posix.basename(pathOf(url));
  if (CUBE_FACES[face]) {
    const second = await grab(`https://threejs.org/examples/textures/cube/${CUBE_FACES[face]}`, true);
    if (second.status === 200 && second.data) return second;
  }
  for (const [re, to] of FALLBACKS) {
    if (!re.test(url)) continue;
    const alt = url.replace(re, to);
    const second = await grab(alt, true);
    if (second.status === 200 && second.data) return second;
  }
  return res;
}

/*
 * The pictures of a cube that the site has deleted.  The names are the
 * usual ones, and three.js keeps a copy of each.
 */
const CUBE_FACES = {
  'px.png': 'pisa/px.png',
  'nx.png': 'pisa/nx.png',
  'py.png': 'pisa/py.png',
  'ny.png': 'pisa/ny.png',
  'pz.png': 'pisa/pz.png',
  'nz.png': 'pisa/nz.png',
  'posx.jpg': 'Bridge2/posx.jpg',
  'negx.jpg': 'Bridge2/negx.jpg',
  'posy.jpg': 'Bridge2/posy.jpg',
  'negy.jpg': 'Bridge2/negy.jpg',
  'posz.jpg': 'Bridge2/posz.jpg',
  'negz.jpg': 'Bridge2/negz.jpg',
};

/*
 * A few programs load a whole folder of files while they run, by joining
 * the address of the folder with the name of the file.  Those folders
 * are listed here with the files they hold.
 */
const RUNTIME_FOLDERS = [
  [
    'https://threejs.org/examples/textures/cube/pisa/',
    ['px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png'],
  ],
  [
    'https://threejs.org/examples/textures/cube/Bridge2/',
    ['posx.jpg', 'negx.jpg', 'posy.jpg', 'negy.jpg', 'posz.jpg', 'negz.jpg'],
  ],
  [
    'https://threejs.org/examples/jsm/libs/draco/gltf/',
    ['draco_decoder.js', 'draco_decoder.wasm', 'draco_wasm_wrapper.js'],
  ],
];

/* -------------------------------------------------------------- builder -- */

/* The tracker of the original site has no business in a local copy. */
const TRACKERS = /googletagmanager\.com|google-analytics\.com|google\.com\/analytics/i;

/*
 * A file that is shared keeps its own shape: the address it holds for
 * another file is written as a path relative to itself, so one copy
 * serves every program that names it.
 */
const relativeIn = (fromRel, toRel) => {
  const dir = path.posix.dirname(fromRel);
  let rel = path.posix.relative(dir, toRel);
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
};

/*
 * A picture the site has deleted is shown as a drawn placeholder, so no
 * broken picture is left in the copy.
 */
const PLACEHOLDER_REL = 'www.new3jcn.com/images/3jcn-placeholder.svg';
const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
<rect width="640" height="400" fill="#eef2f6"/>
<rect x="12" y="12" width="616" height="376" fill="none" stroke="#c8d4e0" stroke-width="2"/>
<circle cx="320" cy="176" r="54" fill="none" stroke="#9fb3c8" stroke-width="6"/>
<path d="M320 122 L320 230 M266 176 L374 176" stroke="#9fb3c8" stroke-width="6" stroke-linecap="round"/>
<text x="320" y="300" font-family="sans-serif" font-size="22" fill="#7d92a8" text-anchor="middle">3JCN</text>
</svg>
`;

async function placeholderFile(id) {
  const file = sharedFile(PLACEHOLDER_REL);
  if (!fs.existsSync(file)) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, PLACEHOLDER_SVG, 'utf8');
  }
  return `/api/program-assets/${id}/_ext/${PLACEHOLDER_REL}`;
}

async function buildProgram(program, html) {
  const id = idOf(program.slug);
  const missing = [];
  const mapObjects = parseImportMaps(html);
  const maps = mapObjects.map((m) => m.imports);
  /* The keys of a map keep their names — that is what the scripts ask for. */
  const mapKeys = new Set();
  for (const imports of maps) {
    for (const key of Object.keys(imports)) mapKeys.add(key);
  }

  /* Every file a program names is mirrored once and shared. */
  const need = async (abs) => {
    /* A host on its own is a place, not a file. */
    if (!pathOf(abs)) return null;
    const rel = sharedRel(abs);
    const file = sharedFile(rel);
    /* A folder on the site is a folder here as well. */
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) return null;
    if (fs.existsSync(file) && fs.statSync(file).size > 0) return rel;
    const res = await grabShared(abs);
    if (res.status !== 200 || !res.data) {
      missing.push(abs);
      return null;
    }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, res.data);
    return rel;
  };

  /* The address a program uses for a file it names. */
  const localOf = async (abs) => {
    const fixed = fixUrl(abs);
    /* A place, not a file: the folder it stands for. */
    if (!pathOf(fixed) || fixed.endsWith('/')) {
      return `/api/program-assets/${id}/_ext/${hostOf(fixed)}/${pathOf(fixed)}`;
    }
    const rel = await need(fixed);
    if (!rel) {
      /* A folder the site names is a folder here as well. */
      const file = sharedFile(sharedRel(fixed));
      if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
        return `/api/program-assets/${id}/_ext/${sharedRel(fixed)}/`;
      }
      return null;
    }
    return `/api/program-assets/${id}/_ext/${rel}`;
  };

  let out = html;

  /* The map that gives a short name a file is pointed at the local copy. */
  const newMaps = [];
  for (const imports of maps) {
    const next = {};
    for (const [key, value] of Object.entries(imports)) {
      if (typeof value !== 'string') {
        next[key] = value;
        continue;
      }
      let abs = null;
      try {
        abs = new URL(value, program.url).href;
      } catch {
        abs = null;
      }
      if (!abs) {
        next[key] = value;
        continue;
      }
      const fixed = fixUrl(abs);
      if (!isSharedHost(hostOf(fixed))) {
        next[key] = value;
        continue;
      }
      /* A name that stands for a folder keeps its last slash. */
      if (fixed.endsWith('/')) {
        const rel = sharedRel(fixed.replace(/\/$/, ''));
        next[key] = `/api/program-assets/${id}/_ext/${rel}/`;
        continue;
      }
      const local = await localOf(fixed);
      next[key] = local || value;
    }
    newMaps.push(next);
  }

  /*
   * The names in the scripts are pointed at the local copies too, so a
   * program can be opened from disk without the network.  Only the name
   * inside its quotes is touched — "three" is a short word and appears
   * in many other places.
   */
  for (const name of bareNames(out)) {
    if (mapKeys.has(name)) continue;
    let local = null;
    if (/^https?:/i.test(name)) {
      local = await localOf(name);
    } else {
      const abs = resolveBare(name, maps, program.url);
      if (!abs) continue;
      const fixed = fixUrl(abs);
      if (!isSharedHost(hostOf(fixed))) continue;
      local = await localOf(fixed);
    }
    if (!local) continue;
    out = out.split(`"${name}"`).join(`"${local}"`);
    out = out.split(`'${name}'`).join(`'${local}'`);
  }

  /* The scripts, the stylesheets and the pictures of the page. */
  const refs = tagRefs(out);

  /* The tracker of the site has no business in a local copy. */
  out = out.replace(
    /<iframe[^>]+src\s*=\s*["'][^"']*googletagmanager[^"']*["'][^>]*>\s*<\/iframe>/gi,
    ''
  );
  out = out.replace(
    /<script[^>]+src\s*=\s*["'][^"']*(?:googletagmanager|google-analytics)[^"']*["'][^>]*>\s*<\/script>/gi,
    ''
  );

  const localByRef = new Map();
  for (const ref of refs) {
    /* An address that is already local is left alone. */
    if (ref.startsWith('/api/')) continue;
    const abs = resolveFrom(program.url, ref);
    if (!abs) continue;
    if (TRACKERS.test(abs)) {
      out = out.split(ref).join('');
      continue;
    }
    const fixed = fixUrl(abs);
    if (!isSharedHost(hostOf(fixed))) continue;
    if (hostOf(fixed) === 'fonts.googleapis.com') continue;
    if (isProgramLink(fixed)) continue;
    const local = await localOf(fixed);
    if (!local) {
      /* A picture the site has deleted is shown as a drawn placeholder. */
      if (/\.(?:png|jpe?g|gif|webp|svg|avif|bmp)$/i.test(ref)) {
        localByRef.set(ref, await placeholderFile(id));
      }
      continue;
    }
    localByRef.set(ref, local);
  }

  /* The addresses in the tags are pointed at the local copies. */
  const swap = (v) => localByRef.get(v) || v;
  out = out.replace(
    /(<script[^>]+src\s*=\s*["'])([^"']+)(["'])/gi,
    (m, a, v, b) => `${a}${swap(v)}${b}`
  );
  out = out.replace(
    /(<link[^>]+href\s*=\s*["'])([^"']+)(["'])/gi,
    (m, a, v, b) => `${a}${swap(v)}${b}`
  );
  out = out.replace(
    /(<(?:img|source|audio|video)[^>]+src\s*=\s*["'])([^"']+)(["'])/gi,
    (m, a, v, b) => `${a}${swap(v)}${b}`
  );
  out = out.replace(
    /url\(\s*["']?([^"')]+)["']?\s*\)/gi,
    (m, v) => `url("${swap(v)}")`
  );

  /*
   * A page may open a file of the site from a button, and that address
   * is written inside the code of the button.  It is relative to the
   * page, so it is read the same way and pointed at the local copy.
   *
   * A button that offers a file the site no longer keeps is taken out
   * with its whole tag, so the copy never carries a dead button.  A
   * button that sends the reader to another site is taken out as well:
   * this library is whole on its own, and such a button only leads out
   * of it.
   */
  {
    const local = new Map();
    for (const m of out.matchAll(
      /(?:location\.href|window\.open)\s*[=(]\s*["']([^"']+)["']/gi
    )) {
      const ref = m[1].trim();
      if (!ref || ref.startsWith('#') || ref.startsWith('data:')) continue;
      if (/^(?:https?:)?\/\//i.test(ref) || ref.startsWith('/')) {
        /* An address that is already whole is pointed at later. */
        continue;
      }
      if (local.has(ref)) continue;
      const abs = resolveFrom(program.url, ref);
      if (!abs) continue;
      const fixed = fixUrl(abs);
      if (!isSharedHost(hostOf(fixed))) continue;
      if (isProgramLink(fixed)) continue;
      const path = await localOf(fixed);
      if (path) local.set(ref, path);
    }
    const gone = new Set();
    out = out.replace(/<input\b[^>]*>/gi, (tag) => {
      const m = /location\.href\s*=\s*["']([^"']+)["']/i.exec(tag);
      if (!m) return tag;
      const ref = m[1].trim();
      if (local.has(ref)) {
        return tag.replace(
          /(location\.href\s*=\s*["'])([^"']+)(["'])/i,
          (x, a, v, b) => `${a}${local.get(v)}${b}`
        );
      }
      /* Another program of the site is pointed at the local copy later. */
      {
        const abs = resolveFrom(program.url, ref);
        if (abs && isProgramLink(fixUrl(abs))) return tag;
      }
      /* An address that is already local is left alone. */
      if (ref.startsWith('/') || ref.startsWith('#')) return tag;
      /* Another site is out of this library. */
      if (/^(?:https?:)?\/\//i.test(ref)) {
        if (/new3jcn\.com/i.test(ref)) {
          gone.add(ref);
          return '';
        }
        return '';
      }
      /* A file of the site that is not here any more. */
      gone.add(ref);
      return '';
    });
    if (local.size) {
      out = out.replace(
        /(window\.open\(\s*["'])([^"']+)(["'])/gi,
        (m, a, v, b) => (local.has(v) ? `${a}${local.get(v)}${b}` : m)
      );
    }
    for (const ref of gone) missing.push(ref);
  }

  /*
   * A program may also name a file inside its own script — a texture it
   * loads, a sound it plays.  Those addresses are pointed at the local
   * copies too, so the program keeps working without the network.
   */
  for (const raw of absUrls(out)) {
    if (raw.startsWith('/api/')) continue;
    const fixed = fixUrl(raw);
    if (!isSharedHost(hostOf(fixed))) continue;
    if (isProgramLink(fixed)) continue;
    if (TRACKERS.test(fixed)) {
      out = out.split(raw).join('');
      continue;
    }
    const local = await localOf(fixed);
    if (!local) continue;
    out = out.split(raw).join(local);
  }

  /* The Google Fonts stylesheet is put into the page. */
  {
    const sheetFile = path.join(OUT, 'fontcss', `${program.slug}.css`);
    if (fs.existsSync(sheetFile)) {
      let sheet = fs.readFileSync(sheetFile, 'utf8');
      const selfRel = 'fonts.googleapis.com/css';
      for (const abs of absUrls(sheet)) {
        if (hostOf(abs) !== 'fonts.gstatic.com') continue;
        const rel = await need(abs);
        if (!rel) continue;
        sheet = sheet.split(abs).join(relativeIn(selfRel, rel));
      }
      out = out.replace(
        /<link[^>]+href\s*=\s*["'][^"']*fonts\.googleapis\.com[^"']*["'][^>]*>/gi,
        `<style>\n${sheet}\n</style>`
      );
    }
  }

  /* The map of the page is written again, with the local addresses in it. */
  {
    let at = 0;
    out = out.replace(
      /(<script[^>]+type\s*=\s*["']importmap["'][^>]*>)([\s\S]*?)(<\/script>)/gi,
      (m, open, body, close) => {
        const index = newMaps[at] || {};
        at++;
        const obj = { ...(mapObjects[at - 1] || {}) };
        obj.imports = index;
        return `${open}\n${JSON.stringify(obj, null, 2)}\n${close}`;
      }
    );
  }

  /* A program that points at another program points at the local copy. */
  out = out.replace(
    /(location\.href\s*=\s*["'])(https?:\/\/(?:www\.)?new3jcn\.com\/[^"']+\.html)(["'])/gi,
    (m, a, url, b) => {
      const slug = slugOf(url);
      if (!slug) return m;
      return `${a}/courseware/${idOf(slug)}?local=1${b}`;
    }
  );
  out = out.replace(
    /(href\s*=\s*["'])(https?:\/\/(?:www\.)?new3jcn\.com\/[^"']+\.html)(["'])/gi,
    (m, a, url, b) => {
      const slug = slugOf(url);
      if (!slug) return m;
      return `${a}/courseware/${idOf(slug)}?local=1${b}`;
    }
  );
  /* A program that shows another program in a frame shows the local one. */
  out = out.replace(
    /(<iframe[^>]+src\s*=\s*["'])(https?:\/\/(?:www\.)?new3jcn\.com\/[^"']+\.html)(["'])/gi,
    (m, a, url, b) => {
      const slug = slugOf(url);
      if (!slug) return m;
      return `${a}/courseware/${idOf(slug)}?local=1${b}`;
    }
  );

  /* The name of the program is also the name of the browser tab. */
  out = out.replace(/<title>[\s\S]*?<\/title>/i, '<title>乐启享 · 物理实验</title>');

  /*
   * The statistics of the site have no business in a local copy.  They
   * are written as a little piece of code that builds the request when
   * the page opens, so the whole piece is taken out.
   */
  out = out.replace(
    /<!--\s*(?:Google Tag Manager|Google Analytics|Google tag)\s*-->\s*<script[\s\S]*?<\/script>/gi,
    ''
  );
  out = out.replace(
    /<script[^>]+src\s*=\s*["'][^"']*googletagmanager[^"']*["'][^>]*>\s*<\/script>/gi,
    ''
  );

  /*
   * A few pages of the site are sheets of work: they describe a
   * laboratory and point at the simulation it belongs to.  The
   * simulation is put into the page, so opening the sheet opens the
   * laboratory itself and not a picture of it.
   */
  if (!/<canvas/i.test(out) && !/three@/i.test(out)) {
    const sheet = /<a[^>]+href\s*=\s*["'](?:\/courseware\/)?([a-z0-9-]+)\?local=1["']/i.exec(
      out
    );
    if (sheet) {
      const frame =
        `\n  <!-- The laboratory itself, put into the sheet -->\n` +
        `  <iframe src="/courseware/${sheet[1]}?local=1" title="物理实验仿真"\n` +
        `          style="width:100%;height:min(72vh,680px);border:1px solid #2a3550;\n` +
        `                 border-radius:12px;background:#0b1020;display:block;margin:18px auto;">\n` +
        `  </iframe>\n`;
      out = out.replace(/<main[^>]*>/i, (m) => `${m}\n${frame}`);
    }
  }

  return { html: out, missing };
}

/* ------------------------------------------------------------------ run -- */

fs.mkdirSync(SCRATCH, { recursive: true });
fs.mkdirSync(CW, { recursive: true });
fs.mkdirSync(BRAND, { recursive: true });
fs.mkdirSync(PAGES, { recursive: true });

const programsFile = path.join(SCRATCH, '3jcn-programs.json');

/* The page of a program, read from the cache when it is already there. */
async function pageOf(program) {
  const file = path.join(PAGES, `${program.slug}.html`);
  if (fs.existsSync(file) && fs.statSync(file).size > 500) {
    return fs.readFileSync(file, 'utf8');
  }
  const res = await grab(program.url);
  if (res.status !== 200) return '';
  fs.writeFileSync(file, res.body, 'utf8');
  return res.body;
}

if (PASS === 'list') {
  console.log('reading the lists of the site');
  const programs = await listPrograms();
  console.log(`${programs.length} programs in total`);
  fs.writeFileSync(programsFile, JSON.stringify(programs, null, 2));
} else if (PASS === 'shared') {
  const programs = JSON.parse(fs.readFileSync(programsFile, 'utf8'));
  const wanted = new Map();
  const fontCss = new Map();

  /* The folders a program loads whole while it runs. */
  for (const [folder, files] of RUNTIME_FOLDERS) {
    for (const name of files) {
      const abs = folder + name;
      if (!wanted.has(abs)) wanted.set(abs, { url: abs });
    }
  }

  /*
   * Every file a program reaches for is followed: the libraries name the
   * files they need, and those are followed as well, so nothing is left
   * pointing at the network.
   */
  const seen = new Set();
  /*
   * A library names the files it needs inside itself.  Those names are
   * followed too, so a module that reaches for a shader of its own
   * finds it in the mirror as well.
   */
  const walkInto = async (url) => {
    if (!/\.(?:m?js|css)(?:$|\?)/i.test(url)) return;
    const res = await grab(url);
    if (res.status !== 200) return;
    const kind = /\.css(?:$|\?)/i.test(url) ? 'css' : 'js';
    await walk(url, res.body, kind);
  };
  const walk = async (baseUrl, text, kind) => {
    for (const ref of refsOf(text, kind)) {
      let abs = null;
      try {
        abs = fixUrl(new URL(ref, baseUrl).href);
      } catch {
        continue;
      }
      const host = hostOf(abs);
      if (!isSharedHost(host)) continue;
      if (isProgramLink(abs)) continue;
      if (TRACKERS.test(abs)) continue;
      if (host === 'fonts.googleapis.com') continue;
      if (seen.has(abs)) continue;
      seen.add(abs);
      wanted.set(abs, { url: abs });
      if (!/\.(?:m?js|css)(?:$|\?)/i.test(abs)) continue;
      const res = await grab(abs);
      if (res.status !== 200) continue;
      const kind2 = /\.css(?:$|\?)/i.test(abs) ? 'css' : 'js';
      await walk(abs, res.body, kind2);
    }
  };

  let cursor = 0;
  async function worker() {
    for (;;) {
      const i = cursor++;
      if (i >= programs.length) return;
      const program = programs[i];
      const html = await pageOf(program);
      if (!html) {
        console.log(`  miss ${program.slug}`);
        continue;
      }
      const maps = parseImportMaps(html);

      /* The names the scripts ask for are read through the maps. */
      for (const name of bareNames(html)) {
        if (/^https?:/i.test(name)) {
          const abs = fixUrl(name);
          if (!isSharedHost(hostOf(abs))) continue;
          if (isProgramLink(abs)) continue;
          if (!seen.has(abs)) {
            seen.add(abs);
            wanted.set(abs, { url: abs });
            await walkInto(abs);
          }
          continue;
        }
        const abs = resolveBare(name, maps, program.url);
        if (!abs) continue;
        const fixed = fixUrl(abs);
        if (!isSharedHost(hostOf(fixed))) continue;
        if (isProgramLink(fixed)) continue;
        if (!seen.has(fixed)) {
          seen.add(fixed);
          wanted.set(fixed, { url: fixed });
          await walkInto(fixed);
        }
      }

      /* The addresses the page writes out in full are read as they are. */
      for (const raw of absUrls(html)) {
        const abs = fixUrl(raw);
        const host = hostOf(abs);
        if (!isSharedHost(host)) continue;
        if (isProgramLink(abs)) continue;
        if (TRACKERS.test(abs)) continue;
        if (host === 'fonts.googleapis.com') {
          const sheet = await grab(abs);
          if (sheet.status !== 200) continue;
          fontCss.set(program.slug, sheet.body);
          for (const face of absUrls(sheet.body)) {
            if (hostOf(face) !== 'fonts.gstatic.com') continue;
            if (seen.has(face)) continue;
            seen.add(face);
            wanted.set(face, { url: face });
          }
          continue;
        }
        if (seen.has(abs)) continue;
        seen.add(abs);
        wanted.set(abs, { url: abs });
      }

      /* The files the page names in full are followed as well. */
      await walk(program.url, html, 'html');
    }
  }
  await Promise.all(Array.from({ length: CONC }, () => worker()));

  console.log(`shared libraries: ${wanted.size}`);
  let done = 0;
  let failed = 0;
  /* The deepest files are written first, so a name that stands for a
     folder is never mistaken for a file of its own. */
  const ordered = [...wanted.entries()].sort((a, b) => {
    const d = pathOf(b[0]).split('/').length - pathOf(a[0]).split('/').length;
    return d;
  });
  for (const [url, info] of ordered) {
    /* A name that stands for a folder is not a file of its own. */
    if (url.endsWith('/')) {
      info.rel = '';
      info.prefix = true;
      continue;
    }
    const rel = sharedRel(url);
    const file = sharedFile(rel);
    if (fs.existsSync(file) && fs.statSync(file).size > 0) {
      info.rel = rel;
      info.bytes = fs.statSync(file).size;
      info.file = path.relative(OUT, file).split(path.sep).join('/');
      done++;
      continue;
    }
    const res = await grabShared(url);
    if (res.status !== 200 || !res.data) {
      failed++;
      console.log(`  miss ${url}`);
      continue;
    }
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, res.data);
    } catch {
      /* A name that is a folder on the site is not a file here either. */
      continue;
    }
    info.rel = rel;
    info.bytes = res.data.length;
    info.file = path.relative(OUT, file).split(path.sep).join('/');
    done++;
  }
  const index = [...wanted.values()];
  fs.writeFileSync(path.join(OUT, 'shared.json'), JSON.stringify(index, null, 2));
  fs.mkdirSync(path.join(OUT, 'fontcss'), { recursive: true });
  for (const [slug, css] of fontCss) {
    fs.writeFileSync(path.join(OUT, 'fontcss', `${slug}.css`), css, 'utf8');
  }
  console.log(`  mirrored ${done}, missed ${failed}`);
  console.log(`  font sheets: ${fontCss.size}`);
} else if (PASS === 'catalog') {
  const programs = JSON.parse(fs.readFileSync(programsFile, 'utf8'));
  const catalog = [];
  const seen = new Set();
  for (const program of programs) {
    const file = path.join(CW, `${program.slug}.html`);
    if (!fs.existsSync(file)) continue;
    if (seen.has(program.slug)) continue;
    seen.add(program.slug);
    const html = fs.readFileSync(file, 'utf8');
    /* The names of these laboratories are written in English on the site.
       The library is read in Chinese, so the name is carried over first
       from the hand-made table and only then from the word-by-word
       reader.  The English name stays beside it in the catalogue. */
    const title =
      translate3jcnTitle(program.title) === program.title
        ? translateTitle(program.title)
        : translate3jcnTitle(program.title);
    const patched = html.replace(
      /<title>[\s\S]*?<\/title>/i,
      `<title>乐启享 · ${title}</title>`
    );
    if (patched !== html) fs.writeFileSync(file, patched, 'utf8');
    const desc =
      /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i.exec(html)?.[1] || '';
    const cover = path.join(BRAND, `${program.slug}.png`);
    catalog.push({
      slug: program.slug,
      title,
      titleEn: program.title,
      subject: '物理',
      subjects: ['物理'],
      stages: ['初中', '高中'],
      stage: '高中',
      description: describeZh(title, program.category, desc),
      descriptionEn: desc.replace(/\s+/g, ' ').trim(),
      credits: '3JCN Physics Simulation · Thomas Nguyen',
      cover: fs.existsSync(cover) ? `/brand/3jcn/${program.slug}.png` : '',
      sourceUrl: program.url,
      license: 'CC BY 4.0 (3JCN Physics Simulation)',
      kind: program.category,
    });
  }
  catalog.sort((a, b) => a.title.localeCompare(b.title, 'zh'));
  fs.writeFileSync(path.join(OUT, 'catalog.json'), JSON.stringify(catalog, null, 2));
  fs.writeFileSync(
    path.join(OUT, 'NOTICE.md'),
    [
      '# 3JCN Physics Simulation',
      '',
      '这些交互物理仿真来自 [3JCN Physics Simulation](https://www.new3jcn.com)，',
      '由 Thomas Nguyen 编写，按 CC BY 4.0 许可公开。',
      '',
      '## 乐启享的改编与再创作',
      '',
      '本目录里的课件由乐启享机器人（[codebn.cn](https://codebn.cn/)）整理、改编并本地化后收录。',
      '乐启享完成的工作有：中文标题与中文说明的撰写、封面截图与品牌接入、',
      '脚本与样式表与字体与模型与贴图的本地化改写、离线打包与本地服务，',
      '以及课件质量的分级筛选（结论见 `mirror/leqixiang/quality-decisions.json`）。',
      '仿真本身的著作权仍属于原作者；上游链接、作者署名与许可协议一并保留在下面，',
      '并写进目录条目的 `author` / `license` / `sourceUrl` 字段里。',
      '',
      '- 每一门仿真都被存成一个完整的 HTML 文件：样式表和图片都收在文件里。',
      '- 打开这个文件不需要联网，双击即可在浏览器里使用。',
      '- 原始站点的名称写在每一门仿真的说明里，浏览器标签显示的是乐启享的名字。',
      '- 原始站点带有访问统计，本地副本不包含统计代码。',
      '',
    ].join('\n')
  );
  console.log(`catalogue: ${catalog.length} programs`);
} else {
  const programs = JSON.parse(fs.readFileSync(programsFile, 'utf8'));
  const wanted = ONLY.length
    ? programs.filter((p) => ONLY.includes(p.slug) || ONLY.includes(p.path))
    : programs;
  console.log(`building ${wanted.length} programs`);

  const results = [];
  let done = 0;
  let failed = 0;
  let cursor = 0;

  async function worker() {
    for (;;) {
      const i = cursor++;
      if (i >= wanted.length) return;
      const program = wanted[i];
      try {
        const html = await pageOf(program);
        if (!html) {
          failed++;
          continue;
        }
        const built = await buildProgram(program, html);
        fs.writeFileSync(path.join(CW, `${program.slug}.html`), built.html, 'utf8');
        results.push({
          slug: program.slug,
          title: program.title,
          kind: program.category,
          sourceUrl: program.url,
          bytes: Buffer.byteLength(built.html),
          missing: built.missing,
        });
        if (built.missing.length) {
          console.log(`  hole ${program.slug}: ${built.missing.slice(0, 3).join(', ')}`);
        }
        done++;
        if (done % 20 === 0) console.log(`  built ${done}/${wanted.length}`);
      } catch (e) {
        failed++;
        console.log(`  fail ${program.slug}: ${e.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONC }, () => worker()));

  const catalog = results
    .map((r) => ({
      slug: r.slug,
      title: r.title,
      titleEn: r.title,
      subject: '物理',
      subjects: ['物理'],
      stages: ['初中', '高中'],
      stage: '高中',
      description: '',
      credits: '3JCN Physics Simulation · Thomas Nguyen',
      cover: `/brand/3jcn/${r.slug}.png`,
      sourceUrl: r.sourceUrl,
      license: 'CC BY 4.0 (3JCN Physics Simulation)',
      kind: r.kind,
    }))
    .sort((a, b) => a.title.localeCompare(b.title, 'en'));

  fs.writeFileSync(path.join(OUT, 'catalog.json'), JSON.stringify(catalog, null, 2));
  console.log(`done: ${catalog.length} built, ${failed} skipped`);
}
