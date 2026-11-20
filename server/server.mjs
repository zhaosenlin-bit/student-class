#!/usr/bin/env node
/*
 * The server behind the 乐启享 interactive courseware library.
 *
 *   :4173  乐启享机器人 · 互动课件库  -> mirror/leqixiang
 *
 * Everything a lesson needs is served from this disk: the shell, the
 * catalogue, the courseware bodies and the libraries they load.  Only
 * the small set of API endpoints the shell actually calls is implemented
 * locally, so the library works without the commercial backend and
 * without a network.
 */

import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import { fileURLToPath } from 'node:url';
import { scrubShopCopy, trimLibraryNote } from './lq-shop-copy.mjs';

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
/* Where this file lives — the launcher travels with it. */
const SERVER_DIR = path.dirname(fileURLToPath(import.meta.url));

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
  '.jfif': 'image/jpeg',
  '.bmp': 'image/bmp',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
  '.avif': 'image/avif',
  '.apng': 'image/apng',
  '.heic': 'image/heic',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  /* The browser refuses a module that is not marked as one. */
  '.wasm': 'application/wasm',
  '.bin': 'application/octet-stream',
  '.data': 'application/octet-stream',
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.gz': 'application/gzip',
  '.mov': 'video/quicktime',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.zip': 'application/zip',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

const mimeFor = (p) => MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';

/*
 * The request that is being answered right now.
 *
 * A reply is written from a dozen places, and most of them do not have the
 * request at hand.  The store carries it, so that every reply can ask the
 * browser whether it is willing to take a compressed body and answer with a
 * "not modified" when nothing has changed.
 */
const requestContext = new AsyncLocalStorage();

/* The kinds of body that are worth packing: text shrinks by most of itself. */
const COMPRESSIBLE = /^(?:text\/|application\/(?:json|javascript|xml|xhtml\+xml)|image\/svg\+xml)/i;

function wantsGzip(req) {
  if (!req) return false;
  const accept = String(req.headers['accept-encoding'] || '');
  return /\bgzip\b/i.test(accept);
}

/*
 * The address the reader really used.
 *
 * On this machine the library answers on http://127.0.0.1:4173.  Put it
 * behind a proxy and the address the browser knows is the one the proxy
 * forwards, not the one on the socket.  Two things depend on getting
 * this right: a lesson checks its own origin against the address it was
 * opened with, and the download button is only let through when the
 * request carries an origin of its own.  Both compare against this, so
 * behind a proxy with https they keep working.
 */
function publicOrigin(req, port) {
  const proto =
    String(req.headers['x-forwarded-proto'] || '')
      .split(',')[0]
      .trim() ||
    (req.socket && req.socket.encrypted ? 'https' : 'http');
  const host =
    String(req.headers['x-forwarded-host'] || '')
      .split(',')[0]
      .trim() ||
    req.headers.host ||
    `localhost:${port}`;
  return `${proto}://${host}`;
}

/* The host of an address, without the scheme and the path. */
function originHost(value) {
  try {
    return new URL(String(value || '')).host.toLowerCase();
  } catch {
    return '';
  }
}

/*
 * A small cache of packed bodies.
 *
 * A courseware body is read, rewritten and packed on every visit, which is
 * the most expensive thing the server does.  The files on disk do not
 * change while the library runs, so the packed form is kept for a while
 * and thrown away when the cache grows too large.
 *
 * Only the packed form is kept.  The bodies on disk add up to several
 * hundred megabytes; the packed form is a fraction of that, and the
 * unpacked one is read from the disk whenever a reader asks for it
 * without asking for a packed answer.
 */
const packedCache = new Map();
const PACKED_CACHE_BYTES = 160 * 1024 * 1024;
/* A body bigger than this is answered as it streams, not from the cache. */
const PACKED_CACHE_ENTRY_BYTES = 12 * 1024 * 1024;
let packedCacheBytes = 0;

function cachePacked(key, mtimeMs, gz, etag) {
  const size = gz.length;
  packedCache.set(key, { mtimeMs, gz, etag, size });
  packedCacheBytes += size;
  while (packedCacheBytes > PACKED_CACHE_BYTES && packedCache.size > 1) {
    const oldest = packedCache.keys().next().value;
    const entry = packedCache.get(oldest);
    packedCache.delete(oldest);
    packedCacheBytes -= entry.size;
  }
}

function cachedPacked(key, mtimeMs) {
  const entry = packedCache.get(key);
  if (!entry) return null;
  if (entry.mtimeMs !== mtimeMs) {
    packedCache.delete(key);
    packedCacheBytes -= entry.size;
    return null;
  }
  return entry;
}

/*
 * Packing is done off the main thread.  The largest bodies here run to
 * twenty-five megabytes, and packing one of them takes well over a second
 * of processor time.  Done in the usual way it would hold up every other
 * request for that second — the reader would see a picture that never
 * arrives and a lesson that never opens.  Done this way, the request that
 * asked for it waits and nobody else does.
 */
function pack(raw) {
  try {
    return zlib.gzipSync(raw, { level: 6 });
  } catch {
    return null;
  }
}

function packAsync(raw, level = 6) {
  return new Promise((resolve) => {
    zlib.gzip(raw, { level }, (err, out) => resolve(err ? null : out));
  });
}

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
  /*
   * The folder name of a module package ends in "+esm" and carries no
   * other extension.  The separator in front of it is a backslash on
   * Windows and a slash elsewhere, so both are accepted.
   */
  if (/(?:[\\/]|^)\+esm$/.test(p)) return 'text/javascript; charset=utf-8';
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
  /*
   * A text body is packed on the way out.  The courseware alone is several
   * hundred megabytes, and packing it once and sending the small form is
   * the difference between a page that opens at once and one that waits.
   */
  const store = requestContext.getStore();
  const req = store && store.req;
  const type = String(headers['Content-Type'] || '');
  if (
    body &&
    body.length > 512 &&
    body.length <= 256 * 1024 &&
    !headers['Content-Encoding'] &&
    COMPRESSIBLE.test(type) &&
    wantsGzip(req)
  ) {
    const packed = pack(body);
    if (packed) {
      headers['Content-Encoding'] = 'gzip';
      headers['Content-Length'] = packed.length;
      if (!/\bAccept-Encoding\b/i.test(headers.Vary || '')) {
        headers.Vary = headers.Vary
          ? `${headers.Vary}, Accept-Encoding`
          : 'Accept-Encoding';
      }
      body = packed;
    }
  }
  res.writeHead(status, headers);
  res.end(body);
}

function sendJson(res, status, obj) {
  const body = Buffer.from(JSON.stringify(obj));
  send(res, status, body, { 'Content-Type': 'application/json; charset=utf-8' });
}

/*
 * A lesson that is not on this machine.
 *
 * The preview opens the lesson inside a frame, so the answer has to be a
 * page and not a line of JSON: a reader who lands here should be told
 * what happened in words they can act on.
 */
function sendMissingCourseware(res, id) {
  const body = Buffer.from(
    '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n<meta charset="utf-8">\n' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
      '<title>本地没有安装这份课件</title>\n' +
      '<style>' +
      'html,body{height:100%;margin:0}' +
      'body{display:grid;place-items:center;background:#f6f7f9;color:#2b3138;' +
      'font:16px/1.8 system-ui,-apple-system,"Segoe UI","Microsoft YaHei",sans-serif;padding:24px}' +
      '.box{max-width:520px;text-align:center}' +
      'h1{font-size:20px;margin:0 0 12px}' +
      'p{margin:0 0 10px;color:#5a6472}' +
      'code{font-size:13px;color:#8a94a2;word-break:break-all}' +
      'a{display:inline-block;margin-top:18px;padding:10px 22px;border-radius:8px;' +
      'background:#1f6f4a;color:#fff;text-decoration:none;font-weight:600}' +
      '</style>\n</head>\n<body>\n<div class="box">\n' +
      '<h1>本机还没有这份课件的文件</h1>\n' +
      '<p>这一份课件没有收进本地课件库，所以现在打不开。</p>\n' +
      '<p>请回到课件库挑一份已经收录的课件；本库里的每一份都可以直接预览和下载。</p>\n' +
      `<code>${String(id || '').replace(/[<&]/g, '')}</code>\n` +
      '<br><a href="../#catalog" target="_top">返回课件库</a>\n' +
      '</div>\n</body>\n</html>\n',
    'utf8'
  );
  send(res, 404, body, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-cache',
  });
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

/*
 * The mirrored sites kept their pictures and their libraries in folders
 * of their own.  A work that asks for one of them by its root-relative
 * name is answered from the mirror of that site.
 */
/*
 * A few mirrors keep their files under a folder named after the site
 * they came from.  A work asks for those files by the root of that
 * site, so the request is answered from the folder of the same name.
 *
 *   prefix : the address the work writes.  When it is given, that
 *            part is cut off before the file is looked for.
 *   dir    : the folder inside the shared mirror that holds them.
 */
const MIRROR_ROOT_HOSTS = [
  { dir: 'vendor', prefix: null },
  { dir: 'fonts.gstatic.com', prefix: 'fonts.gstatic.com' },
];

/*
 * The add-ons of the 3D library are asked for by the layout of the
 * release they came from — "jsm/geometries/RoundedBoxGeometry.js" — and
 * the mirror keeps that layout inside the folder of that release.  The
 * folder is looked in when the flat one does not hold the file.
 */
const THREE_RELEASES = ['unpkg.com/three@0.136.0', 'cdn.skypack.dev/three@0.136.0'];
function threeAddOn(rel) {
  if (!rel.startsWith('jsm/')) return null;
  const base = path.join(LQ_ROOT, '_shared-ext');
  for (const release of THREE_RELEASES) {
    const file = safeJoin(path.join(base, release, 'examples'), rel);
    if (!file) continue;
    try {
      if (fs.statSync(file).isFile()) return file;
    } catch {
      /* Not in this release. */
    }
  }
  return null;
}

function mirroredRootAsset(rel) {
  if (!rel || rel.includes('..')) return null;
  const base = path.join(LQ_ROOT, '_shared-ext');
  for (const host of MIRROR_ROOT_HOSTS) {
    let tail = rel;
    if (host.prefix) {
      if (rel === host.prefix) tail = '';
      else if (rel.startsWith(host.prefix + '/')) {
        tail = rel.slice(host.prefix.length + 1);
      } else continue;
    }
    const file = safeJoin(path.join(base, host.dir), tail);
    if (file) {
      try {
        if (fs.statSync(file).isFile()) return file;
      } catch {
        /* A name the mirror does not hold is simply not answered. */
      }
    }
    /*
     * The physics works keep their pictures in a folder named after the
     * family they belong to ("Phyc140/texture/…"), while the work asks
     * for them by the plain name ("texture/…").  The family folders are
     * looked through as well.
     */
    if (host.dir === 'vendor') {
      for (const family of vendorFamilies()) {
        const inside = safeJoin(path.join(base, host.dir, family), tail);
        if (!inside) continue;
        try {
          if (fs.statSync(inside).isFile()) return inside;
        } catch {
          /* Not in this family. */
        }
      }
    }
    /*
     * The very same picture, spelled a little differently on the disk:
     * a hyphen where the disk has none, or the extension in another
     * order.  The folder is looked at as a whole, so nothing is guessed
     * and nothing outside the folder is ever reached.
     */
    const near = nearName(base, host.dir, tail);
    if (near) return near;
  }
  const addOn = threeAddOn(rel);
  if (addOn) return addOn;
  return null;
}

/*
 * The name of a file, with the separators and the case left out, so that
 * "green-field.jpg" and "greenfield.jpg" are recognised as one name.
 */
const RELAXED_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'jfif', 'webp',
  'svg', 'mp3', 'wav', 'ogg', 'mp4', 'woff', 'woff2', 'ttf',
]);
function nameKey(name) {
  const dot = name.lastIndexOf('.');
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
  return {
    stem: stem.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, ''),
    ext,
    loose: RELAXED_EXTENSIONS.has(ext),
  };
}

/*
 * The folder a file is looked in, remembered for a while, so that a
 * busy preview does not read the same folder over and over.
 */
const folderCache = new Map();
function folderEntries(dir) {
  const hit = folderCache.get(dir);
  if (hit && hit.until > Date.now()) return hit.names;
  let names = [];
  try {
    names = fs.readdirSync(dir);
  } catch {
    names = [];
  }
  folderCache.set(dir, { names, until: Date.now() + 60_000 });
  return names;
}

