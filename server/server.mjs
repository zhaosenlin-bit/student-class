#!/usr/bin/env node
/*
 * Local replica server for the two courseware platforms.
 *
 *   :4173  小白教育  (xbjiaoyu.com)  -> mirror/xbjiaoyu
 *   :4174  图灵智赋  (aifunengjiaoyu.com) -> mirror/aifunengjiaoyu
 *
 * The mirrored front-end code is served byte-for-byte as it was published.
 * Only the small set of API endpoints the shell actually calls is implemented
 * locally, so the original UI, routing, filtering and lesson player all keep
 * working without the commercial backend.
 */

import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * The repository root is found from this file's own location, so a fresh
 * clone works wherever it is unpacked. An explicit LQ_ROOT environment
 * variable still wins, which is handy when the mirror lives on another
 * drive.
 */
const ROOT = process.env.LQ_ROOT
  ? path.resolve(process.env.LQ_ROOT)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const XB_ROOT = path.join(ROOT, 'mirror', 'xbjiaoyu');
const AFE_ROOT = path.join(ROOT, 'mirror', 'aifunengjiaoyu');
const LQ_ROOT = path.join(ROOT, 'mirror', 'leqixiang');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.zip': 'application/zip',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

const mimeFor = (p) => MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';

/* A file name a browser can save without complaining. */
function safeName(value) {
  const cleaned = String(value || '')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '')
    .trim();
  return cleaned || 'courseware';
}

/*
 * A download name may hold Chinese characters, which cannot travel inside a
 * header verbatim. RFC 5987 carries the real name; the plain name is the
 * fallback for clients that ignore it.
 */
function contentDisposition(filename) {
  const name = safeName(filename);
  const ascii = name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

/* The 图灵智赋 bodies address a few libraries through paths that carry no
   file name at all (jsdelivr's "+esm" bundle). They are modules, so they
   need a JavaScript content type. */
function mimeForAsset(p) {
  if (/(?:\/|^)\+esm$/.test(p)) return 'text/javascript; charset=utf-8';
  /* A few CDN paths carry no file name at all. The Google Fonts stylesheet
     is asked for as "/css2?family=..." and lands on disk as a file called
     "css2"; without a stylesheet content type the browser drops it. */
  const base = path.basename(p).toLowerCase();
  if (base === 'css2' || base === 'css') return 'text/css; charset=UTF-8';
  if (base === 'js') return 'application/javascript; charset=UTF-8';
  /*
   * One work asks for its terrain picture with the extension ".web"
   * although the file is a webp picture. The type is read from the file
   * itself, so the picture is shown and a real ".web" video still is.
   */
  if (base.endsWith('.web')) {
    try {
      const head = fs.readFileSync(p, { encoding: null }).subarray(0, 16);
      if (head.subarray(0, 4).toString('latin1') === 'RIFF') {
        const kind = head.subarray(8, 12).toString('latin1');
        if (kind === 'WEBP') return 'image/webp';
        if (kind === 'VP8 ') return 'video/webp';
      }
    } catch {
      /* fall through to the table */
    }
  }
  return mimeFor(p);
}

/*
 * The two sites hand out different Content-Type headers for the very same
 * file extension: 小白教育 serves .js as text/javascript, while 图灵智赋
 * serves it as application/javascript (and both spell the charset as UTF-8).
 * Static replies therefore need a per-site table.
 */
const AFE_MIME = {
  '.html': 'text/html; charset=UTF-8',
  '.htm': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.mjs': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

function sendJson(res, status, obj) {
  const body = Buffer.from(JSON.stringify(obj));
  send(res, status, body, { 'Content-Type': 'application/json; charset=utf-8' });
}

/*
 * Express's own "no such route" page.  The live 图灵智赋 site answers every
 * path it does not know — including a known route called with the wrong
 * method — with exactly this HTML, so the front-end's JSON parse fails the
 * same way online and offline.
 */
function expressNotFound(res, method, pathname) {
  const shown = String(pathname)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  const body = Buffer.from(
    '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
      '<title>Error</title>\n</head>\n<body>\n<pre>Cannot ' +
      method +
      ' ' +
      shown +
      '</pre>\n</body>\n</html>\n',
    'utf8'
  );
  send(res, 404, body, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': body.length,
  });
}

/* A few routes on the live site answer with this plain word instead. */
function plainNotFound(res) {
  const body = Buffer.from('Not found', 'utf8');
  send(res, 404, body, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': body.length,
  });
}

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return null;
  const text = Buffer.concat(chunks).toString('utf8');
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function safeJoin(base, rel) {
  const target = path.resolve(base, '.' + path.sep + rel.replace(/^[/\\]+/, ''));
  const root = path.resolve(base);
  if (target !== root && !target.startsWith(root + path.sep)) return null;
  return target;
}

async function serveFile(res, file, { download = false, contentType, headers: extra } = {}) {
  try {
    const stat = await fsp.stat(file);
    if (!stat.isFile()) return false;
    const headers = {
      'Content-Type': contentType || mimeFor(file),
      'Content-Length': stat.size,
      'Cache-Control': 'no-cache',
    };
    if (extra) Object.assign(headers, extra);
    if (download) {
      headers['Content-Disposition'] =
        `attachment; filename="${encodeURIComponent(path.basename(file))}"`;
    }
    res.writeHead(200, headers);
    fs.createReadStream(file).pipe(res);
    return true;
  } catch {
    return false;
  }
}

/* Serve a path that may be a directory: fall back to its index.html. */
async function servePath(res, file, options) {
  if (await serveFile(res, file, options)) return true;
  try {
    const stat = await fsp.stat(file);
    if (stat.isDirectory()) {
      return await serveFile(res, path.join(file, 'index.html'), options);
    }
  } catch {
    /* fall through */
  }
  return false;
}

/* ------------------------------------------------------------------ *
 * 小白教育 (xbjiaoyu.com)
 * ------------------------------------------------------------------ */

const xb = {
  catalog: null,
  courses: new Map(),
  loaded: false,
};

