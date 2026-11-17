#!/usr/bin/env node
/*
 * Mirrors the interactive programs of The Physics Aviary.
 *
 * Every program on that site is a small HTML5 laboratory: one page, one
 * script, one stylesheet and a handful of pictures.  Nothing has to be
 * built, so each program is written out as a single self-contained file
 * with the stylesheets, the scripts, the pictures and the word lists
 * folded into it.  The result opens from the disk with no connection at
 * all, and a teacher can hand a student exactly one file.
 *
 * The site publishes the programs for classroom use at no charge; the
 * name of the author is kept in the notice next to the mirror.
 *
 *   node tools/mirror-aviary.mjs --pass list
 *   node tools/mirror-aviary.mjs --pass build --conc 8
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { translateTitle } from './aviary-titles.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'mirror', 'aviary');
const CW = path.join(OUT, 'courseware');
const BRAND = path.join(OUT, 'brand');
const SCRATCH = path.join(ROOT, 'recon', 'scratch');
const HOST = 'https://thephysicsaviary.com';

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

/* ------------------------------------------------------------- fetching -- */

const cache = new Map();

async function grab(url, asBuffer = false) {
  /* The same address is asked for twice — once as text, once as bytes —
     so the two answers are kept apart. */
  const key = `${asBuffer ? 'b' : 't'}:${url}`;
  if (cache.has(key)) return cache.get(key);
  const p = (async () => {
    for (let i = 0; i < 3; i++) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 60000);
        const res = await fetch(url, {
          headers: { 'user-agent': UA, referer: `${HOST}/` },
          signal: ctrl.signal,
        });
        clearTimeout(timer);
        if (!res.ok) return { status: res.status, body: '', data: null };
        if (asBuffer) {
          return { status: 200, body: '', data: Buffer.from(await res.arrayBuffer()) };
        }
        return { status: 200, body: await res.text(), data: null };
      } catch {
        await new Promise((r) => setTimeout(r, 600 * (i + 1)));
      }
    }
    return { status: 0, body: '', data: null };
  })();
  cache.set(key, p);
  return p;
}

/* ------------------------------------------------------------- addresses -- */