function nearName(base, hostDir, tail) {
  const slash = tail.lastIndexOf('/');
  const wantDir = slash >= 0 ? tail.slice(0, slash) : '';
  const wantBase = slash >= 0 ? tail.slice(slash + 1) : tail;
  const want = nameKey(wantBase);
  if (!want.stem) return null;
  const roots = [path.join(base, hostDir)];
  if (hostDir === 'vendor') {
    for (const family of vendorFamilies()) {
      roots.push(path.join(base, hostDir, family));
    }
  }
  for (const root of roots) {
    const folder = wantDir ? safeJoin(root, wantDir) : root;
    if (!folder) continue;
    for (const entry of folderEntries(folder)) {
      const key = nameKey(entry);
      if (key.stem !== want.stem) continue;
      if (key.ext !== want.ext && !(key.loose && want.loose)) continue;
      const hit = safeJoin(folder, entry);
      if (!hit) continue;
      try {
        if (fs.statSync(hit).isFile()) return hit;
      } catch {
        /* Not a file after all. */
      }
    }
  }
  return null;
}

let vendorFamilyCache = null;
function vendorFamilies() {
  if (vendorFamilyCache) return vendorFamilyCache;
  const dir = path.join(LQ_ROOT, '_shared-ext', 'vendor');
  try {
    vendorFamilyCache = fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    vendorFamilyCache = [];
  }
  return vendorFamilyCache;
}

/*
 * A page that was mirrored from a site of its own sometimes builds the
 * address of a file while it runs, so the address is nowhere in the text
 * of the page.  What it asks for is the root of the site it came from:
 * "/images/style/menu.svg".
 *
 * The browser says where such a request comes from, so the file is
 * looked for in the mirror of that very site.  Nothing is guessed here:
 * the address has to be there before it is handed out, and the name of
 * the site in front of the address ("/mathsisfun/images/…") is taken
 * off when the address is written that way.
 */
function extRootAssetFor(rel, referer) {
  if (!rel || rel.includes('..') || !referer) return null;
  let refPath;
  try {
    refPath = new URL(referer, 'http://localhost').pathname;
  } catch {
    return null;
  }
  const m = /^\/api\/program-assets\/([A-Za-z0-9_-]+)\/_ext\/([^/]+)\//.exec(refPath);
  if (!m) return null;
  const program = m[1];
  const host = m[2];
  const localId = lqLocalId(program);
  const bases = [];
  if (localId) bases.push(path.join(LQ_ROOT, 'courseware', `${localId}.assets`, '_ext', host));
  bases.push(path.join(LQ_ROOT, '_shared-ext', host));
  /*
   * The name of the site is sometimes put in front of the address by the
   * script of the site.  That name is one of the parts of the host, so
   * it can be taken off.
   */
  const labels = host.toLowerCase().split('.');
  const variants = [rel];
  const parts = rel.replace(/^\/+/, '').split('/');
  for (let k = parts.length - 1; k >= 1; k--) {
    const head = parts.slice(0, k).join('.').toLowerCase();
    if (head === host.toLowerCase()) {
      variants.push(parts.slice(k).join('/'));
      break;
    }
  }
  const first = parts[0].toLowerCase();
  if (first && labels.includes(first)) variants.push(parts.slice(1).join('/'));
  for (const base of bases) {
    for (const v of variants) {
      const file = safeJoin(base, v);
      if (!file) continue;
      try {
        if (fs.statSync(file).isFile()) return file;
      } catch {
        /* Not there; the next place is tried. */
      }
    }
  }
  /*
   * Sometimes the page that asks is not the page that owns the file: one
   * site keeps a picture that another site asks for by its own root.  The
   * other mirrors are looked through as well, but only a file that is
   * really there is handed out.
   */
  const others = [];
  try {
    for (const h of fs.readdirSync(path.join(LQ_ROOT, '_shared-ext'))) {
      if (h !== host) others.push(path.join(LQ_ROOT, '_shared-ext', h));
    }
  } catch {
    /* No shared library yet. */
  }
  if (localId) {
    try {
      const dir = path.join(LQ_ROOT, 'courseware', `${localId}.assets`, '_ext');
      for (const h of fs.readdirSync(dir)) {
        if (h !== host) others.push(path.join(dir, h));
      }
    } catch {
      /* This lesson has no mirrored pages of its own. */
    }
  }
  for (const base of others) {
    for (const v of variants) {
      const file = safeJoin(base, v);
      if (!file) continue;
      try {
        if (fs.statSync(file).isFile()) return file;
      } catch {
        /* Not there either. */
      }
    }
  }
  return null;
}

/*
 * The names of the sites that are mirrored here.  A page that was
 * mirrored from one of them may lean on another — a font service, a
 * picture host — and those are pointed at the copies on this machine.
 */
function mirroredHostNames(localId) {
  /*
   * The list is asked for on every file that is handed out, and it does
   * not change from one minute to the next, so it is kept for a little
   * while instead of being counted again and again.
   */
  const now = Date.now();
  if (hostNamesCache && hostNamesCache.at > now && hostNamesCache.id === localId)
    return hostNamesCache.names;
  const names = new Set();
  try {
    for (const h of fs.readdirSync(path.join(LQ_ROOT, '_shared-ext'))) {
      try {
        if (fs.statSync(path.join(LQ_ROOT, '_shared-ext', h)).isDirectory()) names.add(h);
      } catch {
        /* Not a folder. */
      }
    }
  } catch {
    /* No shared library yet. */
  }
  if (localId) {
    try {
      const dir = path.join(LQ_ROOT, 'courseware', `${localId}.assets`, '_ext');
      for (const h of fs.readdirSync(dir)) {
        try {
          if (fs.statSync(path.join(dir, h)).isDirectory()) names.add(h);
        } catch {
          /* Not a folder. */
        }
      }
    } catch {
      /* This lesson has no mirrored pages of its own. */
    }
  }
  hostNamesCache = { at: now + 60000, id: localId, names: [...names] };
  return hostNamesCache.names;
}

let hostNamesCache = null;

/*
 * Addresses that are of no use here: a count of visitors, a small form
 * that is sent to somebody else.  They are pointed at this machine,
 * which quietly lets them go.
 */
const DEAD_EXTERNAL = [
  'https://mi2f.com/update.php',
  'http://mi2f.com/update.php',
  'https://www.mi2f.com/update.php',
  'http://www.mi2f.com/update.php'
];