function loadXb(profile) {
  const state = profile.state;
  if (state.loaded) return;
  const raw = fs.readFileSync(profile.catalogFile, 'utf8');
  const catalog = JSON.parse(raw);
  const cwDir = profile.coursewareDir;
  const installed = new Set();
  if (fs.existsSync(cwDir)) {
    for (const f of fs.readdirSync(cwDir)) {
      if (f.endsWith('.html')) installed.add(f.replace(/\.html$/, ''));
    }
  }
  state.installed = installed;

  /*
   * The catalogue answers with the courses whose body is on this disk.
   * The two platforms publish far more than that, and every one of the
   * rest refuses to open — so listing them here would only produce a
   * card that leads to an error. A library shows what it holds.
   */
  const products = (catalog.products || []).map((p) => {
    const has = installed.has(p.id);
    return {
      ...p,
      // No commerce locally: every entry is presented as free to use.
      mode: p.mode || 'free',
      publicationStatus: p.publicationStatus || 'published',
      owned: p.owned ?? has,
      accessible: p.accessible ?? has,
      onlineAccessible: p.onlineAccessible ?? has,
      available: p.available ?? has,
      downloadable: p.downloadable ?? has,
      canDownload: p.canDownload ?? has,
      canPurchase: false,
      downloadReason: p.downloadReason ?? (has ? '' : 'local-missing'),
      localInstalled: has,
      launchUrl: `/api/launch/${p.id}`,
    };
  }).filter((p) => p.localInstalled);

  state.catalog = {
    ...catalog,
    serverTime: Date.now(),
    products,
    selling: false,
    salesMode: 'local',
    siteMode: 'local',
    downloadMode: true,
    localReplica: {
      installedCount: installed.size,
      totalCount: products.length,
      coursewareDir: 'mirror/xbjiaoyu/courseware',
    },
  };
  state.loaded = true;
}

const XB_LOCAL_NOTICE = `
<script data-local-replica="1">
(function(){
  var info = ${JSON.stringify({ installed: 0, total: 0 })};
  function mark(){
    var el = document.querySelector('#local-replica-note');
    if (!el) return;
    el.hidden = false;
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mark, { once: true });
  } else { mark(); }
})();
</script>`;

/*
 * The 图灵智赋 bodies load their own assets from two places: the
 * /api/program-assets/<program>/t/<lease>/… prefix and a couple of public
 * CDNs.  Both are mirrored next to the body, so every absolute URL is
 * rewritten to its local twin before the document is handed out.
 */
const LQ_EXT_HOSTS = [
  'https://cdnjs.cloudflare.com/',
  'https://cdn.jsdelivr.net/',
  'https://tuxiaoling-glb-2026.oss-cn-shenzhen.aliyuncs.com/',
  'https://unpkg.com/',
  'https://esm.sh/',
  'https://storage.googleapis.com/',
  'https://fonts.googleapis.com/',
  'https://fonts.gstatic.com/',
  'https://assets.mixkit.co/',
  'https://www.soundhelix.com/',
  'https://metis-online.fbcontent.cn/',
  'https://musk-online.fbcontent.cn/',
  'https://www.feixianglaoshi.com/',
  'https://i.pinimg.com/',
];

function rewriteCoursewareUrls(html, localId) {
  let out = html;
  /*
   * A work that comes as a package points its base at a signed address on
   * the platform.  The same files sit next to the document in the local
   * copy, so the base is pointed at them instead.
   */
  out = out.replace(
    /<base href="\/api\/program-assets\/[A-Za-z0-9_\-]+\/t\/[^\s"']*">/g,
    `<base href="/api/program-assets/${localId}/">`
  );
  /* The analytics beacon has no business in a local copy. */
  out = out.replace(
    /<script[^>]*src=["']https:\/\/static\.cloudflareinsights\.com\/[^"']*["'][^>]*>\s*<\/script>/gi,
    ''
  );
  /* The Tailwind play CDN is a single script without a path. */
  out = out.split('https://cdn.tailwindcss.com').join(
    `/api/program-assets/${localId}/_ext/cdn.tailwindcss.com/tailwind.js`
  );
  for (const host of LQ_EXT_HOSTS) {
    out = out.split(host).join(`/api/program-assets/${localId}/_ext/${host.replace(/^https?:\/\//, '')}`);
  }
  /* The 图灵智赋 CDN keeps its URL shape under /prod/uploads/. */
  out = out.split('https://static.aifunengjiaoyu.com/').join('/prod/uploads/');
  return out;
}

/*
 * A few of the 图灵智赋 works reach out to a third party at runtime: the
 * 长征 save client announces itself without the list of keys it is allowed
 * to write. That is rewritten here so a saved session can be restored.
 */