const dirOf = (abs) =>
  abs
    .replace(/^https?:\/\/[^/]+/, '')
    .replace(/[?#].*$/, '')
    .replace(/[^/]*$/, '');

/*
 * A reference is read the way the browser would read it: relative to the
 * file that holds it, or from the root of the site.
 */
function resolveFrom(fromAbs, ref) {
  if (!ref) return null;
  if (/^data:/i.test(ref)) return null;
  /* Some programs name the site with a www in front and without a
     secure address; both spellings lead to the same picture. */
  if (/^https?:\/\//i.test(ref)) {
    return ref
      .replace(/^http:\/\/www\.thephysicsaviary\.com/i, HOST)
      .replace(/^https:\/\/www\.thephysicsaviary\.com/i, HOST);
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

const mimeOf = (p) => {
  const ext = p.split('?')[0].split('#')[0].toLowerCase().split('.').pop();
  return (
    {
      html: 'text/html',
      js: 'text/javascript',
      mjs: 'text/javascript',
      css: 'text/css',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      webp: 'image/webp',
      wav: 'audio/wav',
      mp3: 'audio/mpeg',
      ogg: 'audio/ogg',
      mp4: 'video/mp4',
      json: 'application/json',
    }[ext] || 'application/octet-stream'
  );
};

/* -------------------------------------------------------------- listings -- */

const LIST_POSTS = [
  ['labs', '/Physics/Programs/Labs/find.php', '物理实验'],
  ['games', '/Physics/Programs/Games/find.php', '物理游戏'],
  ['tools', '/Physics/Programs/Tools/find.php', '物理工具'],
  ['homework', '/Physics/APPrograms/find.php', '课业练习'],
];

async function listPrograms() {
  const all = [];
  for (const [name, url, kind] of LIST_POSTS) {
    const res = await fetch(HOST + url, {
      method: 'POST',
      headers: {
        'user-agent': UA,
        'content-type': 'application/x-www-form-urlencoded',
        referer: `${HOST}/Physics/index.php`,
      },
      body: new URLSearchParams({
        ProgramName: '',
        ProgramType: '0',
        AvailableLanguages: 'en',
        UnitID: '0',
        ClassID: '0',
        KeyWords: '',
      }).toString(),
    });
    const html = await res.text();
    const re =
      /class\s*=\s*"ProgramTitle"\s+onClick\s*=\s*'location\.href\s*=\s*"([^"]+)"'\s*>([^<]*)</g;
    let m;
    const seen = new Set();
    while ((m = re.exec(html))) {
      const href = m[1].trim().replace(/\/$/, '');
      if (!href.startsWith('/') || seen.has(href)) continue;
      seen.add(href);
      all.push({
        href,
        title: m[2].trim(),
        kind,
        list: name,
        folder: href.split('/').pop(),
        base: href + '/',
      });
    }
    console.log(`  ${name}: ${seen.size}`);
  }
  return all;
}

/* ------------------------------------------------------------- resources -- */

const ASSET_PATH =
  /\.(?:png|jpe?g|gif|svg|webp|wav|mp3|ogg|mp4|json|php|css|js|woff2?)(?:[?#].*)?$/i;

const REF_HTML = [
  /<script[^>]+src\s*=\s*["']([^"']+)["']/gi,
  /<link[^>]+href\s*=\s*["']([^"']+?\.css(?:\?[^"']*)?)["']/gi,
  /<img[^>]+src\s*=\s*["']([^"']+)["']/gi,
  /url\(\s*["']?([^"')]+)["']?\s*\)/gi,
];
const REF_CSS = [/url\(\s*["']?([^"')]+)["']?\s*\)/gi];
const REF_JS = [/["']([^"'\n]{1,200})["']/g];

/*
 * Two of the games ask the server for a list of the chemical elements
 * they do not use.  The list is fetched here and put into the program,
 * so the program never has to ask the network for it.
 */
const EXTRA_FILES = {
  ElementSymbols: ['fillusedelementarray.php'],
  PENChallenge: ['fillusedelementarray.php'],
};

/*
 * The patterns carry the global flag, so the cursor has to be put back to
 * the start of the text before every use — otherwise the second program
 * would be searched from where the first one stopped.
 */
function refsIn(text, kind = 'html') {
  const out = new Set();
  const list = kind === 'css' ? REF_CSS : kind === 'js' ? REF_JS : REF_HTML;
  for (const re of list) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) {
      const v = m[1].trim();
      if (kind === 'js' && !ASSET_PATH.test(v)) continue;
      if (!v || v.startsWith('#')) continue;
      out.add(v);
    }
  }
  return [...out];
}

/* --------------------------------------------------------------- collect -- */

/*
 * Everything a program is made of is collected before anything is written:
 * the files the page names, and the files those files name in turn.  A
 * reference is always read relative to the file that holds it, so a
 * shared file that lives at the root of the site finds its own pictures
 * and not the ones of the program that happens to use it.
 */
async function collect(program) {
  const pageUrl = HOST + program.href + '/';
  const page = await grab(pageUrl);
  if (page.status !== 200) return null;

  const assets = new Map();
  const rewrites = new Map();
  const queue = [];

  const add = (ref, fromAbs) => {
    const abs = resolveFrom(fromAbs, ref);
    if (!abs) return;
    if (!assets.has(abs)) {
      assets.set(abs, { abs, ref, from: fromAbs });
      queue.push(abs);
    }
  };

  for (const ref of refsIn(page.body, 'html')) add(ref, pageUrl);
  for (const ref of EXTRA_FILES[program.folder] || []) add(ref, pageUrl);

  let guard = 0;
  while (queue.length && guard++ < 4000) {
    const abs = queue.shift();
    if (!/\.(?:js|css)(?:[?#]|$)/i.test(abs)) continue;
    const sub = await grab(abs);
    if (sub.status !== 200) continue;
    const kind = /\.css(?:[?#]|$)/i.test(abs) ? 'css' : 'js';
    const refs = refsIn(sub.body, kind);
    rewrites.set(abs, refs);
    for (const ref of refs) add(ref, abs);
  }

  return { program, pageUrl, page, assets, rewrites };
}

/* ----------------------------------------------------------------- build -- */

const TRACKERS = /googletagmanager\.com|google-analytics\.com|polyfill\.io/i;

/*
 * A few libraries are asked for from a host that cannot be reached from
 * here, so the address is pointed at a copy that does answer.  The rule
 * reads the version out of the address instead of naming it, so a new
 * version upstream is still found.
 */
const rewriteTarget = (abs) => {
  /* jQuery, from a host that cannot be reached from here. */
  let m = abs.match(
    /^https?:\/\/ajax\.googleapis\.com\/ajax\/libs\/jquery\/(\d+\.\d+(?:\.\d+)?)\//i
  );
  if (m) {
    return `https://cdnjs.cloudflare.com/ajax/libs/jquery/${m[1]}/jquery.min.js`;
  }
  m = abs.match(/^https?:\/\/code\.jquery\.com\/jquery-(\d+\.\d+(?:\.\d+)?)\.min\.js$/i);
  if (m) {
    return `https://cdnjs.cloudflare.com/ajax/libs/jquery/${m[1]}/jquery.min.js`;
  }
  /* MathJax, for the programs that print formulas. */
  if (/mathjax/i.test(abs)) {
    const f = abs.match(/(tex-mml-chtml\.js)$/i);
    return `https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/${
      f ? f[1] : 'tex-mml-chtml.js'
    }`;
  }
  return abs;
};

/*
 * A few programs upstream trip over something their own script never
 * declares: a start function that is called but never written, or a
 * counter that is read before it is set.  What was meant is written
 * down here, so the local copy runs the way the author meant it to.
 */
const EXTRA_SCRIPT = {
  ColorMixing: 'function Initialize(){ try{ StartGame(); }catch(e){} }',
  Triangle: 'function initialize(){}',
  DiffractionLab: 'var elapsedtime = 0;',
  MagneticFlux: 'var starttime = (new Date()).getTime();',
};

/*
 * One program calls the page before the page has been built: it reaches
 * for a button that is not in the document yet.  The call is put off
 * until the document is ready, which is what the program meant.
 */
const CODE_FIX = {
  DroneDeliveryChallenge: (code) => {
    const once = 'DronePosition();\n\nBallPosition();';
    if (!code.includes(once)) return code;
    return code.replace(
      once,
      'if (document.readyState === "loading") {\n' +
        '  document.addEventListener("DOMContentLoaded", function(){\n' +
        '    DronePosition();\n' +
        '    BallPosition();\n' +
        '  });\n' +
        '} else {\n' +
        '  DronePosition();\n' +
        '  BallPosition();\n' +
        '}'
    );
  },
};

/*
 * One program reads a name from its word lists that the word lists do
 * not carry.  The name is put back, empty, because the program only
 * copies it and never shows it.
 */
const WORDS_FIX = {
  ForceFrictionAngle: (languages) => {
    for (const lang of Object.values(languages)) {
      if (lang && typeof lang === 'object' && !lang.Surfaces) {
        lang.Surfaces = { one: '', two: '' };
      }
    }
  },
};

/*
 * Code that is folded into the page must not close the tag it sits in.
 * A few programs carry the text "</script>" inside a string of their
 * own, and the page would end the script early and show the rest of
 * the program as plain writing.
 */
const keepInsideScript = (code) => code.replace(/<\/(script)/gi, '<\\/$1');
const keepInsideStyle = (code) => code.replace(/<\/(style)/gi, '<\\/$1');

/*
 * A program asks for its word lists with a function of the library, not
 * with a tag, so the lists are put into the file and the function is
 * taught to answer from them.
 */
function jsonShim(json) {
  if (!Object.keys(json).length) return '';
  return (
    '<script>\n' +
    '/* The word lists of the program travel with it, so it never has to\n' +
    '   ask the network for them. */\n' +
    '(function(){\n' +
    '  var DATA = ' +
    keepInsideScript(JSON.stringify(json)) +
    ';\n' +
    '  if (!window.jQuery) return;\n' +
    '  var answer = function(url, done){\n' +
    '    var key = String(url);\n' +
    '    if (Object.prototype.hasOwnProperty.call(DATA, key)) { done(DATA[key]); return true; }\n' +
    '    /* The program may ask for the list by the file name alone. */\n' +
    '    var name = key.split("/").pop().split("?")[0];\n' +
    '    for (var k in DATA) {\n' +
    '      if (k.split("/").pop().split("?")[0] === name) { done(DATA[k]); return true; }\n' +
    '    }\n' +
    '    return false;\n' +
    '  };\n' +
    '  var getJSON = jQuery.getJSON;\n' +
    '  jQuery.getJSON = function(url, done){\n' +
    '    if (!answer(url, done)) return getJSON.apply(this, arguments);\n' +
    '  };\n' +
    '  var get = jQuery.get;\n' +
    '  jQuery.get = function(url, done){\n' +
    '    if (!answer(url, done)) return get.apply(this, arguments);\n' +
    '  };\n' +
    '  var ajax = jQuery.ajax;\n' +
    '  jQuery.ajax = function(a, b){\n' +
    '    var settings = {};\n' +
    '    var k;\n' +
    '    if (typeof a === "string") { settings.url = a; if (typeof b === "function") settings.success = b; else if (b) for (k in b) settings[k] = b[k]; }\n' +
    '    else if (a) { for (k in a) settings[k] = a[k]; }\n' +
    '    if (settings.dataType === "json" && typeof settings.success === "function") {\n' +
    '      if (answer(settings.url, settings.success)) return { abort: function(){} };\n' +
    '    }\n' +
    '    return ajax.apply(this, arguments);\n' +
    '  };\n' +
    '})();\n' +
    '</script>'
  );
}

/*
 * The formula library leaves the place of its letters as a blank, and
 * fills it in when it starts.  A program that was folded into the page
 * has no address of its own to fill it in from, so the letters are put
 * into the library itself.
 */
const MATHJAX_FONT_BASE =
  'https://cdn.jsdelivr.net/npm/mathjax@3/es5/output/chtml/fonts/woff-v2/';

/* A copy of the same letters is kept with the other shared libraries,
   so a letter the network refuses to hand over is still there. */
const MATHJAX_FONT_LOCAL = path.join(
  ROOT,
  'mirror',
  'leqixiang',
  '_shared-ext',
  'cdn.jsdelivr.net',
  'npm',
  'mathjax@3',
  'es5',
  'output',
  'chtml',
  'fonts',
  'woff-v2'
);

const mathJaxFonts = new Map();

async function inlineMathJaxFonts(code) {
  const names = [
    ...new Set([...code.matchAll(/%%URL%%\/([A-Za-z0-9_.-]+\.woff)/g)].map((m) => m[1])),
  ];
  if (!names.length) return code;
  let out = code;
  for (const name of names) {
    let uri = mathJaxFonts.get(name);
    if (uri === undefined) {
      const res = await grab(MATHJAX_FONT_BASE + name, true);
      if (res.status === 200 && res.data) {
        uri = `data:font/woff;base64,${res.data.toString('base64')}`;
      } else {
        const local = path.join(MATHJAX_FONT_LOCAL, name);
        uri = fs.existsSync(local)
          ? `data:font/woff;base64,${fs.readFileSync(local).toString('base64')}`
          : '';
      }
      mathJaxFonts.set(name, uri);
    }
    if (!uri) continue;
    out = out.split(`"%%URL%%/${name}"`).join(`"${uri}"`);
    out = out.split(`'%%URL%%/${name}'`).join(`'${uri}'`);
  }
  return out;
}

async function buildProgram(collected, files) {
  const { page, assets, rewrites } = collected;
  const pageUrl = collected.pageUrl;
  /* The names of the scripts that could not be read. */
  const missing = [];

  /* A few programs bring the mobile library but not the library it
     sits on.  Without the one it sits on the library cannot start at
     all, so it is left out and the program is left to run on its own. */
  const scriptSrcs = [...page.body.matchAll(/<script[^>]+src\s*=\s*["']([^"']+)["']/gi)].map(
    (m) => m[1]
  );
  const usesMobile = scriptSrcs.some((s) => /jquery\.mobile/i.test(s));
  const hasCore = scriptSrcs.some((s) => /jquery/i.test(s) && !/mobile/i.test(s));
  const mobileWithoutCore = usesMobile && !hasCore;

  /* The word lists are kept apart, because the program asks for them
     through a function rather than through a tag. */
  const json = {};
  for (const [abs, file] of files) {
    if (file.mime !== 'application/json') continue;
    try {
      const value = JSON.parse(file.text);
      json[abs] = value;
      /* The program may ask for the list by a relative name, so the list
         is filed under that name as well. */
      const meta = assets.get(abs);
      if (meta && meta.ref && meta.ref !== abs) json[meta.ref] = value;
    } catch {
      /* A list that is not JSON is left out. */
    }
  }

  /* A word list that lost a name upstream is given the name back. */
  const wordsFix = WORDS_FIX[collected.program.folder];
  if (wordsFix) {
    for (const value of Object.values(json)) {
      if (value && typeof value === 'object') wordsFix(value);
    }
  }

  let html = page.body;

  /* The scripts are folded into the document. */
  html = html.replace(
    /<script[^>]+src\s*=\s*["']([^"']+)["'][^>]*>\s*<\/script>/gi,
    (m, src) => {
      const abs = resolveFrom(pageUrl, src);
      if (!abs) return '';
      if (TRACKERS.test(abs)) return '';
      /* The mobile library cannot start without the library it sits
         on, and this program never brought it.  It is left out
         rather than left to stop with an error. */
      if (mobileWithoutCore && /jquery\.mobile/i.test(src)) return '';
      const f = files.get(abs);
      if (!f || !f.text) {
        /* A script that could not be read is left out, but the hole is
           written down so the program can be looked at again. */
        missing.push(src);
        return '';
      }
      let code = f.text;
      /* The references inside the script are turned into the files
         themselves, so the script never has to reach for the network.
         The word lists are left alone: the small shim answers them from
         the page itself, and it does so at once, before the program
         carries on.  Left as a file address, the answer would come a
         moment later and the program would trip over a name that is not
         there yet. */
      for (const ref of rewrites.get(abs) || []) {
        const t = files.get(resolveFrom(abs, ref));
        if (!t || !t.uri.startsWith('data:')) continue;
        if (t.mime === 'application/json') continue;
        code = code.split(ref).join(t.uri);
      }
      /* The code of a program is repaired where the program itself
         would not run. */
      const codeFix = CODE_FIX[collected.program.folder];
      if (codeFix) code = codeFix(code);
      code = keepInsideScript(code);
      const shim = /jquery/i.test(src) ? jsonShim(json) : '';
      return `<script>\n${code}\n</script>${shim}`;
    }
  );

  /* The stylesheets are folded in as well, with their pictures inside. */
  html = html.replace(
    /<link[^>]+href\s*=\s*["']([^"']+?\.css(?:\?[^"']*)?)["'][^>]*>/gi,
    (m, href) => {
      const abs = resolveFrom(pageUrl, href);
      const f = abs ? files.get(abs) : null;
      if (!f || !f.text) return '';
      let css = f.text;
      for (const ref of rewrites.get(abs) || []) {
        const t = files.get(resolveFrom(abs, ref));
        if (!t || !t.uri.startsWith('data:')) continue;
        css = css.split(ref).join(t.uri);
      }
      css = keepInsideStyle(css);
      return `<style>\n${css}\n</style>`;
    }
  );

  /* The pictures on the page become part of the file. */
  html = html.replace(
    /<img([^>]+)src\s*=\s*["']([^"']+)["']([^>]*)>/gi,
    (m, pre, src, post) => {
      const abs = resolveFrom(pageUrl, src);
      const f = abs ? files.get(abs) : null;
      if (!f) return m;
      return `<img${pre}src="${f.uri}"${post}>`;
    }
  );

  /* The background pictures named in a style attribute follow the same
     road as the ones in a tag. */
  html = html.replace(/url\(\s*["']?([^"')]+)["']?\s*\)/gi, (m, ref) => {
    const abs = resolveFrom(pageUrl, ref);
    const f = abs ? files.get(abs) : null;
    return f && f.uri.startsWith('data:') ? `url("${f.uri}")` : m;
  });

  const csp =
    '<meta http-equiv="Content-Security-Policy" content="default-src \'self\' data: blob:; ' +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; " +
    "style-src 'self' 'unsafe-inline' data:; " +
    "img-src 'self' data: blob:; media-src 'self' data: blob:; " +
    "font-src 'self' data:; connect-src 'self' data: blob:; frame-src 'self' data: blob:; " +
    "object-src 'none'>";
  html = html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>\s*/gi, '');
  if (/<head[^>]*>/i.test(html)) {
    html = html.replace(/<head[^>]*>/i, (m) => `${m}\n  ${csp}`);
  } else {
    html = csp + html;
  }

  html = html.replace(/<title>[\s\S]*?<\/title>/i, '<title>乐启享 · 物理实验</title>');

  /* The two programs that carry a broken start are given their start
     back before the file is written. */
  const shim = EXTRA_SCRIPT[collected.program.folder];
  if (shim !== undefined) {
    html = html.replace(
      /<\/body>/i,
      `<script>\n/* The program asked for a start that its own script does\n   not have.  This is the start it meant. */\n${shim}\n</script>\n</body>`
    );
  }

  /* The list of elements the two games ask the server for is put into
     them, so they never have to reach for it. */
  for (const ref of EXTRA_FILES[collected.program.folder] || []) {
    const abs = resolveFrom(collected.pageUrl, ref);
    const f = abs ? files.get(abs) : null;
    if (!f || !f.uri.startsWith('data:')) continue;
    html = html.split(`"${ref}"`).join(`"${f.uri}"`);
    html = html.split(`'${ref}'`).join(`'${f.uri}'`);
  }

  /* The letters of the formula library are put into it. */
  html = await inlineMathJaxFonts(html);
  return { html, assets, missing };
}

/* ------------------------------------------------------------------ run -- */

fs.mkdirSync(SCRATCH, { recursive: true });
fs.mkdirSync(CW, { recursive: true });
fs.mkdirSync(BRAND, { recursive: true });

const programsFile = path.join(SCRATCH, 'aviary-programs.json');

if (PASS === 'list') {
  console.log('reading the lists of the site');
  const programs = await listPrograms();
  console.log(`${programs.length} programs in total`);
  fs.writeFileSync(programsFile, JSON.stringify(programs, null, 2));
} else if (PASS === 'catalog') {
  /* The catalogue is written from what is on the disk, so it never names
     a program that was not mirrored. */
  const programs = JSON.parse(fs.readFileSync(programsFile, 'utf8'));
  const catalog = [];
  const seen = new Set();
  for (const program of programs) {
    const file = path.join(CW, `${program.folder}.html`);
    if (!fs.existsSync(file)) continue;
    /* The same program is listed under two kinds of list; it is one
       program, so it enters the catalogue once. */
    if (seen.has(program.folder)) continue;
    seen.add(program.folder);
    const html = fs.readFileSync(file, 'utf8');
    const title = translateTitle(program.title);
    /* The name of the program is also the name of the browser tab. */
    const patched = html.replace(
      /<title>[\s\S]*?<\/title>/i,
      `<title>乐启享 · ${title}</title>`
    );
    if (patched !== html) fs.writeFileSync(file, patched, 'utf8');

    const dir = html.match(
      /id\s*=\s*["']LabDirections["'][^>]*>([\s\S]{0,4000}?)<\/div>/i
    );
    const description = dir
      ? dir[1]
          .replace(/<br\s*\/?>/gi, ' ')
          .replace(/<[^>]+>/g, '')
          .replace(/\s+/g, ' ')
          .trim()
      : '';
    const cover = path.join(BRAND, `${program.folder}.png`);
    /*
     * The programs are written in English.  The card of the library is
     * read in Chinese, so each one says in Chinese what a teacher does
     * with it; the English text of the site stays in the catalogue
     * beside it.
     */
    const KIND_TEXT = {
      物理实验: '可调参数的物理仿真，改一个条件立刻看到现象和数据',
      课业练习: '一道要自己推演并作答的物理习题，页面里可以写答案、随时重做',
      物理游戏: '动手完成的物理闯关练习，做完立刻有反馈，适合课堂与自学',
      物理工具: '一个随手可用的物理小工具，改参数立刻出结果',
    };
    const zh = KIND_TEXT[program.kind] || '可以动手操作的物理课件';
    catalog.push({
      slug: program.folder,
      title,
      titleEn: program.title,
      subject: '物理',
      subjects: ['物理'],
      stages: ['初中', '高中'],
      stage: '高中',
      description: `${title}：${zh}。英文原版课件，在线即可操作，也可以下载到本地离线使用。`,
      descriptionEn: description,
      credits: 'The Physics Aviary · Frank McCulley',
      cover: fs.existsSync(cover) ? `/brand/aviary/${program.folder}.png` : '',
      sourceUrl: HOST + program.href + '/',
      license: 'Free for classroom use (The Physics Aviary)',
      kind: program.kind,
    });
  }
  catalog.sort((a, b) => a.title.localeCompare(b.title, 'zh'));
  fs.writeFileSync(path.join(OUT, 'catalog.json'), JSON.stringify(catalog, null, 2));
  fs.writeFileSync(
    path.join(OUT, 'NOTICE.md'),
    [
      '# The Physics Aviary',
      '',
      '这些交互物理实验来自 [The Physics Aviary](https://thephysicsaviary.com)，',
      '由 Frank McCulley 编写，作者声明供教学使用免费提供。',
      '',
      '## 乐启享的改编与再创作',
      '',
      '本目录里的课件由乐启享机器人（[codebn.cn](https://codebn.cn/)）整理、改编并本地化后收录。',
      '乐启享完成的工作有：中文标题与中文说明的撰写、封面截图与品牌接入、',
      '脚本与样式表与字体与模型与贴图的本地化改写、离线打包与本地服务，',
      '以及课件质量的分级筛选（结论见 `mirror/leqixiang/quality-decisions.json`）。',
      '实验本身的著作权仍属于原作者；上游链接、作者署名与许可协议一并保留在下面，',
      '并写进目录条目的 `author` / `license` / `sourceUrl` 字段里。',
      '',
      '- 每一门实验都被存成一个完整的 HTML 文件：脚本、样式表和图片都收在文件里。',
      '- 打开这个文件不需要联网，双击即可在浏览器里使用。',
      '- 原始站点的名称写在每一门实验的说明里，浏览器标签显示的是乐启享的名字。',
      '- 原始站点带有访问统计，本地副本不包含统计代码。',
      '',
    ].join('\n')
  );
  console.log(`catalogue: ${catalog.length} programs`);
} else {
  const programs = JSON.parse(fs.readFileSync(programsFile, 'utf8'));
  const wanted = ONLY.length
    ? programs.filter((p) => ONLY.includes(p.folder) || ONLY.includes(p.href))
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
        const collected = await collect(program);
        if (!collected) {
          failed++;
          continue;
        }

        /* Every file of the program is read once. */
        const files = new Map();
        for (const abs of collected.assets.keys()) {
          /* The address that answers comes first; the original one is the
             second choice, so a library that has moved is still found. */
          const alt = rewriteTarget(abs);
          let target = abs;
          let r = null;
          if (alt !== abs) {
            r = await grab(alt, true);
            if (r.status === 200 && r.data) target = alt;
            else r = null;
          }
          if (!r) {
            r = await grab(abs, true);
            target = abs;
          }
          if (r.status !== 200 || !r.data) continue;
          let mime = mimeOf(target);
          /* A few programs ask a small program on the server for their
             word lists; the answer is a list, so it is read as one. */
          if (mime === 'application/octet-stream') {
            const text = r.data.toString('utf8').trim();
            if (text.startsWith('{') || text.startsWith('[')) {
              try {
                JSON.parse(text);
                mime = 'application/json';
              } catch {
                /* Not a list after all. */
              }
            }
          }
          const file = {
            abs,
            mime,
            bytes: r.data.length,
            uri: `data:${mime};base64,${r.data.toString('base64')}`,
          };
          if (mime.startsWith('text/') || mime === 'application/json') {
            file.text = r.data.toString('utf8');
          }
          files.set(abs, file);
        }

        const built = await buildProgram(collected, files);
        fs.writeFileSync(
          path.join(CW, `${program.folder}.html`),
          built.html,
          'utf8'
        );

        /* The picture of the gallery is the one on the overview picture. */
        const coverAbs = resolveFrom(
          collected.pageUrl,
          'images/OverviewPicture.png'
        );
        const cover = files.get(coverAbs);
        if (cover && cover.mime === 'image/png') {
          fs.writeFileSync(
            path.join(BRAND, `${program.folder}.png`),
            Buffer.from(cover.uri.split(',')[1], 'base64')
          );
        }

        const dir = collected.page.body.match(
          /id\s*=\s*["']LabDirections["'][^>]*>([\s\S]{0,4000}?)<\/div>/i
        );
        const description = dir
          ? dir[1]
              .replace(/<br\s*\/?>/gi, ' ')
              .replace(/<[^>]+>/g, '')
              .replace(/\s+/g, ' ')
              .trim()
          : '';

        results.push({
          slug: program.folder,
          title: program.title,
          kind: program.kind,
          list: program.list,
          sourceUrl: HOST + program.href + '/',
          description,
          bytes: Buffer.byteLength(built.html),
          files: files.size,
          missing: built.missing,
        });
        if (built.missing.length) {
          console.log(
            `  hole ${program.folder}: ${built.missing.slice(0, 3).join(', ')}`
          );
        }
        done++;
        if (done % 20 === 0) console.log(`  built ${done}/${wanted.length}`);
      } catch (e) {
        failed++;
        console.log(`  fail ${program.folder}: ${e.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));

  const catalog = results
    .map((r) => ({
      slug: r.slug,
      title: r.title,
      titleEn: r.title,
      subject: '物理',
      subjects: ['物理'],
      stages: ['初中', '高中'],
      stage: '高中',
      description: r.description,
      credits: 'The Physics Aviary · Frank McCulley',
      cover: `/brand/aviary/${r.slug}.png`,
      sourceUrl: r.sourceUrl,
      license: 'Free for classroom use (The Physics Aviary)',
      kind: r.kind,
    }))
    .sort((a, b) => a.title.localeCompare(b.title, 'en'));

  fs.writeFileSync(path.join(OUT, 'catalog.json'), JSON.stringify(catalog, null, 2));
  console.log(`done: ${catalog.length} built, ${failed} skipped`);
}