async function serveFile(
  res,
  file,
  { download = false, contentType, headers: extra, cache } = {}
) {
  try {
    const stat = await fsp.stat(file);
    if (!stat.isFile()) return false;
    const type = contentType || mimeFor(file);
    const headers = {
      'Content-Type': type,
      'Cache-Control': cache || 'no-cache',
    };
    if (extra) Object.assign(headers, extra);
    /*
     * A picture, a sound or a model is asked for in pieces by the
     * browser.  Saying that the file may be read in pieces is what lets
     * a long recording start playing at once and lets a reader look for
     * a moment inside it.
     */
    const ranged = !COMPRESSIBLE.test(type);
    if (ranged) headers['Accept-Ranges'] = 'bytes';
    if (download) {
      headers['Content-Disposition'] =
        `attachment; filename="${encodeURIComponent(path.basename(file))}"`;
    }
    /*
     * A file that has not changed is answered with a number instead of a
     * body.  The browser then keeps its copy and the library opens at once
     * on the second visit.
     */
    const tag = `"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
    headers.ETag = tag;
    const store = requestContext.getStore();
    const req = store && store.req;
    if (req && String(req.headers['if-none-match'] || '') === tag) {
      res.writeHead(304, headers);
      res.end();
      return true;
    }
    if (req && req.method === 'HEAD') {
      headers['Content-Length'] = stat.size;
      res.writeHead(200, headers);
      res.end();
      return true;
    }
    /*
     * A text file is packed once and kept in that form.  Packing a
     * megabyte of courseware on every visit is the one thing that made the
     * library feel slow.
     */
    const range = req ? String(req.headers.range || '') : '';
    if (ranged && /^bytes=/i.test(range)) {
      const m = /^bytes=(\d*)-(\d*)$/i.exec(range.trim());
      if (m) {
        let start;
        let end;
        if (m[1] === '') {
          /* The last few bytes of the file. */
          const tail = Number(m[2] || 0);
          start = Math.max(0, stat.size - tail);
          end = stat.size - 1;
        } else {
          start = Number(m[1]);
          end = m[2] === '' ? stat.size - 1 : Math.min(Number(m[2]), stat.size - 1);
        }
        if (
          !Number.isFinite(start) ||
          !Number.isFinite(end) ||
          start > end ||
          start >= stat.size
        ) {
          res.writeHead(416, {
            'Content-Range': `bytes */${stat.size}`,
            'Accept-Ranges': 'bytes',
          });
          res.end();
          return true;
        }
        headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;
        headers['Content-Length'] = end - start + 1;
        res.writeHead(206, headers);
        if (req.method === 'HEAD') {
          res.end();
          return true;
        }
        fs.createReadStream(file, { start, end }).pipe(res);
        return true;
      }
    }
    if (COMPRESSIBLE.test(type) && stat.size > 512) {
      const key = file;
      let entry = cachedPacked(key, stat.mtimeMs);
      if (!entry) {
        const raw = await fsp.readFile(file);
        const gz = await packAsync(raw);
        if (gz && gz.length <= PACKED_CACHE_ENTRY_BYTES) {
          cachePacked(key, stat.mtimeMs, gz, headers.ETag);
          entry = cachedPacked(key, stat.mtimeMs);
        }
      }
      if (entry.gz && wantsGzip(req)) {
        headers['Content-Encoding'] = 'gzip';
        headers['Content-Length'] = entry.gz.length;
        headers.Vary = 'Accept-Encoding';
        res.writeHead(200, headers);
        res.end(entry.gz);
        return true;
      }
      /* No packed form to hand over: the file on disk is the answer. */
      const raw = await fsp.readFile(file);
      headers['Content-Length'] = raw.length;
      res.writeHead(200, headers);
      res.end(raw);
      return true;
    }
    headers['Content-Length'] = stat.size;
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

/*
 * The 精品课 packs name their own band.  The name is a shelf label, and
 * the library sorts by subject and grade, so the name is taken apart:
 * "八年级物理 · 上下册" is a physics lesson for the eighth grade.
 */
const LQ_PACKAGE_SUBJECT = {
  高中数学: { subject: '数学', grade: '高中' },
  高二数学: { subject: '数学', grade: '高二' },
  高一数学: { subject: '数学', grade: '高一' },
  七年级数学: { subject: '数学', grade: '七年级' },
  八年级数学: { subject: '数学', grade: '八年级' },
  九年级数学: { subject: '数学', grade: '九年级' },
  小学数学: { subject: '数学', grade: '小学' },
  九年级化学: { subject: '化学', grade: '九年级' },
  高中化学: { subject: '化学', grade: '高中' },
  高二化学: { subject: '化学', grade: '高二' },
  高一化学: { subject: '化学', grade: '高一' },
  八年级物理: { subject: '物理', grade: '八年级' },
  '八年级物理 · 上下册': { subject: '物理', grade: '八年级' },
  九年级物理: { subject: '物理', grade: '九年级' },
  高中物理合集: { subject: '物理', grade: '高中' },
  高中物理: { subject: '物理', grade: '高中' },
  高三物理: { subject: '物理', grade: '高三' },
  高二物理: { subject: '物理', grade: '高二' },
  高一物理: { subject: '物理', grade: '高一' },
};

/*
 * A shelf label is not a subject.  "八年级数学", "高中物理合集" and
 * "八年级物理 · 上下册" are the names the packs are sold under, and they
 * turn up again in the per-stage subject map — where the reader would
 * see them as if they were subjects of their own.  Every label that
 * reaches the catalogue goes through here first, so that what the
 * filter row offers is the subject the lesson is actually about.
 */
function lqSubjectLabel(raw) {
  const text = String(raw || '').trim();
  if (!text) return '';
  const pack = LQ_PACKAGE_SUBJECT[text];
  if (pack) return pack.subject;
  /* "生物 · 八年级" and friends: the first half is the subject. */
  const head = text.split(' · ')[0].trim();
  return head || text;
}

function lqStageSubjects(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [stage, label] of Object.entries(raw)) {
    const subject = lqSubjectLabel(label);
    if (subject) out[stage] = subject;
  }
  return out;
}

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
    /*
     * Some platforms wrote the grade into the subject ("生物 · 八年级").
     * That string is a label, not a subject, and it leaks into the
     * subject filter and the chapter tree as a chapter of its own.  The
     * subject is the first half; the grade is kept beside it.
     */
    const rawSubject = String(p.subject || '');
    let subjectKey = String(p.subjectKey || rawSubject.split(' · ')[0] || '综合');
    let gradeLabel = p.gradeLabel || (rawSubject.includes(' · ')
      ? rawSubject.split(' · ').slice(1).join(' · ')
      : '');
    /*
     * The 精品课 packs carry the whole band in their name ("八年级物理 ·
     * 上下册").  That is a shelf, not a subject, so it is taken apart into
     * the subject it belongs to and the grade it was written for.
     */
    const pack = LQ_PACKAGE_SUBJECT[rawSubject] || LQ_PACKAGE_SUBJECT[subjectKey];
    if (pack) {
      subjectKey = pack.subject;
      gradeLabel = pack.grade;
    }
    /*
     * Anything still carrying a shelf name — the subject map of a pack
     * has one for every stage, and those hold the pack names again —
     * is cut down to the subject it stands for.
     */
    subjectKey = lqSubjectLabel(subjectKey) || '综合';
    if (subjectKey !== rawSubject && !gradeLabel) {
      const tail = String(rawSubject).split(' · ').slice(1).join(' · ').trim();
      if (tail) gradeLabel = tail;
    }
    /*
     * Some lessons carry their band in the tree instead of the name:
     * "八年级上册" is the branch they sit on.  That is the grade the
     * reader wants to see on the card, so it is taken from there.
     */
    if (!gradeLabel && Array.isArray(p.taxonomy) && p.taxonomy.length) {
      const domain = String(p.taxonomy[0]?.domain || '').trim();
      if (domain && domain !== subjectKey) gradeLabel = domain;
    }
    /*
     * A price, a discount and a countdown belong to a shop.  This is a
     * library: every lesson here can be opened and taken away, so those
     * words are taken out of the answer rather than shown and then ignored.
     */
    const {
      price,
      originalPrice,
      promotion,
      canPurchase,
      canFeedback,
      feedbackRequiresPurchase,
      onlineOnly,
      downloadReason,
      localReason,
      ...rest
    } = p;
    return {
      ...rest,
      subject: subjectKey,
      subjectKey,
      gradeLabel,
      stageSubjects: lqStageSubjects(p.stageSubjects),
      /* The note about the price belongs to the shelf it was sold on. */
      description: trimLibraryNote(scrubShopCopy(p.description)),
      tagline: scrubShopCopy(p.tagline),
      // No commerce locally: every entry is presented as free to use.
      mode: 'free',
      publicationStatus: p.publicationStatus || 'published',
      owned: p.owned ?? has,
      accessible: p.accessible ?? has,
      onlineAccessible: p.onlineAccessible ?? has,
      available: p.available ?? has,
      downloadable: p.downloadable ?? has,
      canDownload: p.canDownload ?? has,
      localInstalled: has,
      launchUrl: `/api/launch/${p.id}`,
    };
  }).filter((p) => p.localInstalled);

  /*
   * A course that was split into smaller ones points at the pieces.  A
   * piece that is not on this machine cannot be opened, so an entry whose
   * pieces are all missing is dropped as well: it would only lead to a
   * page that has nothing on it.
   */
  const replacements = {};
  for (const [id, entry] of Object.entries(catalog.courseReplacements || {})) {
    const ids = Array.isArray(entry?.productIds) ? entry.productIds : [];
    if (!ids.some((child) => installed.has(child))) continue;
    replacements[id] = entry;
  }

  /*
   * The chapter tree, the course packs and the download lists all point at
   * lessons by name.  Some of those names belong to lessons that are not on
   * this machine — they are the ones the platform only lends out.  A chapter
   * that names such a lesson promises a course that cannot be opened, and a
   * counter that counts it says "six lessons" where there is none.  So the
   * lists are cut down to the lessons that are really here, and the counters
   * are counted again from what is left.
   */
  const live = new Set(products.map((p) => p.id));
  const curriculum = catalog.curriculum
    ? {
        ...catalog.curriculum,
        chapters: (catalog.curriculum.chapters || [])
          .map((chapter) => {
            const topics = (chapter.topics || [])
              .map((topic) => ({
                ...topic,
                courseIds: (topic.courseIds || []).filter((id) => live.has(id)),
              }))
              .filter((topic) => topic.courseIds.length);
            return { ...chapter, topics };
          })
          .filter((chapter) => chapter.topics.length),
      }
    : catalog.curriculum;

  const bundles = (catalog.bundles || []).map((bundle) => {
    const productIds = (bundle.productIds || []).filter((id) => live.has(id));
    return {
      id: bundle.id,
      title: bundle.title,
      subject: lqSubjectLabel(bundle.subject),
      stages: bundle.stages || [],
      stage: bundle.stage || '',
      stageSubjects: lqStageSubjects(bundle.stageSubjects),
      productIds,
      count: productIds.length,
    };
  });

  const downloadScopes = (catalog.downloadScopes || []).map((scope) => {
    const productIds = (scope.productIds || []).filter((id) => live.has(id));
    return {
      id: scope.id,
      title: scope.title,
      subject: lqSubjectLabel(scope.subject),
      stage: scope.stage || '',
      productIds,
      count: productIds.length,
    };
  });

  state.catalog = {
    serverTime: Date.now(),
    products,
    courseReplacements: replacements,
    curriculum,
    bundles,
    downloadScopes,
    selling: false,
    salesMode: 'local',
    siteMode: 'local',
    downloadMode: true,
    /*
     * The library keeps the name and the filing number of the house it
     * belongs to, and nothing else of the shop it grew out of: no card
     * prices, no plan sheets, no refund rules, no back office.
     */
    seller: catalog.seller || '',
    support: catalog.support || '',
    creditCode: catalog.creditCode || '',
    icp: catalog.icp || '',
    securityNumber: catalog.securityNumber || '',
    localReplica: {
      installedCount: installed.size,
      totalCount: products.length,
      coursewareDir: 'mirror/xbjiaoyu/courseware',
    },
  };
  /*
   * The catalogue is the one answer every page waits for, so it is worked
   * out once and kept: the text it is written in, and the mark that says
   * whether a reader already has it.
   *
   * The mark is worked out from the answer itself, not from the file it was
   * made from.  The file does not change when the answer does — the answer
   * is cut down to the lessons that are really here — and a mark taken from
   * the file would tell a reader that the copy they hold is still the good
   * one when it is not.
   */
  state.catalogBody = Buffer.from(JSON.stringify(state.catalog), 'utf8');
  state.catalogTag = `"${crypto
    .createHash('sha1')
    .update(state.catalogBody)
    .digest('hex')
    .slice(0, 16)}"`;
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
  'https://threejs.org/',
  'https://miaoda.feishu.cn/',
  'https://sf3-scmcdn-cn.feishucdn.com/',
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
  'https://media.doubao.com/',
  'https://zxkeben.szxuexiao.com/',
  'https://keben.szxuexiao.com/',
  'https://appsj.szxuexiao.com/',
  'https://www.szxuexiao.com/',
  'https://images.szxuexiao.com/',
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
  /*
   * One lesson draws the portraits of its characters from an avatar
   * service on the internet.  The address is assembled piece by piece
   * inside the lesson's own script, so it cannot simply be rewritten
   * in the text — but the picture that comes out of it can be pointed
   * at the copy that is stored here.
   */
  if (out.includes("'ebear'")) {
    out = out.replace(
      /<head\b([^>]*)>/i,
      `<head$1>${DICE_BEAR_LOCAL}`
    );
  }
  return out;
}

/*
 * The avatars themselves are kept under "_shared-ext/api.dicebear.com".
 * The lesson builds its address piece by piece inside its own script,
 * so the address cannot be found in the text and simply swapped there.
 * This little script watches every way a picture can be put into a
 * page and turns the address into the local copy, leaving everything
 * else alone.
 */
const DICE_BEAR_LOCAL = [
  '<script>(function(){',
  'var R=/https?:\\/\\/(?:api\\.)?dicebear\\.com\\/([\\w.-]+)\\/([\\w.-]+)\\/svg\\?seed=([\\w-]+)&backgroundColor=([\\w-]+)/g;',
  'var F=function(s){return String(s).replace(R,function(m,a,b,c,d){',
  "return '/api/avatar/dicebear/'+b+'/'+c+'-'+d+'.svg';});};",
  /* A picture put in by writing out a piece of text. */
  'var E=Element.prototype;',
  'var ih=Object.getOwnPropertyDescriptor(E,"innerHTML");',
  'if(ih&&ih.set){Object.defineProperty(E,"innerHTML",{get:ih.get,set:function(v){',
  'return ih.set.call(this,F(v));},configurable:true});}',
  'var oh=Object.getOwnPropertyDescriptor(E,"outerHTML");',
  'if(oh&&oh.set){Object.defineProperty(E,"outerHTML",{get:oh.get,set:function(v){',
  'return oh.set.call(this,F(v));},configurable:true});}',
  'var ia=E.insertAdjacentHTML;',
  'E.insertAdjacentHTML=function(p,v){return ia.call(this,p,F(v));};',
  /* A picture put in by naming its address. */
  'var sa=E.setAttribute;',
  'E.setAttribute=function(n,v){return sa.call(this,n,n==="src"?F(v):v);};',
  'var p=HTMLImageElement.prototype,d=Object.getOwnPropertyDescriptor(p,"src");',
  'if(d&&d.set){Object.defineProperty(p,"src",{get:d.get,set:function(v){',
  'return d.set.call(this,F(v));},configurable:true});}',
  '})();</script>'
].join('');

/*
 * A few of the 图灵智赋 works reach out to a third party at runtime: the
 * 长征 save client announces itself without the list of keys it is allowed
 * to write. That is rewritten here so a saved session can be restored.
 */