function patchLqBody(html, localId) {
  let out = html;
  /* Let the host know which progress keys the courseware may write, so a
     saved session can be restored on the next visit. */
  out = out.replace(
    /window\.parent\.postMessage\(\{type:config\.protocol\+':ready',programId:config\.programId,revision:config\.revision,entry:config\.entry,nonce\}/g,
    "window.parent.postMessage({type:config.protocol+':ready',programId:config.programId,revision:config.revision,entry:config.entry,nonce,keys:config.keys}"
  );
  return out;
}

function lqLocalId(programId) {
  if (fs.existsSync(path.join(LQ_ROOT, 'courseware', `${programId}.html`))) return programId;
  const afe = `afe-${programId}`;
  if (fs.existsSync(path.join(LQ_ROOT, 'courseware', `${afe}.html`))) return afe;
  return null;
}

/*
 * Some works put the address of their pictures together while they run,
 * so the address cannot be found by looking at the document. The picture
 * is then asked of the public CDN even though a copy sits next to the
 * document.
 *
 * A small script is put in front of the page: whenever it asks for one of
 * the known public addresses, the local copy is asked for instead. The
 * script goes in before the work's own code, so it is in place by the
 * time the address is built.
 */
function injectLocalCdnShim(html, localId) {
  const map = LQ_EXT_HOSTS.map((host) => [
    host,
    `/api/program-assets/${localId}/_ext/${host.replace(/^https?:\/\//, '')}`,
  ]);
  const script = `<script>(function(){
var map=${JSON.stringify(map)};
function fix(u){
  if(typeof u!=='string')return u;
  for(var i=0;i<map.length;i++){if(u.indexOf(map[i][0])===0)return map[i][1]+u.slice(map[i][0].length);}
  return u;
}
var f=window.fetch;
if(f){window.fetch=function(u,o){try{u=fix(u);}catch(e){}return f.call(this,u,o);};}
var x=XMLHttpRequest.prototype.open;
if(x){XMLHttpRequest.prototype.open=function(m,u){try{u=fix(u);}catch(e){}return x.call(this,m,u);};}
var d=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');
if(d&&d.set){Object.defineProperty(HTMLImageElement.prototype,'src',{get:d.get,set:function(v){d.set.call(this,fix(v));}});}
})();</script>`;
  /* Right after the opening tag of the head, or of the body. */
  const head = /<head[^>]*>/i.exec(html);
  if (head) {
    const at = head.index + head[0].length;
    return html.slice(0, at) + script + html.slice(at);
  }
  const body = /<body[^>]*>/i.exec(html);
  if (body) {
    const at = body.index + body[0].length;
    return html.slice(0, at) + script + html.slice(at);
  }
  return script + html;
}

/*
 * The same trick for a copy that is opened from disk: there the files sit
 * next to the document, so the address points there instead.
 */
function injectArchiveCdnShim(html) {
  const map = LQ_EXT_HOSTS.map((host) => [
    host,
    `./assets/_ext/${host.replace(/^https?:\/\//, '')}`,
  ]);
  const script = `<script>(function(){
var map=${JSON.stringify(map)};
function fix(u){
  if(typeof u!=='string')return u;
  for(var i=0;i<map.length;i++){if(u.indexOf(map[i][0])===0)return map[i][1]+u.slice(map[i][0].length);}
  return u;
}
var f=window.fetch;
if(f){window.fetch=function(u,o){try{u=fix(u);}catch(e){}return f.call(this,u,o);};}
var x=XMLHttpRequest.prototype.open;
if(x){XMLHttpRequest.prototype.open=function(m,u){try{u=fix(u);}catch(e){}return x.call(this,m,u);};}
var d=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');
if(d&&d.set){Object.defineProperty(HTMLImageElement.prototype,'src',{get:d.get,set:function(v){d.set.call(this,fix(v));}});}
})();</script>`;
  const head = /<head[^>]*>/i.exec(html);
  if (head) {
    const at = head.index + head[0].length;
    return html.slice(0, at) + script + html.slice(at);
  }
  return script + html;
}

/*
 * The 小白教育 courseware expects a classroom host and shows a "please
 * reopen it in the library" screen when there is none. A copy that is opened
 * straight from disk has no host, so that screen is taken out. The patch is
 * applied to the raw script and to the escaped copy of it that the 图灵智赋
 * documents carry inside a string.
 */
function relaxStandaloneGuard(html) {
  const variants = [
    ["if(win.parent===win){change('blocked');return;}", "if(win.parent===win){change('active');return;}"],
    [
      "if(win.parent===win){change(\\'blocked\\');return;}",
      "if(win.parent===win){change(\\'active\\');return;}",
    ],
    [
      'function expired(){return !deadline||',
      'function expired(){if(win.parent===win)return false;return !deadline||',
    ],
    [
      'function expired(){return !deadline\\u0026\\u0026',
      'function expired(){if(win.parent===win)return false;return !deadline\\u0026\\u0026',
    ],
  ];
  let out = html;
  for (const [from, to] of variants) out = out.split(from).join(to);
  return out;
}

/* -------------------------------------------------------------- zip ---- */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

/* A store-only zip writer: the entries are already compressed media. */
function buildZip(entries) {
  const chunks = [];
  const central = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const data = entry.data;
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(0, 8); // stored
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    chunks.push(local, name, data);

    const head = Buffer.alloc(46);
    head.writeUInt32LE(0x02014b50, 0);
    head.writeUInt16LE(20, 4);
    head.writeUInt16LE(20, 6);
    head.writeUInt16LE(0x0800, 8);
    head.writeUInt16LE(0, 10);
    head.writeUInt16LE(0, 12);
    head.writeUInt16LE(0, 14);
    head.writeUInt32LE(crc, 16);
    head.writeUInt32LE(data.length, 20);
    head.writeUInt32LE(data.length, 24);
    head.writeUInt16LE(name.length, 28);
    head.writeUInt16LE(0, 30);
    head.writeUInt16LE(0, 32);
    head.writeUInt16LE(0, 34);
    head.writeUInt16LE(0, 36);
    head.writeUInt32LE(0, 38);
    head.writeUInt32LE(offset, 42);
    central.push(Buffer.concat([head, name]));
    offset += local.length + name.length + data.length;
  }
  const dir = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(dir.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...chunks, dir, end]);
}

function listFiles(root, base = '') {
  const out = [];
  if (!fs.existsSync(root)) return out;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...listFiles(full, rel));
    else out.push({ name: rel, file: full });
  }
  return out;
}

/*
 * A 图灵智赋 work is a document plus a folder of assets, so the offline copy
 * is handed over as a zip. Every path inside the document is rewritten to a
 * relative one, and the platform check is relaxed for file:// documents.
 */