function patchLqBody(html, localId, mathjaxUrl = MATHJAX_FONT_URL) {
  let out = html;
  /* Let the host know which progress keys the courseware may write, so a
     saved session can be restored on the next visit. */
  out = out.replace(
    /window\.parent\.postMessage\(\{type:config\.protocol\+':ready',programId:config\.programId,revision:config\.revision,entry:config\.entry,nonce\}/g,
    "window.parent.postMessage({type:config.protocol+':ready',programId:config.programId,revision:config.revision,entry:config.entry,nonce,keys:config.keys}"
  );
  /*
   * MathJax writes the place where its fonts live as "%%URL%%" and only
   * fills it in when it is told where the fonts are.  Some of the
   * lessons never tell it, so the browser asks for a file called
   * "%%URL%%" and every formula comes out in the fallback font.  The
   * fonts are on this machine, so the place is written in.
   */
  if (out.includes('%%URL%%')) {
    out = out.split('%%URL%%').join(mathjaxUrl);
  }
  return out;
}

function lqLocalId(programId) {
  if (fs.existsSync(path.join(LQ_ROOT, 'courseware', `${programId}.html`))) return programId;
  const afe = `afe-${programId}`;
  if (fs.existsSync(path.join(LQ_ROOT, 'courseware', `${afe}.html`))) return afe;
  return null;
}

/*
 * The fonts MathJax draws its formulas with.  They are mirrored once and
 * shared, and the place they are at is written into the lessons that
 * ask for them.
 */
const MATHJAX_FONT_DIR = path.join(
  LQ_ROOT,
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
const MATHJAX_FONT_URL = '/mathjax/fonts/woff-v2';

/*
 * Some works are one document; others are a document plus a folder of
 * assets, or an open simulation that asks for a copy of three.js.  The
 * latter are handed over as a zip, because a single file would lose the
 * library and stop drawing.
 */
const PACKAGED = ['afe-', 'openlab-', 'labsims-', 'blocklygames-', 'lab-'];
const isPackagedCourse = (id) => PACKAGED.some((prefix) => id.startsWith(prefix));

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
  const script = cdnShim(map);
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
 * A few works carry a content-security policy that names its inline
 * scripts by their fingerprint.  The copy on this disk has its addresses
 * rewritten and a small helper added, so the fingerprints no longer
 * match and the browser refuses to run the scripts at all.
 *
 * The fingerprints are worked out again from the text that is actually
 * handed out, and the rules that keep the copy from reaching for the
 * network are left as they are.
 */
function refreshCsp(html) {
  const meta = /<meta\b[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/i.exec(html);
  if (!meta) return html;
  const tag = meta[0];
  const quoted = /content=(["'])([\s\S]*?)\1/i.exec(tag);
  if (!quoted) return html;
  let policy = quoted[2];
  if (!/script-src[^;]*'sha256-/i.test(policy)) return html;

  /* The fingerprint of every script that has no address of its own. */
  const hashes = new Set();
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc\s*=/i.test(m[1])) continue;
    hashes.add(
      "'sha256-" + crypto.createHash('sha256').update(m[2], 'utf8').digest('base64') + "'"
    );
  }
  if (!hashes.size) return html;

  /*
   * The fingerprints that were already there are kept: a script that is
   * unpacked at run time is not in the document yet, and its fingerprint
   * is the only trace of it.  The ones worked out now are added beside
   * them.
   */
  policy = policy.replace(/(script-src[^;]*)/i, (_all, directive) => {
    const seen = new Set(directive.match(/'sha256-[A-Za-z0-9+/=]+'/g) || []);
    for (const h of hashes) seen.add(h);
    const rest = directive.replace(/'sha256-[A-Za-z0-9+/=]+'/g, '').trimEnd();
    return rest + ' ' + [...seen].join(' ');
  });
  /*
   * The pictures and the files of the lesson come from this machine, and
   * the lesson's own rules did not allow for that.  "self" only names
   * this server, so nothing new can be reached.
   */
  policy = policy.replace(
    /\b(img-src|font-src|media-src|connect-src)\s+([^;]*)/gi,
    (all, name, rest) => {
      const value = rest.trim();
      /* "none" on its own means nothing is allowed; it cannot stand
         together with another source. */
      if (/^'none'$/i.test(value)) return name + " 'self'";
      if (/(^|\s)'self'(\s|$)/.test(value)) return all;
      return name + " 'self' " + value;
    }
  );

  const newTag = tag.replace(/(content=)(["'])([\s\S]*?)\2/i, (_all, head, q) => head + q + policy + q);
  return html.slice(0, meta.index) + newTag + html.slice(meta.index + tag.length);
}

/*
 * A lesson as this library hands it out.
 *
 * The body on disk still points at the platform it came from: its classroom
 * handshake carries that platform's address, and its files live under that
 * platform's file service.  Both are turned to point here instead, and the
 * rules that would keep the lesson from running on its own are lifted.  The
 * lesson itself is left exactly as it is.
 *
 * The reading is done off the main thread: the biggest bodies here run to
 * twenty-five megabytes, and a plain read of one of them would hold up
 * every other reader for as long as it took.
 */
async function readPatchedCourseware(file, id, profile, origin) {
  const html = await fsp.readFile(file, 'utf8');
  let patched = html.replace(
    /("origin"\s*:\s*)"https:\/\/xbjiaoyu\.com"/g,
    `$1${JSON.stringify(origin)}`
  );
  patched = patched.replace(
    /("origin"\s*:\s*)"__LQ_ORIGIN__"/g,
    `$1${JSON.stringify(origin)}`
  );
  if (profile.kind === 'leqixiang') {
    patched = rewriteCoursewareUrls(patched, id);
    patched = patchLqBody(patched, id);
    patched = injectLocalCdnShim(patched, id);
    /*
     * A lesson asks the page that holds it whether it may run.  In
     * the classroom that answer comes from the platform; here the
     * page is the library itself, and there is no ticket to ask for.
     * So a lesson opened on its own is let in straight away, and one
     * opened inside the library is let in by the library.
     */
    patched = releaseLocalClassroom(patched);
    patched = refreshCsp(patched);
  }
  return Buffer.from(patched, 'utf8');
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
  const script = cdnShim(map);
  const head = /<head[^>]*>/i.exec(html);
  if (head) {
    const at = head.index + head[0].length;
    return html.slice(0, at) + script + html.slice(at);
  }
  return script + html;
}

/*
 * A lesson that names a public library at runtime does not always do it
 * through fetch: some of them drop a <script> into the page while it
 * runs, and some set the address of a picture as they go.  Every one
 * of those ways out is closed here, so the copy on this disk is the
 * copy that runs.
 */
function cdnShim(map) {
  return `<script>(function(){
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
var s=Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype,'src');
if(s&&s.set){Object.defineProperty(HTMLScriptElement.prototype,'src',{get:s.get,set:function(v){s.set.call(this,fix(v));}});}
var l=Object.getOwnPropertyDescriptor(HTMLLinkElement.prototype,'href');
if(l&&l.set){Object.defineProperty(HTMLLinkElement.prototype,'href',{get:l.get,set:function(v){l.set.call(this,fix(v));}});}
var sa=Element.prototype.setAttribute;
Element.prototype.setAttribute=function(n,v){if((n==='src'||n==='href')&&typeof v==='string'){try{v=fix(v);}catch(e){}}return sa.call(this,n,v);};
})();</script>`;
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

/*
 * A lesson asks the page that holds it whether it may run, and it keeps
 * its screen dark until the answer arrives.  On the live site the answer
 * comes from the classroom; here there is no classroom and no ticket to
 * ask for, so the lesson is let in from the start and the grace never
 * runs out.
 *
 * Only the three places that decide whether the screen may show are
 * touched.  The lesson itself is left exactly as it is.
 */
function releaseLocalClassroom(html) {
  return html
    /* Let in from the start instead of waiting for an answer. */
    .split("change('waiting');")
    .join("change('active');")
    /* And no grace to run out: there is no session behind it. */
    .split(
      'function expired(){return !deadline||Date.now()>=deadline||clock()>=monotonicDeadline||Date.now()>=hardDeadline||clock()>=hardMonotonicDeadline;}'
    )
    .join('function expired(){return false;}')
    /* A copy opened on its own has no classroom to ask either. */
    .split("if(win.parent===win){change('blocked');return;}")
    .join("if(win.parent===win){change('active');return;}")
    /*
     * The lesson runs in a frame without "allow-same-origin", so the browser
     * gives that frame an opaque origin and the answer to it comes back
     * with an origin of "null".  The address the answer came from is still
     * checked — it has to be the page that is holding the frame — so the
     * opaque origin is taken as the one it really is.
     */
    .split('event.origin!==settings.origin')
    .join("(event.origin!==settings.origin&&event.origin!=='null')")
    /*
     * A lesson that never gets an answer used to ask again every
     * millisecond, which kept the browser busy for no reason.  Asking
     * every three quarters of an hour of a minute is enough.
     */
    .split('Math.max(1,Math.min(45000,deadline-Date.now(),monotonicDeadline-clock()))')
    .join('Math.max(45000,Math.min(45000,deadline-Date.now(),monotonicDeadline-clock()))');
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
 * The mirrored stylesheet of the Google Fonts service holds every family
 * the crawler ever fetched, so a course that asks for two families would
 * be handed all of them.  The answer is cut down to the families it
 * named.
 *
 * The CJK families carry a hundred unicode-range pieces each, which would
 * add megabytes to a download.  A copy opened from disk leaves those to
 * the system font instead.
 */
const ARCHIVE_FONT_PIECES = 60;

/*
 * The Chinese families are cut into a hundred small files each, one for
 * a stretch of the character set.  A copy opened from disk does not
 * carry all of them: the system font takes the parts that are missing,
 * and the archive stays a reasonable size.
 */
function trimArchiveFonts(css) {
  const blocks = css.split(/(?=@font-face\s*\{)/).filter((b) => b.includes('@font-face'));
  if (!blocks.length) return css;
  const pieces = new Map();
  for (const block of blocks) {
    const family = /font-family:\s*'([^']+)'/.exec(block)?.[1];
    if (!family) continue;
    pieces.set(family, (pieces.get(family) || 0) + 1);
  }
  const kept = blocks.filter((block) => {
    const family = /font-family:\s*'([^']+)'/.exec(block)?.[1];
    if (!family) return true;
    return (pieces.get(family) || 0) <= ARCHIVE_FONT_PIECES;
  });
  return kept.join('');
}

function googleFontsSheet(query, forArchive = false) {
  return fontSheet(
    path.join(LQ_ROOT, '_shared-ext', 'fonts.googleapis.com', 'css2'),
    /\/_shared\/fonts\.gstatic\.com\/[^)"'\s]+/g,
    query,
    forArchive
  );
}

/*
 * The two hosted courseware pages ask a font service of their own for
 * the Chinese families.  The stylesheet it hands out is kept here, and
 * the answer is cut down to the family that was asked for.
 */
function feishuFontsSheet(query, forArchive = false) {
  return fontSheet(
    path.join(LQ_ROOT, '_shared-ext', 'miaoda.feishu.cn', 'fonts', 'css2'),
    /\/_shared\/sf3-scmcdn-cn\.feishucdn\.com\/[^)"'\s]+/g,
    query,
    forArchive
  );
}

function fontSheet(mergedFile, pieceRe, query, forArchive = false) {
  const merged = mergedFile;
  if (!fs.existsSync(merged)) return null;
  const text = fs.readFileSync(merged, 'utf8');
  const wanted = new Set();
  for (const part of String(query || '').split('&')) {
    const at = part.indexOf('=');
    if (at < 0) continue;
    if (part.slice(0, at) !== 'family') continue;
    const value = part.slice(at + 1).replace(/\+/g, ' ');
    for (const name of decodeURIComponent(value).split(',')) {
      wanted.add(name.split(':')[0].trim());
    }
  }
  const blocks = text.split(/(?=@font-face\s*\{)/).filter((b) => b.includes('@font-face'));
  /* How many font files a family is worth. */
  const weight = new Map();
  for (const block of blocks) {
    const family = /font-family:\s*'([^']+)'/.exec(block)?.[1];
    if (!family) continue;
    const pieces = [...block.matchAll(pieceRe)].length;
    weight.set(family, (weight.get(family) || 0) + pieces);
  }
  const kept = [];
  const files = new Set();
  for (const block of blocks) {
    const family = /font-family:\s*'([^']+)'/.exec(block)?.[1];
    if (!family || !wanted.has(family)) continue;
    if (forArchive && (weight.get(family) || 0) > ARCHIVE_FONT_PIECES) continue;
    const pieces = [...block.matchAll(pieceRe)].map((m) => m[0]);
    kept.push(block);
    for (const piece of pieces) files.add(piece.replace(/^\/_shared\//, ''));
  }
  let css = kept.join('');
  if (forArchive) css = css.replace(/\/_shared\//g, './assets/_ext/');
  return { css, files: [...files] };
}

/*
 * A 图灵智赋 work is a document plus a folder of assets, so the offline copy
 * is handed over as a zip. Every path inside the document is rewritten to a
 * relative one, and the platform check is relaxed for file:// documents.
 */
/*
 * The guard that asks the platform for permission.
 *
 * It has been rewritten more than once, and the spellings it wears
 * differ from one body to the next: some ask the platform outright,
 * some ask only when the page does not run from the disk, some ask
 * without brackets around the condition.  An archive is offline by
 * definition, so every one of those questions is answered from inside
 * the archive — otherwise a course opened with the launcher asks a
 * local server that knows nothing about it and shows "课件启动失败".
 */
function answerVerifyAccessOffline(html) {
  const answer = 'data:application/json,%7B%22ok%22%3Atrue%7D';
  const spellings = [
    [
      /x\.open\(\\"GET\\",location\.origin\+\\"\\?\/api\\?\/program-file\\?\/verify-access(?:\?[^"'\\]*)?\\?"/g,
      `x.open(\\"GET\\",\\"${answer}\\"`,
    ],
    [
      /x\.open\("GET",location\.origin\+"\/?api\/program-file\/verify-access(?:\?[^"']*?)?"/g,
      `x.open("GET","${answer}"`,
    ],
    [
      /\(location\.protocol===\\"file:\\"\|\|location\.protocol===\\"about:\\"\)\?\\"data:application\/json,[^"'\\]*\\":location\.origin\+\\"\\?\/api\\?\/program-file\\?\/verify-access(?:\?[^"'\\]*)?\\?"/g,
      `\\"${answer}\\"`,
    ],
    [
      /\(location\.protocol==="file:"\|\|location\.protocol==="about:"\)\?"data:application\/json,[^"']*?"\:location\.origin\+"\/?api\/program-file\/verify-access(?:\?[^"']*?)?"/g,
      `"${answer}"`,
    ],
    [
      /\(p===\\"file:\\"\)\?\\"data:application\/json,[^"'\\]*\\":location\.origin\+\\"\\?\/api\\?\/program-file\\?\/verify-access(?:\?[^"'\\]*)?\\?"/g,
      `\\"${answer}\\"`,
    ],
    [
      /p===\\"file:\\"\?\\"data:application\/json,[^"'\\]*\\":location\.origin\+\\"\\?\/api\\?\/program-file\\?\/verify-access(?:\?[^"'\\]*)?\\?"/g,
      `\\"${answer}\\"`,
    ],
    [
      /p==="file:"\?"data:application\/json,[^"']*?"\:location\.origin\+"\/?api\/program-file\/verify-access(?:\?[^"']*?)?"/g,
      `"${answer}"`,
    ],
  ];
  let out = html;
  for (const [pattern, to] of spellings) {
    out = out.replace(pattern, to);
  }
  return out;
}

function buildLqZip(id) {
  const bodyFile = path.join(LQ_ROOT, 'courseware', `${id}.html`);
  if (!fs.existsSync(bodyFile)) return null;
  /* The document keeps the platform's own programme number; the local
     folder is named after the merged id. */
  const numeric = id.startsWith('afe-') ? id.slice(4) : id;
  let html = fs.readFileSync(bodyFile, 'utf8');
  html = rewriteCoursewareUrls(html, id);
  /*
   * The formulas draw their letters from a set of fonts that live in the
   * archive next to the document, so the place they are at is written in
   * as a path inside the archive.
   */
  html = patchLqBody(
    html,
    id,
    './assets/_ext/cdn.jsdelivr.net/npm/mathjax@3/es5/output/chtml/fonts/woff-v2'
  );
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
  html = answerVerifyAccessOffline(html);
  html = html.replace(/<base href="\/api\/program-assets\/[^"]*">/g, '<base href="./assets/">');
  html = releaseLocalClassroom(html);
  html = injectArchiveCdnShim(html);
  html = refreshCsp(html);

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
  /*
   * A course whose code is written as modules cannot be opened straight
   * from the disk: a browser refuses to read a module from a file, for
   * the same reason it refuses to let one page read another.  Such a
   * course travels with a small launcher that hands it out over the
   * local address instead, so the archive is usable on its own.
   */
  if (
    /<script[^>]+type\s*=\s*["']module["']/i.test(html) ||
    /type\s*=\s*["']importmap["']/i.test(html)
  ) {
    const launcher = path.join(SERVER_DIR, 'launcher');
    const read = (name) => {
      try {
        return fs.readFileSync(path.join(launcher, name));
      } catch {
        return null;
      }
    };
    const serve = read('serve.mjs');
    const servePy = read('serve.py');
    const cmd = read('start.cmd');
    const sh = read('start.sh');
    const notes = read('README.txt');
    if (serve && servePy && cmd && sh && notes) {
      const course = `${id}.html`;
      add(
        '启动课件.cmd',
        Buffer.from(cmd.toString('utf8').replace(/\{\{COURSE\}\}/g, course), 'utf8')
      );
      add(
        '启动课件.sh',
        Buffer.from(sh.toString('utf8').replace(/\{\{COURSE\}\}/g, course), 'utf8')
      );
      add('serve.mjs', serve);
      add('serve.py', servePy);
      add('使用说明.txt', notes);
    }
  }
  const assets = path.join(LQ_ROOT, 'courseware', `${id}.assets`);
  const assetFiles = listFiles(assets);

  for (const file of listFiles(assets)) {
    const data = fs.readFileSync(file.file);
    /* A script or a data file can name a public CDN too; inside the
       archive the local copy has to be pointed at instead. */
    if (/\.(?:js|mjs|css|json|html?)$/i.test(file.name)) {
      const text = data.toString('utf8');
      let rewritten = rewriteCoursewareUrls(text, id);
      for (const prefix of [
        `/api/program-assets/${numeric}/`,
        `/api/program-assets/${id}/`,
      ]) {
        /*
         * A file that stands inside the archive's own folder asks for
         * the platform's address; the copy next to it is the very same
         * file, so the name is pointed at the folder it already stands
         * in.  A signed address carries a lease with it; the lease has
         * no meaning here and goes with it.
         */
        const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        rewritten = rewritten.replace(
          new RegExp(escaped + 't/[^"\'\\x60/]+/', 'g'),
          './'
        );
        rewritten = rewritten.split(`${prefix}_ext/`).join('./_ext/');
        rewritten = rewritten.split(prefix).join('./');
      }
      /*
       * The guard may sit in a file of its own — a chapter course keeps
       * it in the page it shows in a frame — so the same answer is
       * given there too.
       */
      rewritten = answerVerifyAccessOffline(rewritten);
      add(`assets/${file.name}`, Buffer.from(rewritten, 'utf8'));
      continue;
    }
    add(`assets/${file.name}`, data);
  }

  /*
   * A work written for a site of its own asks for its own files by the
   * root of that site: "../models/pencil/scene.gltf", "/jsm/…".  The
   * library answers those names from the mirror of that root, but an
   * archive has no root above it — the name would climb out of the
   * folder and find nothing.  The file is therefore put inside the
   * archive, and the name in the document is pointed at the copy.
   *
   * The course's own folder comes first: when both hold a file of the
   * same name, the one that travelled with the course is the one that
   * belongs to it.
   */
  {
    const vendorRoot = path.join(LQ_ROOT, '_shared-ext', 'vendor');
    const refs = new Set();
    const collect = (text) => {
      for (const m of text.matchAll(
        /["'(](\.{1,2}\/)?([A-Za-z0-9_.\-\/]{3,120}\.[A-Za-z0-9]{2,5})["')]/g
      )) {
        refs.add(m[2]);
      }
    };
    collect(html);
    for (const file of assetFiles) {
      if (!/\.(?:js|mjs|css|json|html?)$/i.test(file.name)) continue;
      try {
        collect(fs.readFileSync(file.file, 'utf8'));
      } catch {
        /* A file that cannot be read cannot name anything. */
      }
    }
    for (const raw of refs) {
      const rel = raw.replace(/^\/+/, '');
      if (!rel || rel.includes('..') || rel.startsWith('api/')) continue;
      const source = path.join(vendorRoot, rel);
      let stat;
      try {
        stat = fs.statSync(source);
      } catch {
        continue;
      }
      if (!stat.isFile()) continue;
      add(`assets/${rel}`, fs.readFileSync(source));
      /*
       * A model is two files: the scene and the buffer it points at.
       * The buffer sits next to the scene and is named inside it, so it
       * travels to the same place in the archive.
       */
      if (/\.gltf$/i.test(rel)) {
        let scene;
        try {
          scene = JSON.parse(fs.readFileSync(source, 'utf8'));
        } catch {
          scene = null;
        }
        const parts = [
          ...((scene && scene.buffers) || []),
          ...((scene && scene.images) || []),
        ];
        for (const part of parts) {
          const uri = part && part.uri;
          if (!uri || /^[a-z]+:\/\//i.test(uri)) continue;
          const sibling = path.join(path.dirname(rel), uri);
          const from = path.join(vendorRoot, sibling);
          let siblingStat;
          try {
            siblingStat = fs.statSync(from);
          } catch {
            continue;
          }
          if (siblingStat.isFile()) {
            add(`assets/${sibling}`, fs.readFileSync(from));
          }
        }
      }
      /* The document is told where the copy inside the archive sits. */
      for (const quote of ['"', "'"]) {
        html = html.split(`${quote}../${rel}${quote}`).join(`${quote}./assets/${rel}${quote}`);
        html = html.split(`${quote}/${rel}${quote}`).join(`${quote}./assets/${rel}${quote}`);
      }
    }
    if (entries[0]) {
      entries[0] = { name: `${id}.html`, data: Buffer.from(html, 'utf8') };
    }
  }

  /*
   * Some works ask for a picture under one extension while the platform
   * keeps it under another.  The archive has to carry it under the name
   * the document asks for, or the picture is missing once the course is
   * unpacked and opened from disk.
   */
  const byStem = new Map();
  for (const file of assetFiles) {
    const dot = file.name.lastIndexOf('.');
    if (dot < 0) continue;
    if (!/\.(?:png|jpe?g|gif|webp|avif|bmp)$/i.test(file.name)) continue;
    const dir = file.name.slice(0, file.name.lastIndexOf('/') + 1);
    byStem.set(dir + file.name.slice(0, dot).toLowerCase(), file);
  }
  if (byStem.size) {
    const wanted = new Set();
    for (const m of html.matchAll(
      /["'(]([A-Za-z0-9_./@-]{2,90}\.(?:png|jpe?g|gif|webp|avif|bmp))["')]/gi
    )) {
      wanted.add(m[1].replace(/^\.?\//, ''));
    }
    for (const file of assetFiles) {
      if (!/\.(?:js|mjs|css|json|html?)$/i.test(file.name)) continue;
      let text = '';
      try {
        text = fs.readFileSync(file.file, 'utf8');
      } catch {
        continue;
      }
      for (const m of text.matchAll(
        /["'(]([A-Za-z0-9_./@-]{2,90}\.(?:png|jpe?g|gif|webp|avif|bmp))["')]/gi
      )) {
        wanted.add(m[1].replace(/^\.?\//, ''));
      }
    }
    for (const name of wanted) {
      const dot = name.lastIndexOf('.');
      if (dot < 0) continue;
      const dir = name.slice(0, name.lastIndexOf('/') + 1);
      const key = (dir + name.slice(0, dot)).toLowerCase();
      const file = byStem.get(key);
      if (!file) continue;
      add(`assets/${name}`, fs.readFileSync(file.file));
    }
  }
  /*
   * The public libraries are mirrored once and shared. A course that is
   * taken away on its own still needs them, so every shared file the
   * document asks for is copied into the archive.
   */
  const sharedRoot = path.join(LQ_ROOT, '_shared-ext');
  const wanted = new Set();
  /*
   * The addresses in the document were already rewritten to the shape
   * they take inside the archive, so that is what is read here.
   */
  for (const m of html.matchAll(/\.\/assets\/_ext\/([^"'`\s)]+)/g)) {
    wanted.add(decodeURIComponent(m[1]));
  }
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
    for (const m of text.matchAll(/\.\/assets\/_ext\/([^"'`\s)]+)/g)) {
      wanted.add(decodeURIComponent(m[1]));
    }
    for (const m of text.matchAll(/\/_shared\/([^"'`\s)]+)/g)) {
      wanted.add(decodeURIComponent(m[1]));
    }
  }
  const copied = new Set();
  /*
   * MathJax draws its glyphs from a font folder that sits next to the
   * bundle.  The bundle itself names no font file, so the folder has to
   * be recognised here — otherwise a copy opened from disk shows every
   * formula in the fallback font.
   */
  if (/mathjax/i.test(html)) {
    const mathjaxFonts =
      'cdn.jsdelivr.net/npm/mathjax@3/es5/output/chtml/fonts/woff-v2/';
    for (const file of listFiles(path.join(sharedRoot, mathjaxFonts))) {
      wanted.add(mathjaxFonts + file.name);
    }
  }
  const queue = [...wanted];
  while (queue.length) {
    const rel = queue.shift();
    if (copied.has(rel)) continue;
    copied.add(rel);
    /* A stylesheet that was asked for by name comes with a query.  The
       file on disk has no query, and the archive keeps the name the
       document asks for. */
    const plain = rel.split('?')[0];
    if (plain.startsWith('fonts.googleapis.com/css2')) {
      const sheet = googleFontsSheet(rel.split('?')[1] || '', true);
      if (sheet) {
        add(`assets/_ext/${rel}`, Buffer.from(sheet.css, 'utf8'));
        for (const file of sheet.files) queue.push(file);
        continue;
      }
    }
    if (plain.startsWith('miaoda.feishu.cn/fonts/css2')) {
      const sheet = feishuFontsSheet(rel.split('?')[1] || '', true);
      if (sheet) {
        add(`assets/_ext/${rel}`, Buffer.from(sheet.css, 'utf8'));
        for (const file of sheet.files) queue.push(file);
        continue;
      }
    }
    const candidates = [
      path.join(assets, '_ext', plain),
      path.join(sharedRoot, plain),
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
      let text = data.toString('utf8').replace(/\/_shared\//g, './assets/_ext/');
      /* A shared file may name the platform's own copy of a library. */
      text = text.replace(
        /\/api\/program-assets\/[A-Za-z0-9_-]+\/_ext\//g,
        './assets/_ext/'
      );
      /* A shared stylesheet may still name a public library outright. */
      for (const host of LQ_EXT_HOSTS) {
        text = text.split(host).join(`./assets/_ext/${host.replace(/^https?:\/\//, '')}`);
      }
      if (/\.css2?$/i.test(source)) text = trimArchiveFonts(text);
      data = Buffer.from(text, 'utf8');
    }
    add(`assets/_ext/${rel}`, data);
    /* A shared stylesheet points at further shared files. */
    if (/\.(css2?)$/i.test(source)) {
      for (const m of data.toString('utf8').matchAll(/\.\/assets\/_ext\/([^"')\s]+)/g)) {
        queue.push(decodeURIComponent(m[1]));
      }
    }
    /*
     * A shared module asks for the modules that sit beside it: a shader
     * of three.js lives one folder up, a loader lives in the same one.
     * Those are relative names, so they are resolved against the place
     * the file has inside the archive.
     */
    if (/\.(?:m?js)$/i.test(source)) {
      const text = data.toString('utf8');
      const dir = path.posix.dirname(plain);
      for (const m of text.matchAll(
        /(?:from\s*["']|import\s*\(\s*["']|import\s*["'])([^"'\n]{1,240})["']/g
      )) {
        const ref = m[1].trim();
        if (!ref.startsWith('./') && !ref.startsWith('../')) continue;
        const next = path.posix.normalize(path.posix.join(dir, ref));
        if (next.startsWith('..')) continue;
        queue.push(next);
      }
    }
  }
  return buildZip(entries);
}

/*
 * The archive of a lesson is put together once and kept.
 *
 * Building it reads every picture and every script of the lesson, which
 * takes long enough to be noticed.  The files on disk do not move while
 * the library runs, so the finished archive is kept until the folder
 * behind it changes.
 */
const zipCache = new Map();
const ZIP_CACHE_BYTES = 192 * 1024 * 1024;
let zipCacheBytes = 0;

function zipFor(id) {
  const bodyFile = path.join(LQ_ROOT, 'courseware', `${id}.html`);
  const assets = path.join(LQ_ROOT, 'courseware', `${id}.assets`);
  let stamp;
  try {
    stamp = fs.statSync(bodyFile).mtimeMs;
  } catch {
    return null;
  }
  try {
    stamp += fs.statSync(assets).mtimeMs;
  } catch {
    /* A lesson without a folder of its own is fine. */
  }
  const key = `${id}|${stamp}`;
  const hit = zipCache.get(key);
  if (hit) return hit;
  const zip = buildLqZip(id);
  if (!zip) return null;
  zipCache.set(key, zip);
  zipCacheBytes += zip.length;
  while (zipCacheBytes > ZIP_CACHE_BYTES && zipCache.size > 1) {
    const oldest = zipCache.keys().next().value;
    zipCacheBytes -= zipCache.get(oldest).length;
    zipCache.delete(oldest);
  }
  return zip;
}

async function serveLqAssets(res, pathname, search = '') {
  const rest = pathname.slice('/api/program-assets/'.length);
  const slash = rest.indexOf('/');
  if (slash < 0) return sendJson(res, 404, { error: '未找到' });
  const programId = rest.slice(0, slash);
  let tail = rest.slice(slash + 1);
  const localId = lqLocalId(programId);
  /* The mirror host this request belongs to, when it is one. */
  let extHost = '';

  /* /t/<lease>/… is the lease prefix, /_ext/<host>/… the mirrored CDNs. */
  if (tail.startsWith('t/')) {
    const after = tail.slice(2);
    const cut = after.indexOf('/');
    tail = cut < 0 ? '' : after.slice(cut + 1);
  } else if (tail.startsWith('_ext/')) {
    tail = tail.slice('_ext/'.length);
    extHost = tail.split('/')[0];
    /*
     * An early mirror wrote the name of the shared folder and the name
     * of the course folder together, with no slash between them:
     * "vendorPhyc140".  The slash goes back in, so the file is found in
     * the folder it really lives in.
     */
    if (!extHost.includes('.') && extHost.length > 6 && extHost.startsWith('vendor')) {
      const rest = tail.slice(extHost.length + 1);
      tail = 'vendor/' + extHost.slice(6) + (rest ? '/' + rest : '');
      extHost = 'vendor';
    }
  }
  /*
   * A work that comes as a package puts its base at ".../t/local/package/".
   * The files inside it sit in the folder of the program, so the folder
   * names that the platform put in front are taken off again.
   */
  tail = tail.replace(/^(?:local\/)?(?:package\/)?/, '');
  if (!tail) return sendJson(res, 404, { error: '未找到' });
  const root = localId ? path.join(LQ_ROOT, 'courseware', `${localId}.assets`) : null;
  /* A request for the Google Fonts stylesheet is answered with the
     families the document named, not with every family that was ever
     fetched. */
  if (tail.startsWith('fonts.googleapis.com/css2')) {
    const sheet = googleFontsSheet(search.replace(/^\?/, ''), false);
    if (sheet) {
      return send(res, 200, Buffer.from(sheet.css, 'utf8'), {
        'Content-Type': 'text/css; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      });
    }
  }
  if (tail.startsWith('miaoda.feishu.cn/fonts/css2')) {
    const sheet = feishuFontsSheet(search.replace(/^\?/, ''), false);
    if (sheet) {
      return send(res, 200, Buffer.from(sheet.css, 'utf8'), {
        'Content-Type': 'text/css; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
 });
    }
  }
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
        /* The mirrored libraries never change; the browser may keep them. */
        cache: 'public, max-age=31536000, immutable',
      }))
    )
      return;
  }
  /*
   * A page that sits in a sub-folder of its program asks for a file that
   * lives in the folder of the program itself — the chapter files ask for
   * the lock file of the program, for one.  The name is looked for one
   * level up, and then in the folder itself, before the answer is "not
   * found".
   */
  if (root) {
    const parts = tail.split('/');
    const names = [];
    /* The name on its own, without the folders in front of it. */
    names.push(parts[parts.length - 1]);
    /* The name in the folder of the program, keeping its own sub-folder. */
    for (let i = parts.length - 1; i > 0; i--) {
      names.push(parts.slice(i).join('/'));
    }
    for (const name of names) {
      const candidate = safeJoin(root, name);
      if (
        candidate &&
        (await serveFile(res, candidate, {
          contentType: mimeForAsset(candidate),
          headers: { 'Access-Control-Allow-Origin': '*' },
          cache: 'public, max-age=31536000, immutable',
        }))
      )
        return;
    }
  }
  /*
   * A few works ask for an image under one extension and the platform only
   * keeps it under another — 英雄知识 asks for "nezha.png" while the
   * platform stores "nezha.jpg".  The same picture is served under the
   * name that was asked for.
   */
  const dot = tail.lastIndexOf('.');
  if (dot > 0 && /\.(?:png|jpe?g|gif|webp|avif|bmp|svg)$/i.test(tail)) {
    const stem = tail.slice(0, dot);
    for (const ext of ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif']) {
      if (ext === tail.slice(dot).toLowerCase()) continue;
      const alt = stem + ext;
      for (const candidate of [
        root && safeJoin(root, alt),
        safeJoin(shared, alt),
      ]) {
        if (
          candidate &&
          (await serveFile(res, candidate, {
            contentType: mimeForAsset(candidate),
            headers: { 'Access-Control-Allow-Origin': '*' },
            cache: 'public, max-age=31536000, immutable',
          }))
        )
          return;
      }
    }
  }
  /*
   * Some pages open a connection to a mirror host before they ask it for
   * anything — "rel=preconnect" or a plain link to the host itself. The
   * host is a folder here, not a file, so there is nothing to hand out.
   * An empty answer is the right one: the page gets on with its work and
   * no red line appears in the log.
   */
  for (const candidate of [
    root && safeJoin(root, '_ext/' + tail),
    safeJoin(shared, tail)
  ]) {
    if (!candidate) continue;
    try {
      if (fs.statSync(candidate).isDirectory()) {
        return send(res, 204, Buffer.alloc(0), {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=31536000, immutable'
        });
      }
    } catch {
      /* Not there; the answer below stands. */
    }
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
  let rewritten = rewriteCoursewareUrls(body, localId);
  rewritten = rewriteExtRootUrls(rewritten, localId, file);
  /*
   * A page that was mirrored from a site of its own may still try to
   * reach out to the network: an ad exchange, a statistics service, a
   * font on somebody else's server.  None of that belongs in a lesson
   * that is meant to work on this machine alone, and every one of those
   * requests is a page that stalls while it waits.
   *
   * The rule below lets the lesson use everything it has here and
   * nothing else.  The pages that were saved whole bring their own
   * stylesheets and scripts with them, so the lesson still looks the
   * way it was meant to.
   */
  const isMirroredPage = /(?:^|[\\/])_(?:shared-)?ext[\\/]/.test(String(file));
  const headers = {
    'Access-Control-Allow-Origin': '*'
  };
  if (isMirroredPage && /\.html?$/i.test(file)) {
    headers['Content-Security-Policy'] = [
      "default-src 'self' data: blob:",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:",
      "style-src 'self' 'unsafe-inline' data:",
      "img-src 'self' data: blob:",
      "media-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' data: blob:",
      "frame-src 'self' data: blob:",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'"
    ].join('; ');
  }
  if (rewritten === body) {
    return serveFile(res, file, {
      contentType: mimeForAsset(file),
      headers,
    });
  }
  const buf = Buffer.from(rewritten, 'utf8');
  res.writeHead(200, {
    'Content-Type': mimeForAsset(file),
    'Content-Length': buf.length,
    'Cache-Control': 'no-cache',
    ...headers,
  });
  res.end(buf);
  return true;
}

/*
 * A page that was mirrored from a site of its own asks for some of its
 * files by the root of that site: "/css/pub.css", "/circle.html".
 * The files sit in the mirror under the name of the host they came from,
 * so the address is pointed at the local copy of the same place.
 *
 * Only the addresses that begin at the root are moved.  The ones written
 * relative to the page keep working, because the page keeps its place.
 */
/*
 * A namespace is a name, not a place.  The browser is handed these
 * strings when it is told what kind of element to make — the canvas of
 * three.js is made with the XHTML namespace — and they have to stay
 * exactly as they are.  Pointing them at a local folder would leave the
 * element without its own properties, and the lesson would stop drawing.
 */
const XML_NAMESPACES = [
  'www.w3.org/1999/xhtml',
  'www.w3.org/2000/svg',
  'www.w3.org/1998/Math/MathML',
  'www.w3.org/1999/xlink',
  'www.w3.org/XML/1998/namespace',
  'www.w3.org/2000/xmlns/',
];
function rewriteExtRootUrls(html, localId, file) {
  if (!localId) return html;
  /*
   * The host the page came from is in the path: "_ext/<host>/…" for the
   * copy that sits with the lesson, "_shared-ext/<host>/…" for the copy
   * that is shared by every lesson.  Both need the same treatment, so
   * both spellings are recognised here.
   */
  const m = /(?:^|[\\/])_(?:shared-)?ext[\\/]([^\\/]+)[\\/]/i.exec(String(file));
  if (!m) return html;
  const host = m[1];
  const prefix = `/api/program-assets/${localId}/_ext/${host}`;
  /*
   * Where the page sits inside the site it came from.  A mirrored page
   * lies one folder deeper than it did on the site, so a name written
   * with a leading "../" no longer points at the root of that site.
   */
  const pos = String(file).replace(/\\/g, '/').lastIndexOf(`/${host}/`);
  const pageRel = pos >= 0 ? String(file).replace(/\\/g, '/').slice(pos + host.length + 2) : 'index.html';
  /*
   * A page that was mirrored from a site of its own often still names
   * that site by its own address — "https://www.mathsisfun.com/x.html",
   * or the little picture of the site next to the title.  Sometimes the
   * name is put together while the page runs, in a script, so it is not
   * in a tag at all.  Either way the file is here as well, under the
   * name of that site, so the address is pointed at the copy that is on
   * this machine.
   */
  let out = html;
  /*
   * A namespace is a name, not a place.  The browser is handed these
   * strings when it is told what kind of element to make — the canvas
   * of three.js is made with the XHTML namespace — and they have to
   * stay exactly as they are.  Pointing them at a local folder would
   * leave the element without its own properties, and the lesson would
   * stop drawing.
   */
  const held = [];
  for (const ns of XML_NAMESPACES) {
    if (!out.includes(ns)) continue;
    const mark = '__lqns' + held.length + '__';
    held.push([ns, mark]);
    out = out.split(ns).join(mark);
  }
  const hosts = new Set([host, ...mirroredHostNames(localId)]);
  for (const h of hosts) {
    const to = `/api/program-assets/${localId}/_ext/${h}/`;
    const hEsc = h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.split(`https://${h}/`).join(to);
    out = out.split(`http://${h}/`).join(to);
    out = out.replace(new RegExp(`(^|[^:/])//${hEsc}/`, 'g'), `$1${to}`);
    /* The site with no path on it at all. */
    out = out.split(`https://${h}"`).join(`${to}"`).split(`https://${h}'`).join(`${to}'`);
  }
  for (const [ns, mark] of held) out = out.split(mark).join(ns);
  out = out.replace(
    /*
     * "//cdn.example.com/a.js" is a whole other site, not a place on this
     * one.  Rewriting it would point it at a folder that does not exist,
     * so it is left as it is and the content policy deals with it.
     */
    /(\s(?:src|href|poster|data-src|data-bg)\s*=\s*["'])\/([^/"'#?][^"']*)(["'])/gi,
    (all, head, rest, tail) => {
      /* An address that already points at this machine is left alone. */
      if (rest.startsWith('api/') || rest.startsWith('courseware/')) return all;
      return head + prefix + '/' + rest + tail;
    }
  );
  /*
   * A style sheet asks for its pictures the same way a page does, but it
   * writes them inside url() and not inside a tag.  Those addresses are
   * moved to the same place as well.
   */
  out = out.replace(
    /url\(\s*["']?(\/(?!["']?\/\/)[^"')]*?)["']?\s*\)/gi,
    (all, rel) => {
      const clean = rel.split('#')[0].split('?')[0];
      if (
        !clean ||
        clean.startsWith('api/') ||
        clean.startsWith('courseware/') ||
        clean.startsWith('/api/') ||
        clean.startsWith('/courseware/')
      )
        return all;
      return `url(${prefix}${clean})`;
    }
  );
  /*
   * A script that sends a message to somebody else's address — a count
   * of visitors, a small form.  There is nobody to receive it here, so
   * it is pointed at this machine, which quietly lets it go.
   */
  for (const dead of DEAD_EXTERNAL) {
    out = out.split(dead).join('/api/quiet');
  }
  /*
   * A name that is written relative to the page.  It is put back where
   * it was on the site the page came from: the root of that site, not
   * the root of this machine.  A page that writes "../style.css" means
   * the style sheet at the root of its own site.
   */
  const base = extBaseOf(out, pageRel);
  out = out.replace(
    /(\s(?:src|href|poster|data-src|data-bg)\s*=\s*["'])([^"'#?][^"']*)(["'])/gi,
    (all, head, ref, tail2) => {
      if (ref.startsWith('api/') || ref.startsWith('courseware/')) return all;
      if (ref.startsWith('/api/') || ref.startsWith('/courseware/')) return all;
      if (ref.startsWith(prefix)) return all;
      const resolved = resolveHostRel(pageRel, ref, base);
      if (!resolved) return all;
      return head + prefix + '/' + resolved + tail2;
    }
  );
  return out;
}

/*
 * The base a page sets for itself with <base href="…">.  The names in
 * such a page are counted from there.
 */
function extBaseOf(html, pageRel) {
  const m = /<base\b[^>]*\bhref\s*=\s*["']([^"']*)["']/i.exec(html);
  if (!m) return null;
  const href = m[1].trim();
  if (!href || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href)) return null;
  let resolved = href.startsWith('/')
    ? href
    : path.posix.join(path.posix.dirname('/' + pageRel), href);
  resolved = path.posix.normalize(resolved);
  if (!resolved.endsWith('/')) resolved = path.posix.dirname(resolved);
  return resolved;
}

/*
 * Where a name written in a page belongs inside the site the page came
 * from.  A name that climbs above the root of that site is left alone.
 */
function resolveHostRel(pageRel, ref, base) {
  const clean = ref.split('#')[0].split('?')[0];
  if (!clean) return null;
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(clean)) return null;
  const dir = base || path.posix.dirname('/' + pageRel);
  const joined = clean.startsWith('/')
    ? path.posix.normalize(clean)
    : path.posix.normalize(path.posix.join(dir, clean));
  const rel = joined.replace(/^\/+/, '');
  if (!rel || rel.startsWith('..')) return null;
  return rel;
}

/*
 * Every reply written while this request is being handled knows which
 * request it belongs to, so it can pack its body and answer with a
 * "not modified" when the file has not changed.
 */
async function handleXb(req, res, url, profile) {
  return requestContext.run({ req }, () => handleXbInner(req, res, url, profile));
}

async function handleXbInner(req, res, url, profile) {
  const pathname = decodeURIComponent(url.pathname);
  const method = req.method.toUpperCase();

  /*
   * Some of the mirrored lessons report their own crashes to a script
   * host that has nothing to do with this library.  There is nobody to
   * report to here, so the report is accepted and dropped instead of
   * being turned away with a failure the lesson would keep retrying.
   */
  if (pathname === '/scripts/errorReporter.py') {
    await readBody(req);
    return send(res, 204, Buffer.alloc(0), { 'Cache-Control': 'no-store' });
  }

  /*
   * A script that wants to tell somebody else something — how many
   * visitors there were, a little form.  There is nobody to hear it
   * here, so it is accepted and dropped, and the page carries on.
   */
  if (pathname === '/api/quiet') {
    await readBody(req);
    return send(res, 204, Buffer.alloc(0), { 'Cache-Control': 'no-store' });
  }

  /* Courseware assets that live next to the body. */
  if (pathname.startsWith('/api/program-assets/')) {
    return serveLqAssets(res, pathname, url.search);
  }

  /*
   * The portraits a lesson draws for its characters are kept here, in
   * the shared library, under the name of the service they came from.
   */
  if (pathname.startsWith('/api/avatar/dicebear/')) {
    const rel = pathname.slice('/api/avatar/dicebear/'.length);
    const file = safeJoin(path.join(LQ_ROOT, '_shared-ext', 'api.dicebear.com'), rel);
    if (file && fs.existsSync(file)) {
      return serveFile(res, file, {
        contentType: mimeForAsset(file),
        headers: { 'Access-Control-Allow-Origin': '*' },
        cache: 'public, max-age=31536000, immutable',
      });
    }
    return sendJson(res, 404, { error: '未找到' });
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
      /*
       * A good many of the physics works ask for a picture or a model
       * with a plain relative name ("textures/ammeter.png").  On the
       * site those files sat at the root of the server, so the browser
       * looks for them next to the page it is showing — which here is
       * under /courseware/.  They are kept in the shared library, so
       * the same answer is given as for a root-level path.
       */
      if (id.includes('/') || /\.[A-Za-z0-9]{1,5}$/.test(id)) {
        const shared = mirroredRootAsset(id);
        if (shared) {
          return serveFile(res, shared, {
            contentType: mimeForAsset(shared),
            headers: { 'Access-Control-Allow-Origin': '*' },
            cache: 'public, max-age=31536000, immutable',
          });
        }
      }
      /*
       * The preview opens this document inside a frame.  A line of JSON in
       * that frame reads like a broken page, so the answer is a page of
       * our own that says what happened.
       */
      return sendMissingCourseware(res, id);
    }
    // The published courseware hard-binds its classroom handshake to the
    // platform it came from. Rebind it to this local origin so the parent
    // shell can grant access. Everything else stays untouched.
    const origin = publicOrigin(req, profile.port);
    warmCoursewareCache(profile, origin);
    /*
     * The rewritten body depends on the address the reader came from and
     * on nothing else, so it is kept in its finished form.  The second
     * visit to a lesson is then answered without touching the disk.
     */
    const stat = await fsp.stat(file);
    const key = `${file}|${origin}`;
    let entry = cachedPacked(key, stat.mtimeMs);
    let raw = null;
    let tag = entry ? entry.etag : '';
    if (!entry) {
      raw = await readPatchedCourseware(file, id, profile, origin);
      tag = `"${stat.size.toString(16)}-${crypto
        .createHash('sha1')
        .update(raw)
        .digest('hex')
        .slice(0, 16)}"`;
      const gz = await packAsync(raw, raw.length > 2 * 1024 * 1024 ? 1 : 6);
      if (gz && gz.length <= PACKED_CACHE_ENTRY_BYTES) {
        cachePacked(key, stat.mtimeMs, gz, tag);
        entry = cachedPacked(key, stat.mtimeMs);
      }
    }
    /*
     * The mark of the reply is worked out from the text that is actually
     * handed out, not from the file on disk.  The copy on disk is the
     * source; the copy the reader gets is the source with its addresses
     * rewritten, and the two are not the same bytes.
     */
    if (String(req.headers['if-none-match'] || '') === tag) {
      return send(res, 304, Buffer.alloc(0), {
        ETag: tag,
        'Cache-Control': 'no-cache',
      });
    }
    const headers = {
      'Content-Type': 'text/html; charset=utf-8',
      ETag: tag,
      'Cache-Control': 'no-cache',
      Vary: 'Accept-Encoding',
    };
    if (method === 'HEAD') {
      headers['Content-Length'] = entry ? entry.gz.length : raw.length;
      return send(res, 200, Buffer.alloc(0), headers);
    }
    if (entry && entry.gz && wantsGzip(req)) {
      headers['Content-Encoding'] = 'gzip';
      headers['Content-Length'] = entry.gz.length;
      return send(res, 200, entry.gz, headers);
    }
    if (!raw) raw = await readPatchedCourseware(file, id, profile, origin);
    if (wantsGzip(req)) {
      const gz = await packAsync(raw, raw.length > 2 * 1024 * 1024 ? 1 : 6);
      if (gz) {
        headers['Content-Encoding'] = 'gzip';
        headers['Content-Length'] = gz.length;
        return send(res, 200, gz, headers);
      }
    }
    headers['Content-Length'] = raw.length;
    return send(res, 200, raw, headers);
  }

  /*
   * The mirrored simulations ask whether a newer build of themselves is
   * out.  The answer here is "there is none" — the copy on this disk is
   * the one that is being used, and the check stays inside the machine.
   */
  if (pathname === '/offline-check') {
    return sendJson(res, 200, { error: 'local copy' });
  }

  /*
   * The mirrored simulations also send a one-pixel "ping" to say that the
   * lesson was opened.  There is nobody to tell, so the ping is answered
   * here with the smallest image there is; that keeps the browser console
   * free of errors it cannot act on.
   */
  if (pathname.startsWith('/offline-yotta/')) {
    const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    return send(res, 200, gif, {
      'Content-Type': 'image/gif',
      'Content-Length': gif.length,
      'Cache-Control': 'no-store',
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
      cache: 'public, max-age=31536000, immutable',
    }))) return;
    return sendJson(res, 404, { error: '未找到' });
  }

  /*
   * The fonts MathJax draws its formulas with.  They are asked for by
   * every lesson that has a formula in it, so they are kept in one
   * place and handed out from there.
   */
  if (pathname.startsWith(MATHJAX_FONT_URL + '/')) {
    const name = pathname.slice(MATHJAX_FONT_URL.length + 1);
    const file = safeJoin(MATHJAX_FONT_DIR, name);
    if (file && (await serveFile(res, file, {
      contentType: mimeForAsset(file),
      headers: { 'Access-Control-Allow-Origin': '*' },
      cache: 'public, max-age=31536000, immutable',
    }))) return;
    return sendJson(res, 404, { error: '未找到' });
  }

  /*
   * A work written for a site of its own asks for its files by the root
   * of that site: /jsm/OrbitControls.js, /Phyc140/VolumetricFire.js.
   * Those files were mirrored next to the work, so a request of that
   * shape is answered from the mirror instead of being turned away.
   * The mirror is only asked for a name it really holds, so the routes of
   * the library itself are never shadowed.
   */
  if (pathname.startsWith('/') && !pathname.startsWith('//')) {
    const rel = pathname.slice(1);
    const mirrored = mirroredRootAsset(rel);
    if (mirrored && (await serveFile(res, mirrored, {
      contentType: mimeForAsset(mirrored),
      headers: { 'Access-Control-Allow-Origin': '*' },
    }))) return;
    /*
     * A file that a mirrored page asked for by the root of the site it
     * came from.  The page that asked for it says where it came from.
     */
    const fromPage = extRootAssetFor(rel, req.headers.referer);
    if (fromPage && (await serveFile(res, fromPage, {
      contentType: mimeForAsset(fromPage),
      headers: { 'Access-Control-Allow-Origin': '*' },
      cache: 'public, max-age=31536000, immutable',
    }))) return;
  }

  // Static shell assets: the live site serves them over GET/HEAD only and
  // answers anything else with 405.
  if (method !== 'GET' && method !== 'HEAD') {
    return sendJson(res, 405, { error: '不支持此操作' });
  }

  // Static shell assets, served from their original paths.
  const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  /* Every browser asks for this one; the site has no icon of its own. */
  if (rel === 'favicon.ico') {
    return send(res, 204, Buffer.alloc(0), { 'Cache-Control': 'max-age=86400' });
  }
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
 *
 * The origin is compared by host and not by the whole address.  A proxy
 * in front of the library talks https to the browser and http to the
 * server, so the two addresses differ in their scheme while being the
 * same site.  The header the front-end adds is what keeps a page on
 * another site out: a browser sends it only after the server has allowed
 * it in a preflight, and this server allows no preflight.
 */
function xbPostAllowed(req, port) {
  const requested = String(req.headers['x-requested-with'] || '').toLowerCase();
  if (requested !== 'studio') return false;
  const origin = originHost(req.headers.origin || '');
  if (!origin) return false;
  const allowed = new Set([
    originHost(publicOrigin(req, port)),
    originHost(req.headers.host ? `http://${req.headers.host}` : ''),
  ]);
  /* An address that was written down for this installation. */
  if (process.env.LQ_PUBLIC_ORIGIN) {
    allowed.add(originHost(process.env.LQ_PUBLIC_ORIGIN));
  }
  return allowed.has(origin);
}

/*
 * The mark of the build.  It is written into the head of the page when
 * the page is written, and the server reads it back out of that same
 * file — so the two can never drift apart and the page can always tell
 * whether it is looking at the library as it is now.
 */
function readBuildMark(profile) {
  try {
    const html = fs.readFileSync(path.join(profile.assetsDir, 'index.html'), 'utf8');
    const m = /<meta\s+name="lq-build"\s+content="([^"]*)"/.exec(html);
    return m ? m[1] : '';
  } catch {
    return '';
  }
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
  const gone = () =>
    sendJson(res, 410, { error: '此课件请下载后使用；标为免费的课件可在线体验' });

  /*
   * Which build is this?
   *
   * The page carries a mark in its head and the server reads that mark
   * back from the very same file, so the two can never drift apart.  A
   * browser that was left open over a rebuild keeps showing the library
   * it was handed then, which reads as a fault in the library rather than
   * as an old page — so the page asks this question and reloads itself.
   */
  if (pathname === '/api/version') {
    if (method !== 'GET' && method !== 'HEAD') return notFound();
    loadXb(profile);
    const build = readBuildMark(profile);
    /* The mark is a timestamp; a reader wants it as a date. */
    const stamp = /^lq-(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(build || '');
    const body = Buffer.from(
      JSON.stringify({
        build,
        version: stamp ? `${stamp[1]}-${stamp[2]}-${stamp[3]} ${stamp[4]}:${stamp[5]}` : '',
        courses: profile.state.catalog.products.length,
      }),
      'utf8',
    );
    return send(res, 200, body, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': body.length,
      'Cache-Control': 'no-store',
    });
  }

  if (pathname === '/api/catalog') {
    if (method !== 'GET') return notFound();
    /*
     * The catalogue is the one answer every page waits for, so it is given
     * a number of its own: a browser that has it does not ask again — but
     * it is asked to say whether its copy is still the good one, and it is
     * told to come back for the answer whenever the library has changed.
     */
    loadXb(profile);
    const body = profile.state.catalogBody;
    const tag = profile.state.catalogTag;
    if (String(req.headers['if-none-match'] || '') === tag) {
      return send(res, 304, Buffer.alloc(0), {
        ETag: tag,
        'Cache-Control': 'no-cache',
      });
    }
    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      ETag: tag,
      /*
       * The catalogue is the answer to "what is in this library", and it
       * changes whenever the library changes.  A browser that is allowed to
       * keep a copy of it will go on showing the library it saw last time —
       * lessons that have since been removed, chapters that have since
       * been filled in.  So the answer is not kept: it is asked for, and
       * what it says at that moment is what the reader sees.
       *
       * "no-cache" is not "do not keep": the browser may keep a copy, but
       * it has to ask whether that copy is still the good one before
       * using it.  The answer is two hundred kilobytes, and the question
       * is one line, so a reader who comes back pays almost nothing and
       * still never sees a library that has moved on.
       */
      'Cache-Control': 'no-cache',
      Vary: 'Accept-Encoding',
    };
    /* The answer is a good two megabytes of text, so it travels packed. */
    if (!profile.state.catalogGz) {
      profile.state.catalogGz = await packAsync(body, 6);
    }
    if (profile.state.catalogGz && wantsGzip(req)) {
      headers['Content-Encoding'] = 'gzip';
      headers['Content-Length'] = profile.state.catalogGz.length;
      return send(res, 200, profile.state.catalogGz, headers);
    }
    headers['Content-Length'] = body.length;
    return send(res, 200, body, {
      ...headers,
    });
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
      allowSameOrigin:
        profile.kind === 'leqixiang' &&
/^(afe-|openlab-|phet-|tongjiang-|labsims-|aviary-|lab-|blocklygames-)/.test(id),
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
    const packaged = isPackagedCourse(id);
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
    /*
     * A work that is more than one file is handed over as a zip, and so is
     * an open simulation that asks for a copy of three.js: a single file
     * would lose the library and stop drawing.
     */
    if (isPackagedCourse(id)) {
      const zip = zipFor(id);
      if (!zip) return sendJson(res, 404, { error: '本地没有安装这份课件。' });
      return send(res, 200, zip, {
        'Content-Type': 'application/zip',
        'Content-Length': zip.length,
        'Content-Disposition': contentDisposition(`${safeName(title)}.zip`),
        ETag: `"${zip.length.toString(16)}"`,
        'Cache-Control': 'private, max-age=600',
      });
    }
    const file = path.join(profile.coursewareDir, `${id}.html`);
    if (!fs.existsSync(file)) return sendJson(res, 404, { error: '本地没有安装这份课件。' });
    /*
     * The body is made ready for a reader on their own machine, and it is
     * kept in that form: the same lesson is often taken away more than
     * once, and the work of preparing it should happen once.
     */
    const stat = fs.statSync(file);
    const key = `${file}|standalone`;
    let entry = cachedPacked(key, stat.mtimeMs);
    let raw = null;
    if (!entry) {
      const html = releaseLocalClassroom(await fsp.readFile(file, 'utf8'));
      raw = Buffer.from(html, 'utf8');
      const gz = await packAsync(raw, raw.length > 2 * 1024 * 1024 ? 1 : 6);
      if (gz && gz.length <= PACKED_CACHE_ENTRY_BYTES) {
        cachePacked(key, stat.mtimeMs, gz, '');
        entry = cachedPacked(key, stat.mtimeMs);
      }
    }
    const headers = {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': contentDisposition(`${safeName(title)}.html`),
      ETag: `"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`,
      'Cache-Control': 'private, max-age=600',
      Vary: 'Accept-Encoding',
    };
    if (entry && entry.gz && wantsGzip(req)) {
      headers['Content-Encoding'] = 'gzip';
      headers['Content-Length'] = entry.gz.length;
      return send(res, 200, entry.gz, headers);
    }
    if (!raw) {
      raw = Buffer.from(
        releaseLocalClassroom(await fsp.readFile(file, 'utf8')),
        'utf8'
      );
    }
    headers['Content-Length'] = raw.length;
    return send(res, 200, raw, headers);
  }
  /*
   * Everything below this line belonged to the shop: the orders, the
   * refunds, the feedback desk, the bulk-download desk, the teacher
   * desk and the back office.  A local library has no account to bill,
   * no order to keep and no one to answer, so those addresses are gone
   * rather than merely empty.
   */
  return notFound();
}

/* ------------------------------------------------------------------ */

/*
 * The port the library answers on.  PORT is the name most places that
 * put a service online use, so it is read as well.
 */
const XB_PORT = Number(process.env.XB_PORT || process.env.PORT || 4173);
/*
 * The library answers on one address.  The port it is given is the port
 * it says it is on, so that a lesson which reads the address it was
 * opened with is told the truth.
 */
const LQ_PORT = Number(process.env.LQ_PORT || XB_PORT);

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

/*
 * A connection that is kept open.
 *
 * The browser holds a connection to the library and reuses it.  The server
 * used to close an idle connection after five seconds, which is very close
 * to the four seconds the browser waits before it does the same — and a
 * request that arrives exactly as the other side closes the connection is
 * lost.  A reader would see a lesson that would not open and a picture
 * that would not arrive.  The server now waits far longer than the
 * browser does, so the browser is always the one to close.
 */
xbServer.keepAliveTimeout = 72000;
xbServer.headersTimeout = 75000;
xbServer.requestTimeout = 120000;

/*
 * The library warms itself up.
 *
 * A lesson is read, rewritten and packed the first time it is asked for.
 * That work is now done away from the other readers, but the reader who
 * asks first still waits for it.  So once a reader has arrived, the rest
 * of the library is prepared in the background, one lesson at a time, and
 * every later visit is answered straight away.
 *
 * Only the ordinary-sized lessons are prepared this way; the few very
 * large ones are left to be handled when they are asked for.
 */
const warmedOrigins = new Set();

function warmCoursewareCache(profile, origin) {
  if (warmedOrigins.has(origin)) return;
  warmedOrigins.add(origin);
  const dir = profile.coursewareDir;
  let names;
  try {
    names = fs.readdirSync(dir).filter((f) => f.endsWith('.html'));
  } catch {
    return;
  }
  let index = 0;
  const step = async () => {
    if (index >= names.length) return;
    const name = names[index++];
    const file = path.join(dir, name);
    const id = name.replace(/\.html$/, '');
    try {
      const stat = await fsp.stat(file);
      if (stat.size > 2 * 1024 * 1024) return void step();
      const key = `${file}|${origin}`;
      if (cachedPacked(key, stat.mtimeMs)) return void step();
      const raw = await readPatchedCourseware(file, id, profile, origin);
      const gz = await packAsync(raw, 6);
      if (gz && gz.length <= PACKED_CACHE_ENTRY_BYTES) {
        const tag = `"${stat.size.toString(16)}-${crypto
          .createHash('sha1')
          .update(raw)
          .digest('hex')
          .slice(0, 16)}"`;
        cachePacked(key, stat.mtimeMs, gz, tag);
      }
    } catch {
      /* A lesson that cannot be prepared is left for the next request. */
    }
    setTimeout(step, 5);
  };
  setTimeout(step, 1000);
}

/*
 * Where the library listens.
 *
 * On this machine it stays on the loopback address, so nothing else on
 * the network can reach it.  Put it online and the address is given from
 * the outside instead:
 *
 *   LQ_HOST=0.0.0.0 node server/server.mjs
 *
 * The courseware reads the address it was opened with, so the library
 * works the same behind a proxy as it does on the machine.
 */
const XB_HOST = process.env.LQ_HOST || '127.0.0.1';

xbServer.listen(XB_PORT, XB_HOST, () => {
  console.log(`乐启享课件库 -> http://localhost:${XB_PORT}/`);
  if (XB_HOST !== '127.0.0.1') {
    console.log(`对外地址：${XB_HOST}:${XB_PORT}`);
  }
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