function buildLqZip(id) {
  const bodyFile = path.join(LQ_ROOT, 'courseware', `${id}.html`);
  if (!fs.existsSync(bodyFile)) return null;
  /* The document keeps the platform's own programme number; the local
     folder is named after the merged id. */
  const numeric = id.startsWith('afe-') ? id.slice(4) : id;
  let html = fs.readFileSync(bodyFile, 'utf8');
  html = rewriteCoursewareUrls(html, id);
  html = patchLqBody(html, id);
  /* Local server paths become paths inside the archive. */
  html = html.replace(
    new RegExp(`/api/program-assets/${numeric}/t/[^"'\`/]+/`, 'g'),
    './assets/'
  );
  /*
   * The document is written with the local id in it — afe-501 — while the
   * platform's own number is 501. Both spellings have to become a path
   * inside the archive.
   */
  for (const prefix of [`/api/program-assets/${numeric}/`, `/api/program-assets/${id}/`]) {
    html = html.split(`${prefix}_ext/`).join('./assets/_ext/');
    html = html.split(prefix).join('./assets/');
  }
  /* A document opened from disk has no platform to ask for permission. */
  html = html.replace(/if\(p===\\"file:\\"\|\|p===\\"about:\\"\|\|p===\\"chrome:\\"\)/g, 'if(p===\\"about:\\"||p===\\"chrome:\\")');
  html = html.replace(
    /if\(!ok&&h!==\\"localhost\\"&&h!==\\"127\.0\.0\.1\\"\)/g,
    'if(!ok&&h!==\\"localhost\\"&&h!==\\"127.0.0.1\\"&&h!==\\"\\")'
  );
  html = html.replace(
    /x\.open\(\\"GET\\",location\.origin\+\\"\/api\/program-file\/verify-access/g,
    'x.open(\\"GET\\",p===\\"file:\\"?\\"data:application/json,%7B%22ok%22%3Atrue%7D\\":location.origin+\\"/api/program-file/verify-access'
  );
  /*
   * The same guard, written with plain quotes instead of escaped ones.
   * 470 of the mirrored bodies use this spelling, and a document that
   * refuses to run from disk makes the download worthless:
   *
   *   if(p==="file:"||p==="about:"||p==="chrome:")  ->  "内容仅在授权平台运行"
   *   if(!ok&&h!=="localhost"&&h!=="127.0.0.1")     ->  "未授权的运行环境"
   *   x.open("GET",location.origin+"/api/program-file/verify-access")
   *
   * The first two are only about where the page runs, so they are let
   * through; the third asks the platform for a token, and offline there is
   * nobody to ask, so it is answered with a local "yes".
   */
  html = html.replace(
    /if\(p==="file:"\|\|p==="about:"\|\|p==="chrome:"\)\{/g,
    'if(p==="chrome:"){'
  );
  html = html.replace(
    /if\(!ok&&h!=="localhost"&&h!=="127\.0\.0\.1"\)\{/g,
    'if(false){'
  );
  html = html.replace(
    /x\.open\("GET",location\.origin\+"\/api\/program-file\/verify-access/g,
    'x.open("GET",(location.protocol==="file:"||location.protocol==="about:")?"data:application/json,%7B%22ok%22%3Atrue%7D":location.origin+"/api/program-file/verify-access'
  );
  html = html.replace(/<base href="\/api\/program-assets\/[^"]*">/g, '<base href="./assets/">');
  html = relaxStandaloneGuard(html);
  html = injectArchiveCdnShim(html);

  const entries = [{ name: `${id}.html`, data: Buffer.from(html, 'utf8') }];
  /* A name may only appear once in an archive. The course's own folder and
     the shared library folder sometimes hold the same file — three.js is
     mirrored both ways for some works — and the second copy is skipped
     rather than written twice. */
  const names = new Set(entries.map((e) => e.name));
  const add = (name, data) => {
    if (names.has(name)) return;
    names.add(name);
    entries.push({ name, data });
  };
  const assets = path.join(LQ_ROOT, 'courseware', `${id}.assets`);
  for (const file of listFiles(assets)) {
    const data = fs.readFileSync(file.file);
    /* A script or a data file can name a public CDN too; inside the
       archive the local copy has to be pointed at instead. */
    if (/\.(?:js|mjs|css|json|html?)$/i.test(file.name)) {
      const text = data.toString('utf8');
      let rewritten = rewriteCoursewareUrls(text, id);
      if (rewritten !== text) {
        for (const prefix of [
          `/api/program-assets/${numeric}/`,
          `/api/program-assets/${id}/`,
        ]) {
          rewritten = rewritten.split(`${prefix}_ext/`).join('./assets/_ext/');
          rewritten = rewritten.split(prefix).join('./assets/');
        }
        add(`assets/${file.name}`, Buffer.from(rewritten, 'utf8'));
        continue;
      }
    }
    add(`assets/${file.name}`, data);
  }
  /*
   * The public libraries are mirrored once and shared. A course that is
   * taken away on its own still needs them, so every shared file the
   * document asks for is copied into the archive.
   */
  const sharedRoot = path.join(LQ_ROOT, '_shared-ext');
  const wanted = new Set();
  for (const m of html.matchAll(/\/api\/program-assets\/[^/"']+\/_ext\/([^"'`\s)]+)/g)) {
    wanted.add(decodeURIComponent(m[1]));
  }
  for (const m of html.matchAll(/\/_shared\/([^"'`\s)]+)/g)) {
    wanted.add(decodeURIComponent(m[1]));
  }
  /*
   * A data file that sits next to the document can name a public CDN as
   * well, so the files it points at have to travel with the archive too.
   */
  for (const file of listFiles(assets)) {
    if (!/\.(?:js|mjs|css|json|html?)$/i.test(file.name)) continue;
    let text = '';
    try {
      text = fs.readFileSync(file.file, 'utf8');
    } catch {
      continue;
    }
    for (const m of text.matchAll(/\/api\/program-assets\/[^/"']+\/_ext\/([^"'`\s)]+)/g)) {
      wanted.add(decodeURIComponent(m[1]));
    }
    for (const m of text.matchAll(/\/_shared\/([^"'`\s)]+)/g)) {
      wanted.add(decodeURIComponent(m[1]));
    }
  }
  const copied = new Set();
  const queue = [...wanted];
  while (queue.length) {
    const rel = queue.shift();
    if (copied.has(rel)) continue;
    copied.add(rel);
    const candidates = [
      path.join(assets, '_ext', rel),
      path.join(sharedRoot, rel),
    ];
    const source = candidates.find((c) => {
      try {
        return fs.existsSync(c) && fs.statSync(c).isFile();
      } catch {
        return false;
      }
    });
    if (!source) continue;
    let data = fs.readFileSync(source);
    /* Inside the archive the shared folder sits next to the course files. */
    if (/\.(css2?|js)$/i.test(source) && source.startsWith(sharedRoot)) {
      data = Buffer.from(
        data.toString('utf8').replace(/\/_shared\//g, './assets/_ext/'),
        'utf8'
      );
    }
    add(`assets/_ext/${rel}`, data);
    /* A shared stylesheet points at further shared files. */
    if (/\.(css2?)$/i.test(source)) {
      for (const m of data.toString('utf8').matchAll(/\.\/assets\/_ext\/([^"')\s]+)/g)) {
        queue.push(decodeURIComponent(m[1]));
      }
    }
  }
  return buildZip(entries);
}

async function serveLqAssets(res, pathname) {
  const rest = pathname.slice('/api/program-assets/'.length);
  const slash = rest.indexOf('/');
  if (slash < 0) return sendJson(res, 404, { error: '未找到' });
  const programId = rest.slice(0, slash);
  let tail = rest.slice(slash + 1);
  const localId = lqLocalId(programId);

  /* /t/<lease>/… is the lease prefix, /_ext/<host>/… the mirrored CDNs. */
  if (tail.startsWith('t/')) {
    const after = tail.slice(2);
    const cut = after.indexOf('/');
    tail = cut < 0 ? '' : after.slice(cut + 1);
  } else if (tail.startsWith('_ext/')) {
    tail = tail.slice('_ext/'.length);
  }
  if (!tail) return sendJson(res, 404, { error: '未找到' });
  const root = localId ? path.join(LQ_ROOT, 'courseware', `${localId}.assets`) : null;
  /* Mirrored CDNs live under _ext/, the files that came with the body sit
     next to it. Both spellings can reach the same file. */
  /* Some resources are the same for every course — the web fonts, for one.
     They live in one folder and are shared out. */
  const shared = path.join(LQ_ROOT, '_shared-ext');
  for (const candidate of [
    root && safeJoin(root, '_ext/' + tail),
    root && safeJoin(root, tail),
    safeJoin(shared, tail),
  ]) {
    /*
     * A script or a data file can name a public CDN as well. The document
     * is rewritten when it is handed out, but these files are handed out
     * as they are, so the same rewrite is done here — otherwise the work
     * reaches out to the network for a picture that sits next to it.
     */
    if (candidate && /\.(?:js|mjs|css|json|html?)$/i.test(candidate) && localId) {
      if (await serveRewrittenAsset(res, candidate, localId)) return;
    }
    if (
      candidate &&
      (await serveFile(res, candidate, {
        contentType: mimeForAsset(candidate),
        headers: { 'Access-Control-Allow-Origin': '*' },
      }))
    )
      return;
  }
  return sendJson(res, 404, { error: '未找到' });
}

/* Hand out a text asset with the public addresses inside it pointed at
   the local copies. */
async function serveRewrittenAsset(res, file, localId) {
  let body;
  try {
    body = await fsp.readFile(file, 'utf8');
  } catch {
    return false;
  }
  const rewritten = rewriteCoursewareUrls(body, localId);
  if (rewritten === body) {
    return serveFile(res, file, {
      contentType: mimeForAsset(file),
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }
  const buf = Buffer.from(rewritten, 'utf8');
  res.writeHead(200, {
    'Content-Type': mimeForAsset(file),
    'Content-Length': buf.length,
    'Cache-Control': 'no-cache',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(buf);
  return true;
}

async function handleXb(req, res, url, profile) {
  const pathname = decodeURIComponent(url.pathname);
  const method = req.method.toUpperCase();

  /*
   * The WeChat sign-in code for the upstream platform. Its ticket lives
   * for about a minute, so the page that shows it re-reads the picture
   * every few seconds and the reader always scans a code that is still
   * alive. Nothing here talks to the platform; the watcher process does
   * that and leaves the picture behind.
   */
  if (pathname === '/login-qr' || pathname === '/login-qr.png') {
    if (method !== 'GET' && method !== 'HEAD') {
      return sendJson(res, 405, { error: '不支持此操作' });
    }
    const qr = path.join(ROOT, 'recon', 'scratch', 'afe-qr.png');
    if (pathname === '/login-qr.png') {
      if (!fs.existsSync(qr)) return sendJson(res, 404, { error: '还没有登录码' });
      const body = fs.readFileSync(qr);
      return send(res, 200, body, {
        'Content-Type': 'image/png',
        'Content-Length': body.length,
        'Cache-Control': 'no-store',
      });
    }
    const html =
      '<!doctype html><meta charset="utf-8">' +
      '<title>微信扫码登录</title>' +
      '<style>body{margin:0;display:grid;place-items:center;min-height:100vh;' +
      'font:16px/1.7 system-ui,"Microsoft YaHei",sans-serif;background:#f4f6f5;color:#1d2422}' +
      'figure{margin:0;text-align:center;background:#fff;padding:28px 32px;border-radius:14px;' +
      'box-shadow:0 18px 44px rgba(20,40,34,.12)}' +
      'img{width:260px;height:260px;image-rendering:pixelated}' +
      'p{margin:14px 0 0;color:#5d6a66;font-size:14px}</style>' +
      '<figure><img src="/login-qr.png" alt="微信登录二维码">' +
      '<p>用微信扫这个码，每 10 秒自动换一张新的。</p></figure>' +
      '<script>setTimeout(function(){location.reload();},10000)</script>';
    const body = Buffer.from(html, 'utf8');
    return send(res, 200, body, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': body.length,
      'Cache-Control': 'no-store',
    });
  }

  /* Courseware assets that live next to the body (the 图灵智赋 works). */
  if (pathname.startsWith('/api/program-assets/')) {
    return serveLqAssets(res, pathname);
  }

  if (pathname.startsWith('/api/')) {
    loadXb(profile);
    return handleXbApi(req, res, pathname, profile);
  }

  if (pathname.startsWith('/courseware/')) {
    // The live site only hands a courseware document to a classroom session
    // that carries a ticket, and refuses any other method outright.  The
    // local copy opens the file directly, because there is no ticket system
    // here to open it with.
    if (method !== 'GET' && method !== 'HEAD') {
      return sendJson(res, 405, { error: '不支持此操作' });
    }
    loadXb(profile);
    const id = pathname.slice('/courseware/'.length).replace(/\.html$/, '');
    const file = path.join(profile.coursewareDir, `${id}.html`);
    if (!fs.existsSync(file)) {
      return sendJson(res, 404, { error: '本地没有安装这份课件。' });
    }
    // The published courseware hard-binds its classroom handshake to
    // https://xbjiaoyu.com. Rebind it to this local origin so the parent
    // shell can grant access. Everything else stays untouched.
    const origin = `http://${req.headers.host || 'localhost:' + profile.port}`;
    const html = fs.readFileSync(file, 'utf8');
    let patched = html.replace(
      /("origin"\s*:\s*)"https:\/\/xbjiaoyu\.com"/g,
      `$1${JSON.stringify(origin)}`
    );
    if (profile.kind === 'leqixiang') {
      patched = rewriteCoursewareUrls(patched, id);
      patched = patchLqBody(patched, id);
      patched = injectLocalCdnShim(patched, id);
    }
    const body = Buffer.from(patched, 'utf8');
    return send(res, 200, body, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': body.length,
      'Cache-Control': 'no-cache',
    });
  }

  // The local download endpoint hands over the mirrored courseware file.
  // (On the live site this route answers 410 — offline downloads are off.)
  if (pathname.startsWith('/download/')) {
    if (method !== 'GET' && method !== 'HEAD') {
      return sendJson(res, 405, { error: '不支持此操作' });
    }
    const id = path.basename(pathname);
    const file = path.join(profile.coursewareDir, id);
    if (fs.existsSync(file) && (await serveFile(res, file, { download: true }))) return;
    return sendJson(res, 404, { error: '未找到' });
  }

  /*
   * The public CDNs the courseware pulls in are mirrored once and shared by
   * every course. The mirrored Google Fonts stylesheet points at them with
   * this prefix.
   */
  if (pathname.startsWith('/_shared/')) {
    if (method !== 'GET' && method !== 'HEAD') {
      return sendJson(res, 405, { error: '不支持此操作' });
    }
    const shared = safeJoin(path.join(LQ_ROOT, '_shared-ext'), pathname.slice('/_shared/'.length));
    if (shared && (await serveFile(res, shared, {
      contentType: mimeForAsset(shared),
      headers: { 'Access-Control-Allow-Origin': '*' },
    }))) return;
    return sendJson(res, 404, { error: '未找到' });
  }

  // Static shell assets: the live site serves them over GET/HEAD only and
  // answers anything else with 405.
  if (method !== 'GET' && method !== 'HEAD') {
    return sendJson(res, 405, { error: '不支持此操作' });
  }

  // Static shell assets, served from their original paths.
  const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  for (const mount of profile.mounts || []) {
    if (!rel.startsWith(mount.prefix)) continue;
    const mounted = safeJoin(mount.dir, rel.slice(mount.prefix.length));
    if (mounted && (await serveFile(res, mounted))) return;
  }
  const file = safeJoin(profile.assetsDir, rel);
  if (file && (await serveFile(res, file))) return;

  if (rel === 'index.html') {
    let html = fs.readFileSync(path.join(profile.assetsDir, 'index.html'), 'utf8');
    // The published shell ships an anti-devtools guard. It protects the
    // commercial site, not a personal local copy, and it blocks the browser
    // tools you need to work on the replica, so it is not loaded locally.
    html = html.replace(/<script[^>]*content-guard\.js[^>]*><\/script>/g, '');
    html = html.replace('</body>', XB_LOCAL_NOTICE + '</body>');
    const body = Buffer.from(html, 'utf8');
    return send(res, 200, body, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': body.length,
      'Cache-Control': 'no-cache',
    });
  }
  // The live site routes by hash, so an unknown path is a plain 404 rather
  // than a fall back to the shell.
  sendJson(res, 404, { error: '未找到' });
}

/*
 * The live 小白教育 site checks that a POST really came from its own
 * front-end: the browser sends a matching Origin, and the front-end adds
 * X-Requested-With: studio.  A POST without both is turned away with 403
 * before the route is even looked at.
 */
function xbPostAllowed(req, port) {
  const host = req.headers.host || `localhost:${port}`;
  const origin = req.headers.origin || '';
  const requested = String(req.headers['x-requested-with'] || '').toLowerCase();
  return origin === `http://${host}` && requested === 'studio';
}

async function handleXbApi(req, res, pathname, profile) {
  loadXb(profile);
  const method = req.method.toUpperCase();
  const body = method !== 'GET' && method !== 'HEAD' ? await readBody(req) : null;

  if (method === 'POST' && !xbPostAllowed(req, profile.port)) {
    return sendJson(res, 403, { error: '请求来源不匹配，请重新打开网站' });
  }

  /* The shapes the live site answers with, reused across the routes. */
  const notFound = () => sendJson(res, 404, { error: '未找到' });
  const notAllowed = () => sendJson(res, 405, { error: '不支持此操作' });
  const needLogin = () => sendJson(res, 401, { error: '请先登录' });
  const gone = () =>
    sendJson(res, 410, { error: '此课件请下载后使用；标为免费的课件可在线体验' });

  if (pathname === '/api/catalog') {
    if (method !== 'GET') return notFound();
    return sendJson(res, 200, profile.state.catalog);
  }
  if (pathname === '/api/session') {
    if (method !== 'GET') return notFound();
    /* The local copy has no accounts.  The 乐启享 build hands the shell a
       local account so nothing in the interface asks for a sign-in. */
    return sendJson(res, 200, { user: profile.localUser });
  }
  /*
   * The 长征 courseware checks its own access before it draws anything.
   * Locally the body is already on this machine, so the check passes.
   */
  if (pathname.startsWith('/api/program-file/verify-access')) {
    return sendJson(res, 200, { ok: true });
  }
  if (pathname === '/api/auth/phone/status') {
    if (method !== 'GET') return needLogin();
    return sendJson(res, 200, {
      enabled: false,
      phoneOnly: true,
      bound: false,
      phoneMasked: null,
      support: '本地副本不需要登录',
      ownerPasswordOnly: false,
      captcha: { required: false, ready: false, appId: null },
    });
  }
  if (
    pathname === '/api/auth/phone/send' ||
    pathname === '/api/auth/phone/safety' ||
    pathname === '/api/auth/phone/rebind-old'
  ) {
    if (method !== 'POST') return notAllowed();
    return needLogin();
  }
  if (pathname === '/api/auth/phone/login') {
    if (method !== 'POST') return notAllowed();
    return sendJson(res, 400, { error: '请输入六位验证码' });
  }
  if (pathname === '/api/auth/logout') {
    if (method !== 'POST') return notFound();
    return sendJson(res, 200, { ok: true });
  }
  if (pathname.startsWith('/api/access/')) {
    if (method !== 'GET') return notFound();
    const id = decodeURIComponent(pathname.slice('/api/access/'.length));
    const product = profile.state.catalog.products.find((p) => p.id === id);
    if (!product) return sendJson(res, 404, { error: '未找到这个课件' });
    return sendJson(res, 200, {
      product,
      canDownload: product.canDownload,
      downloadReason: product.downloadReason,
      owned: product.owned,
      accessible: product.accessible,
      onlineAccessible: product.onlineAccessible,
      launchUrl: product.launchUrl,
      available: product.available,
      canPurchase: false,
      canFeedback: false,
      feedbackRequiresPurchase: false,
    });
  }
  if (pathname.startsWith('/api/launch/')) {
    if (method !== 'POST') return notFound();
    // The live site wants the classroom tab id in the body.
    if (!body || !body.tabId) {
      return sendJson(res, 400, { error: '请重新打开课堂窗口' });
    }
    const id = decodeURIComponent(pathname.slice('/api/launch/'.length));
    const product = profile.state.catalog.products.find((p) => p.id === id);
    if (!product) return sendJson(res, 404, { error: '未找到这个课件' });
    const file = path.join(profile.coursewareDir, `${id}.html`);
    if (!fs.existsSync(file)) {
      return sendJson(res, 410, {
        error: '此课件请下载后使用；标为免费的课件可在线体验',
      });
    }
    return sendJson(res, 200, {
      productId: id,
      // The shell appends '&accelerated=1' to this URL, so it has to carry a
      // query string of its own for the request to stay well formed.
      url: `/courseware/${id}?local=1`,
      expiresAt: Date.now() + 600000,
      lease: null,
      // The 图灵智赋 works read their own origin and talk to the host page
      // over postMessage, so they need a same-origin frame. The 小白教育
      // bodies keep the sandbox the published site hands them.
      allowSameOrigin: profile.kind === 'leqixiang' && id.startsWith('afe-'),
    });
  }
  if (pathname === '/api/classroom/viewer-check') {
    if (method !== 'POST') return notFound();
    if (!body || !body.productId) {
      return sendJson(res, 400, { error: '课件状态不正确' });
    }
    return sendJson(res, 200, { ok: true, expiresAt: Date.now() + 600000 });
  }
  if (pathname === '/api/classroom/heartbeat') {
    return gone();
  }
  if (pathname === '/api/classroom/release') {
    // The live site answers 410 here: there is no classroom lease to give
    // back, and the original front-end reads that as "expired".
    return gone();
  }
  if (pathname === '/api/library') {
    if (method !== 'GET') return notFound();
    // The live site answers 401 here (the library belongs to an account).
    // The local copy has no accounts, so it lists what is on disk instead —
    // a deliberate difference, so the page still renders offline.
    return sendJson(res, 200, {
      products: profile.state.catalog.products.filter((p) => p.localInstalled),
    });
  }
  if (pathname === '/api/creator' || pathname === '/api/creator/profile') {
    if (pathname === '/api/creator/profile' && method === 'GET') return notFound();
    if (method === 'POST') {
      return pathname === '/api/creator' ? notFound() : needLogin();
    }
    return sendJson(res, 200, { products: [], submissions: [], rules: {} });
  }
  if (pathname.startsWith('/api/downloads/prepare')) {
    if (method !== 'POST') return notFound();
    // The local download endpoint hands over the mirrored courseware file.
    const id = String(
      (body && (body.productId || body.id)) ||
        new URL(req.url, 'http://x').searchParams.get('id') ||
        ''
    );
    const file = path.join(profile.coursewareDir, `${id}.html`);
    if (!fs.existsSync(file)) {
      return sendJson(res, 404, { error: '本地没有安装这份课件。' });
    }
    const product = profile.state.catalog.products.find((p) => p.id === id);
    const title = product ? String(product.title || id) : id;
    /* A 图灵智赋 work is a document plus a folder of assets, so it is
       handed over as a zip; a 小白教育 work is a single file. */
    const packaged = id.startsWith('afe-');
    return sendJson(res, 200, {
      url: `/api/downloads/file/${id}`,
      filename: packaged ? `${safeName(title)}.zip` : `${safeName(title)}.html`,
      bytes: packaged ? 0 : fs.statSync(file).size,
      expiresAt: Date.now() + 600000,
    });
  }
  if (pathname.startsWith('/api/downloads/file/')) {
    if (method !== 'GET' && method !== 'HEAD') return notFound();
    const id = decodeURIComponent(pathname.slice('/api/downloads/file/'.length));
    const product = profile.state.catalog.products.find((p) => p.id === id);
    const title = product ? String(product.title || id) : id;
    if (id.startsWith('afe-')) {
      const zip = buildLqZip(id);
      if (!zip) return sendJson(res, 404, { error: '本地没有安装这份课件。' });
      return send(res, 200, zip, {
        'Content-Type': 'application/zip',
        'Content-Length': zip.length,
        'Content-Disposition': contentDisposition(`${safeName(title)}.zip`),
        'Cache-Control': 'no-cache',
      });
    }
    const file = path.join(profile.coursewareDir, `${id}.html`);
    if (!fs.existsSync(file)) return sendJson(res, 404, { error: '本地没有安装这份课件。' });
    const html = relaxStandaloneGuard(fs.readFileSync(file, 'utf8'));
    return send(res, 200, Buffer.from(html, 'utf8'), {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': Buffer.byteLength(html, 'utf8'),
      'Content-Disposition': contentDisposition(`${safeName(title)}.html`),
      'Cache-Control': 'no-cache',
    });
  }
  if (pathname === '/api/downloads/bulk') {
    if (method !== 'GET') return notFound();
    return sendJson(res, 200, {
      eligible: false,
      scopes: [],
      policyVersion: 'subject-bulk-download-20261025-v3',
      notice:
        '一键下载该科目全部课件后，不适用七日无理由退货；文件损坏、功能故障或与商品说明不符等问题，仍可联系人工售后。如您还未试用课件，请先试用课件。\n您确定要继续下载吗？',
    });
  }
  if (pathname === '/api/orders' || pathname.startsWith('/api/orders/')) {
    if (method === 'POST') return needLogin();
    return notFound();
  }
  if (pathname === '/api/feedback') {
    return needLogin();
  }
  if (pathname === '/api/downloads/bulk/prepare') {
    if (method === 'POST') return needLogin();
    return notFound();
  }
  if (pathname.startsWith('/api/downloads/bulk/jobs/')) {
    return notFound();
  }
  if (pathname === '/api/service-requests' || pathname === '/api/refund-requests') {
    if (method === 'POST') return needLogin();
    return notFound();
  }
  if (pathname.startsWith('/api/admin/')) {
    // The admin pages are not part of the local copy; the live site asks for
    // a login on some methods and 404s the others.
    const notFoundOnGet = [
      '/api/admin/marketplace/rules',
      '/api/admin/products',
      '/api/admin/refunds',
      '/api/admin/refund-requests',
      '/api/admin/service-requests',
      '/api/admin/download-block',
      '/api/admin/resource-covers',
      '/api/admin/download-trace',
    ];
    const notFoundOnPost = [
      '/api/admin/marketplace',
      '/api/admin/content-deliveries',
      '/api/admin/download-bulk-records',
    ];
    if (method === 'POST' && notFoundOnPost.includes(pathname)) return notFound();
    if (method === 'GET' && notFoundOnGet.includes(pathname)) return notFound();
    return needLogin();
  }
  if (pathname === '/api/admin') {
    if (method === 'POST') return notFound();
    return needLogin();
  }
  if (pathname.startsWith('/api/creator/submissions/')) {
    return notFound();
  }
  return notFound();
}

/* ------------------------------------------------------------------ */

const XB_PORT = Number(process.env.XB_PORT || 4173);
const LQ_PORT = Number(process.env.LQ_PORT || 4173);

/*
 * The 乐启享 library: the 小白教育 shell carrying both courseware sources,
 * rebranded.  A profile keeps every path in one place, so the same handlers
 * can also serve the original 小白教育 replica.
 */
function makeProfile(opts) {
  return {
    kind: opts.kind,
    port: opts.port,
    assetsDir: opts.assetsDir,
    coursewareDir: opts.coursewareDir,
    catalogFile: opts.catalogFile,
    mounts: opts.mounts || [],
    /* The 乐启享 build has no accounts; a local one stands in for one. */
    localUser: opts.localUser || null,
    state: { loaded: false, catalog: null, installed: new Set() },
  };
}

const lqProfile = makeProfile({
  kind: 'leqixiang',
  port: LQ_PORT,
  assetsDir: path.join(LQ_ROOT, 'site'),
  coursewareDir: path.join(LQ_ROOT, 'courseware'),
  catalogFile: path.join(LQ_ROOT, 'catalog.json'),
  localUser: {
    id: 'local',
    username: '乐启享本地课件库',
    displayName: '乐启享本地课件库',
    role: 'teacher',
  },
  mounts: [
    { prefix: 'brand/', dir: path.join(LQ_ROOT, 'brand') },
    { prefix: 'images/', dir: path.join(XB_ROOT, 'assets', 'images') },
    { prefix: 'prod/uploads/', dir: path.join(AFE_ROOT, 'public', 'prod', 'uploads') },
    { prefix: 'premium-catalogue/covers/', dir: path.join(AFE_ROOT, 'assets', 'premium-catalogue', 'covers') },
    /*
     * A handful of courseware bodies ask for their libraries from the site
     * root instead of their own folder ("three.js", "tween.js").  The live
     * platform no longer serves those files, so the local copy keeps the
     * same open-source libraries here.
     */
    { prefix: '', dir: path.join(LQ_ROOT, '_shared-root') },
  ],
});

const xbServer = http.createServer((req, res) => {
  /*
   * A malformed request line must not take the whole library down.  `//`
   * and other odd shapes make `new URL` throw, and an exception thrown
   * inside the request handler kills the process before Node can answer.
   */
  let url;
  try {
    url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  } catch {
    sendJson(res, 400, { error: '请求地址无法解析' });
    return;
  }
  handleXb(req, res, url, lqProfile).catch((err) => {
    console.error('[xb]', err);
    sendJson(res, 500, { error: String(err.message || err) });
  });
});

xbServer.listen(XB_PORT, '127.0.0.1', () => {
  console.log(`乐启享课件库 -> http://localhost:${XB_PORT}/`);
});

/*
 * The library is meant to stay up while somebody browses it.  A single
 * unexpected exception must not take the process down with it, so the
 * handler logs and keeps serving.
 */
process.on('uncaughtException', (err) => {
  console.error('[uncaught]', err);
});
process.on('unhandledRejection', (err) => {
  console.error('[unhandled]', err);
});

