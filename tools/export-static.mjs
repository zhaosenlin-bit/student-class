#!/usr/bin/env node
/*
 * Writes the library out as a folder of plain files.
 *
 * The running library answers a reader with a small server.  A copy
 * that is put on a website has no server behind it, so everything that
 * server does has to be done beforehand and written down:
 *
 *   - the catalogue becomes a file that can be fetched;
 *   - every lesson becomes a folder that holds the lesson and
 *     everything it asks for, so it can be opened on its own;
 *   - the picture of the lesson is the very same file that is handed
 *     out when the lesson is saved to a machine.
 *
 * The folder that comes out of this can be dropped into any website
 * and reached through a path, because nothing in it names an address
 * from the root of a domain.
 *
 *   node tools/export-static.mjs --out dist
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LQ = path.join(ROOT, 'mirror', 'leqixiang');
const LIBRARY = path.join(ROOT, 'mirror', 'library');
const STUDIO = path.join(ROOT, 'mirror', 'studio');
const STATIC = path.join(ROOT, 'tools', 'static');

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const OUT = path.resolve(ROOT, arg('out', 'dist'));
const PORT = Number(arg('lq', 4173));
const BASE = `http://127.0.0.1:${PORT}`;
const CONC = Number(arg('conc', 6));

const read = (p) => fs.readFileSync(p);
const isFile = (p) => {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
};
const mkdir = (d) => fs.mkdirSync(d, { recursive: true });
const write = (p, data) => {
  mkdir(path.dirname(p));
  fs.writeFileSync(p, data);
};
const copy = (from, to) => {
  mkdir(path.dirname(to));
  fs.copyFileSync(from, to);
};

/*
 * A library that is read over the network may blink: a connection
 * drops, a worker is busy, the machine wakes from sleep.  A copy that
 * is being written out should not lose a lesson to a moment of that,
 * so a reading that fails is tried again a few times before it is
 * given up on.
 */
async function fetchWithRetry(url, tries = 4) {
  let last = null;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
      last = new Error(`answer ${res.status}`);
    } catch (err) {
      last = err;
    }
    await new Promise((r) => setTimeout(r, 400 * (i + 1)));
  }
  throw last || new Error('cannot read');
}

/*
 * A name of a file may hold a character that a disk on this machine
 * will not take — the font stylesheets carry a colon in their name.
 * The name is changed, and the lesson is told the new name, so that
 * the copy on a website is the same copy that is shown here.
 */
const ILLEGAL = new Set([60,62,58,34,124,63,42]);
function safeEntryName(name) {
  return name
    .split('/')
    .map((part) => {
      let out = '';
      for (const ch of part) {
        const code = ch.codePointAt(0);
        out += ILLEGAL.has(code) || code < 32 ? '_' : ch;
      }
      return out;
    })
    .join('/');
}

/* ------------------------------------------------------------ zip ---- */

/* The archives the library hands out are written without compression:
   the files in them are pictures and sound, already compressed. */
function readZip(buf) {
  let end = buf.length - 22;
  while (end >= 0 && buf.readUInt32LE(end) !== 0x06054b50) end--;
  if (end < 0) throw new Error('not an archive');
  const count = buf.readUInt16LE(end + 10);
  let at = buf.readUInt32LE(end + 16);
  const entries = [];
  for (let i = 0; i < count; i++) {
    const nameLen = buf.readUInt16LE(at + 28);
    const extraLen = buf.readUInt16LE(at + 30);
    const commentLen = buf.readUInt16LE(at + 32);
    const size = buf.readUInt32LE(at + 24);
    const offset = buf.readUInt32LE(at + 42);
    const name = buf.subarray(at + 46, at + 46 + nameLen).toString('utf8');
    const localNameLen = buf.readUInt16LE(offset + 26);
    const localExtraLen = buf.readUInt16LE(offset + 28);
    const dataAt = offset + 30 + localNameLen + localExtraLen;
    entries.push({ name, data: buf.subarray(dataAt, dataAt + size) });
    at += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

/* ------------------------------------------------------------ csp ---- */

/*
 * A few works carry a rule that names their own scripts by their
 * fingerprint.  The copy that is written out has its addresses
 * changed, so the fingerprints have to be worked out again from the
 * text that is really handed out.
 */
function refreshCsp(html) {
  const meta = /<meta\b[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/i.exec(html);
  if (!meta) return html;
  const tag = meta[0];
  const quoted = /content=(["'])([\s\S]*?)\1/i.exec(tag);
  if (!quoted) return html;
  let policy = quoted[2];
  if (!/script-src[^;]*'sha256-/i.test(policy)) return html;

  const hashes = new Set();
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc\s*=/i.test(m[1])) continue;
    hashes.add(
      "'sha256-" +
        crypto.createHash('sha256').update(m[2], 'utf8').digest('base64') +
        "'"
    );
  }
  if (!hashes.size) return html;

  policy = policy.replace(/(script-src[^;]*)/i, (_all, directive) => {
    const seen = new Set(directive.match(/'sha256-[A-Za-z0-9+/=]+'/g) || []);
    for (const h of hashes) seen.add(h);
    const rest = directive.replace(/'sha256-[A-Za-z0-9+/=]+'/g, '').trimEnd();
    return rest + ' ' + [...seen].join(' ');
  });
  policy = policy.replace(
    /\b(img-src|font-src|media-src|connect-src)\s+([^;]*)/gi,
    (all, name, rest) => {
      const value = rest.trim();
      if (/^'none'$/i.test(value)) return name + " 'self' data:";
      /*
       * The lesson asks the machine it runs on whether it may open
       * it; the answer is given in the page itself, so the page must
       * be allowed to read it.
       */
      if (/^connect-src$/i.test(name) && !/(^|\s)data:(\s|$)/.test(value)) {
        return `${name} 'self' data: ${value}`;
      }
      if (/(^|\s)'self'(\s|$)/.test(value)) return all;
      return name + " 'self' data: " + value;
    }
  );
  /*
   * A copy of a lesson is put in a folder of its own, and the page of
   * the lesson names the folder it keeps its files in.  A rule that
   * forbids the page to name that folder would leave the lesson
   * without its files, so the rule is let to name it.
   */
  policy = policy.replace(/base-uri\s+'none'/gi, "base-uri 'self'");

  const newTag = tag.replace(/(content=)(["'])([\s\S]*?)\2/i, (_all, head, q) => head + q + policy + q);
  return html.slice(0, meta.index) + newTag + html.slice(meta.index + tag.length);
}

/*
 * Some works show a mark while they load — the mark of the project
 * they were written for.  The mark of this project is shown there
 * instead, so that a reader only ever sees one name.
 */
function replaceSplashMark(html) {
  const file = path.join(LQ, 'brand', 'lq-splash.svg');
  if (!isFile(file)) return html;
  const uri = 'data:image/svg+xml;base64,' + read(file).toString('base64');
  return html.replace(
    /window\.PHET_SPLASH_DATA_URI\s*=\s*"data:image\/svg\+xml;base64,[A-Za-z0-9+/=]*"/g,
    `window.PHET_SPLASH_DATA_URI="${uri}"`
  );
}

/*
 * A lesson carries a small helper that reports what went wrong when
 * it could not run.  The name in that helper is the name of this
 * project, so that a reader who sees a report sees one name.
 */
function replaceOldBrand(html) {
  return html
    .replace(/[一-龥]{2,4}课件错误报告/g, '乐启享课件错误报告')
    .split('__XBErrorReport').join('__LQErrorReport')
    .split('__XBStartup').join('__LQStartup')
    .split('data-xb-error-report').join('data-lq-error-report')
    .replace(/\bXB-([A-Z]\d{3})\b/g, 'LQ-$1');
}

/*
 * A lesson sometimes carries a word to the machines of the site it
 * came from: a picture that counts the visitors, and a hint that
 * speaks of a machine that is not there.  Those words have no place
 * in a copy that is put on another site, and they say nothing to a
 * reader, so they are taken away.
 */
function dropForeignHints(html) {
  const part = (text) => text
    .replace(/<noscript>\s*<img[^>]*\/t\.gif[^>]*>\s*<\/noscript>/gi, '')
    .replace(/<img\b[^>]*\bsrc\s*=\s*["']\/t\.gif[^"']*["'][^>]*>/gi, '')
    .replace(
      /<link\b[^>]*\bhref\s*=\s*["'](?:\/\/[^"']*\.example\.com|\/\/api\.analytics\.com)[^"']*["'][^>]*>/gi,
 ''
    )
    .replace(
      /<meta\b[^>]*\bname\s*=\s*["']analytics-config["'][^>]*>/gi,
      ''
    )
    .replace(/<meta\b[^>]*\bdata-measurement-id\s*=\s*["'][^"']*["'][^>]*>/gi, '')
    .replace(/\s(?:src|data-src)\s*=\s*["']\/t\.gif[^"']*["']/gi, '');
  /* A piece of markup that is held as a piece of text is not a piece
     of the page. */
  const CODE = /(<(?:script|style)\b[^>]*>)([\s\S]*?)(<\/(?:script|style)>)/gi;
  let out = '';
  let last = 0;
  let m;
  while ((m = CODE.exec(html))) {
    out += part(html.slice(last, m.index));
    out += m[0];
    last = m.index + m[0].length;
  }
  out += part(html.slice(last));
  return out;
}

/* ---------------------------------------------------------- mounts ---- */

/*
 * Every lesson counts its addresses from one place: the folder of the
 * files that stand next to it.  The lesson calls that place its base,
 * and the folder is called "assets" in the copy that is written out.
 *
 * A folder of files put on a website has no root above it, so the
 * addresses are counted from the lesson's own folder instead.  What
 * used to be asked of the root of a site is copied next to the lesson
 * and told where the copy is; what the lesson already counted from its
 * base keeps its name; and the lesson is given the base it needs.
 */
const BASE_DIR = 'assets';

/*
 * A work may hide the names of its files behind escapes, so that the
 * names cannot be read off the page.  The names are still names, and
 * they are counted from the same place as any other name — but a
 * reader that looks for them does not find them, and the file they
 * stand for is never taken along.
 *
 * The escapes are taken away from the names that hold an address, so
 * that the addresses can be found, and the names are pointed at the
 * copy that lies next to the lesson.
 *
 * Only those names are touched.  Everything else is left exactly as
 * it was written: a work that counts its escapes in a rule of its
 * own — a rule of its own that a reader of the page cannot see — has
 * to go on counting them the same way.
 */
const ESCAPE = /\\u([0-9a-fA-F]{4})/g;
const HAS_ESCAPE = /\\u[0-9a-fA-F]{4}/;
function unescapeOnce(text) {
  return text.replace(ESCAPE, (all, hex) => {
    const code = parseInt(hex, 16);
    if (code === 0x5c) return '\\\\';
    if (code < 0x20) return all;
    return String.fromCharCode(code);
  });
}

/* A name that stands for a place is a name that holds an address. */
function looksLikeAddress(text) {
  if (!text) return false;
  if (text.startsWith('/')) return true;
  if (text.startsWith('./') || text.startsWith('../')) return true;
  if (text.endsWith('/')) return true;
  return text.includes('/') && /\.[A-Za-z0-9]{1,8}$/.test(text);
}

const QUOTED = /(["'])((?:\\.|[^"'\n\r\\]){1,600})\1/g;
function decodeAddresses(text) {
  return text.replace(QUOTED, (all, quote, body) => {
    if (!HAS_ESCAPE.test(body)) return all;
    const decoded = unescapeOnce(body);
    if (decoded === body) return all;
    if (!looksLikeAddress(decoded)) return all;
    /* A quotation mark in the name would end the name. */
    if (decoded.includes(quote)) return all;
    return quote + decoded + quote;
  });
}

/*
 * A work sometimes writes a name backwards and turns it round again
 * when it runs.  The name is a name all the same, so it is written
 * out straight here, and the file it stands for is found the way it
 * is found in every other name.
 */
const TURNED =
  /(["'])([^"'\n\r]{1,400})\1\s*\.\s*split\s*\(\s*(?:""|'')\s*\)\s*\.\s*reverse\s*\(\s*\)\s*\.\s*join\s*\(\s*(?:""|'')\s*\)/g;
function decodeReversed(text) {
  return text.replace(TURNED, (all, quote, body) => {
    const turned = [...body].reverse().join('');
    if (!turned.includes('/')) return all;
    if (/[\\"'\n\r<>]/.test(turned)) return all;
    return `${quote}${turned}${quote}`;
  });
}

/*
 * A work may also write an address as a row of numbers and let the
 * browser turn the row back into letters.  The address is an address
 * all the same, so it is written out straight here, and the file it
 * stands for is found the way it is found in every other address.
 */
const ESCAPED = /(["'])((?:\\u[0-9a-fA-F]{4}){4,300})\1/g;
function decodeEscaped(text) {
  return text.replace(ESCAPED, (all, quote, body) => {
    const turned = body.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );
    if (!/^https?:\/\//.test(turned)) return all;
    if (/[\\"'\n\r<>]/.test(turned)) return all;
    return `${quote}${turned}${quote}`;
  });
}

/*
 * Only the places where an escape really is an escape are opened.
 * A style sheet has escapes of its own, a file of pictures is not
 * text at all, and a file of data has escapes that must stay as
 * they are.
 */
function decodeText(name, data) {
  const ext = path.extname(name).toLowerCase();
  if (ext !== '.js' && ext !== '.mjs' && ext !== '.html' && ext !== '.htm') {
    return data;
  }
  const text = data.toString('utf8');
  /* A file that is not written in this encoding is left as it is. */
  if (text.includes('\uFFFD')) return data;
  if (ext === '.html' || ext === '.htm') {
    const out = text.replace(
      /(<script\b[^>]*>)([\s\S]*?)(<\/script>)/gi,
      (all, open, body, close) =>
        open + decodeEscaped(decodeReversed(decodeAddresses(body))) + close
    );
    return Buffer.from(out, 'utf8');
  }
  return Buffer.from(decodeEscaped(decodeReversed(decodeAddresses(text))), 'utf8');
}
const MOUNTS = [
  { from: '/brand/', to: '_brand/', dir: path.join(LQ, 'brand') },
  { from: '/images/', to: '_images/', dir: path.join(LIBRARY, 'assets', 'images') },
  { from: '/prod/uploads/', to: '_prod/', dir: path.join(STUDIO, 'public', 'prod', 'uploads') },
  {
    from: '/premium-catalogue/covers/',
    to: '_premium/',
    dir: path.join(STUDIO, 'assets', 'premium-catalogue', 'covers'),
  },
  { from: '/_shared/', to: '_shared/', dir: path.join(LQ, '_shared-ext') },
  {
    from: '/api/avatar/dicebear/',
    to: '_dicebear/',
    dir: path.join(LQ, '_shared-ext', 'api.dicebear.com'),
  },
  { from: '/video/', to: '_video/', dir: path.join(LQ, '_shared-root', 'video') },
];
const ROOT_FILES = [
  { from: '/three.js', to: '_root/three.js', file: path.join(LQ, '_shared-root', 'three.js') },
  { from: '/tween.js', to: '_root/tween.js', file: path.join(LQ, '_shared-root', 'tween.js') },
  { from: '/oc.js', to: '_root/oc.js', file: path.join(LQ, '_shared-root', 'oc.js') },
];

/* Where a name that sits at the root of a site is really kept. */
function rootSource(name) {
  for (const m of MOUNTS) {
    if (!name.startsWith(m.from)) continue;
    return {
      from: m.from,
      file: path.join(m.dir, name.slice(m.from.length)),
      to: m.to + name.slice(m.from.length),
    };
  }
  for (const r of ROOT_FILES) {
    if (name !== r.from) continue;
    return { from: r.from, file: r.file, to: r.to };
  }
  return null;
}

/*
 * The shared library, looked at once.  A work asks for a file by a
 * name that begins at the root of a site — "jsm/OrbitControls.js",
 * "textures/ammeter.png" — and those names are kept in the shared
 * library: first in the folder of the library itself, then in the
 * folder of the family it belongs to, then in the library as a whole.
 */
const THREE_RELEASES = ['unpkg.com/three@0.136.0', 'cdn.skypack.dev/three@0.136.0'];
let SHARED = null;
const DIR_CACHE = new Map();
const LIST_CACHE = new Map();
function sharedIndex() {
  if (SHARED) return SHARED;
  const base = path.join(LQ, '_shared-ext');
  const top = new Map();
  const vendor = new Map();
  const family = new Map();
  const families = [];
  for (const file of walk(base)) {
    const rel = file.name.replace(/\\/g, '/');
    if (!top.has(rel)) top.set(rel, file.file);
    if (!rel.startsWith('vendor/')) continue;
    const rest = rel.slice('vendor/'.length);
    if (!vendor.has(rest)) vendor.set(rest, file.file);
    const slash = rest.indexOf('/');
    if (slash < 0) continue;
    const tail = rest.slice(slash + 1);
    if (!family.has(tail)) family.set(tail, file.file);
    if (!families.includes(rest.slice(0, slash))) families.push(rest.slice(0, slash));
  }
  SHARED = { top, vendor, family, families };
  return SHARED;
}

/* The file a name that begins at the root of a site stands for. */
function sharedRootFile(rel) {
  if (!rel || rel.includes('..')) return null;
  const shared = sharedIndex();
  const direct = shared.vendor.get(rel) || shared.top.get(rel);
  if (direct) return direct;
  if (rel.startsWith('fonts.gstatic.com/')) {
    const tail = rel.slice('fonts.gstatic.com/'.length);
    const file = shared.top.get(`fonts.gstatic.com/${tail}`);
    if (file) return file;
  }
  const inFamily = shared.family.get(rel);
  if (inFamily) return inFamily;
  if (rel.startsWith('jsm/')) {
    for (const release of THREE_RELEASES) {
      const file = shared.top.get(`${release}/examples/${rel}`);
      if (file) return file;
    }
  }
  return null;
}

/*
 * A folder of the shared library, looked for by the name a lesson
 * counts its names from.  The name may name a folder of the library
 * itself ("threejs.org/examples/jsm"), a folder of the family a work
 * belongs to ("Phyc140/texture"), or a folder of the library of
 * another site ("_ext/threejs.org/...").
 */
function sharedRootDirs(rel) {
  if (!rel || rel.includes('..')) return [];
  /* The same folder is asked for by many lessons, so the answer is
     kept. */
  if (DIR_CACHE.has(rel)) return DIR_CACHE.get(rel);
  const base = path.join(LQ, '_shared-ext');
  const tries = [];
  if (rel.startsWith('_ext/')) {
    const tail = rel.slice('_ext/'.length);
    if (tail) tries.push(path.join(base, tail));
  }
  tries.push(path.join(base, 'vendor', rel));
  const shared = sharedIndex();
  for (const family of shared.families) {
    tries.push(path.join(base, 'vendor', family, rel));
  }
  const found = [];
  for (const dir of tries) {
    try {
      if (fs.statSync(dir).isDirectory()) found.push(dir);
    } catch {
      /* Not a folder of the library. */
    }
  }
  DIR_CACHE.set(rel, found);
  return found;
}

/* ------------------------------------------------------------ names ---- */

/*
 * A name of a file is only a name when it stands inside a quoted
 * string or in a style.  Rewriting it anywhere else would change the
 * words of the lesson, so the places a name can stand are looked at
 * one by one — and each name is looked at once, so that a name that
 * has already been changed is not changed a second time.
 */
/* The parts of a name that belong to a folder. */
function posixDir(name) {
  const at = name.lastIndexOf('/');
  return at < 0 ? '' : name.slice(0, at);
}
function posixJoin(dir, name) {
  return dir ? `${dir}/${name}` : name;
}
function posixNormal(name) {
  const parts = [];
  for (const part of name.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') {
      if (parts.length && parts[parts.length - 1] !== '..') parts.pop();
      else parts.push('..');
      continue;
    }
    parts.push(part);
  }
  return parts.join('/');
}
/* The name of a file counted from the folder it stands in. */
function relativeTo(dir, target) {
  const from = dir.split('/').filter(Boolean);
  const to = target.split('/').filter(Boolean);
  let at = 0;
  while (at < from.length && at < to.length && from[at] === to[at]) at++;
  const up = from.slice(at).map(() => '..');
  return [...up, ...to.slice(at)].join('/');
}

/* Names that stand for something outside a lesson are left alone. */
function isOuterName(ref) {
  return /^(?:https?:)?\/\//i.test(ref) ||
    /^(?:data:|blob:|about:|mailto:|tel:|javascript:|#)/i.test(ref);
}

/*
 * A few names stand for the site the library was written for: the
 * licence page, the mark of the brand, the pictures of the site.  In a
 * copy that is put inside another site those names would point at the
 * root of that site instead of at the copy that lies next to it, so
 * they are named again, counted from the place the name stands in.
 */
const SITE_ROOT_NAMES = [
  'license.html',
  'catalog.json',
  'index.html',
  'brand/',
  'brand-flare/',
  'images/',
];
/*
 * The name of the root of a site on its own — a single slash — is
 * also the name of a folder, of a piece of a path and of a sign in a
 * text.  A work that joins names writes it out on its own, and a
 * change of it would break the work itself.  So it is only taken for
 * the root of a site when it stands where an address stands.
 */
const URL_CONTEXT =
  /(?:href|src|data-src|data-href|action|poster|xlink:href|background)\s*=\s*["']?$|\burl\(\s*$|\bfetch\(\s*$|\bimport\(\s*$|\brequire\(\s*$|\b(?:src|href|url|path|action|poster)\s*:\s*$/i;
function siteRootName(ref, urlish = true) {
  if (!ref.startsWith('/')) return null;
  if (ref === '/') return urlish ? 'index.html' : null;
  const tail = ref.slice(1);
  for (const name of SITE_ROOT_NAMES) {
    if (name.endsWith('/')) {
      if (tail.startsWith(name)) return tail;
      continue;
    }
    if (tail === name) return tail;
  }
  return null;
}

/* A picture that counts the visitors of the site it came from. */
const TRACKING = /^\/(?:t\.gif|track|pixel|beacon)(?:[/?]|$)/i;

/* A name that names a file: it ends in a name and an extension. */
const FILE_NAME = /\.[A-Za-z0-9]{1,8}$/;

/*
 * The kinds of file a work really needs while it runs.  A name of a
 * page or of a document is a link that may be followed; the files
 * that are used are the ones that are taken along.
 */
const ASSET_NAME =
  /\.(?:js|mjs|css|json|xml|png|jpe?g|gif|svg|webp|avif|bmp|ico|mp3|mp4|webm|ogg|wav|m4a|aac|flac|ttf|otf|woff2?|eot|glb|gltf|bin|obj|fbx|dae|hdr|wasm|data|ktx2|basis)$/i;

/*
 * The address of a namespace says what kind of document a name
 * stands for; it does not name a file, and the browser has to be
 * given the whole of it.  Such an address is left as it is.
 */
const NAMESPACE =
  /^(?:https?):\/\/(?:www\.)?(?:w3\.org|purl\.org|xmlns\.org|openoffice\.org|schemas\.openxmlformats\.org|schemas\.microsoft\.com|sheetjs\.openxmlformats\.org|docs\.oasis-open\.org)\//i;

/*
 * A name that still stands at the root of a site names something that
 * is not in this copy.  A picture or a script that is not there is
 * taken away, so that no broken picture is shown and no broken script
 * is run; a link that is not there leads to the list of lessons
 * instead, which is where a reader can go on.
 */
function cleanPart(html, catalogue) {
  return html
    .replace(/<img\b[^>]*\bsrc\s*=\s*["']\/[^"']*["'][^>]*>/gi, '')
    .replace(/<script\b[^>]*\bsrc\s*=\s*["']\/[^"']*["'][^>]*>/gi, '')
    .replace(/<link\b[^>]*\bhref\s*=\s*["']\/[^"']*["'][^>]*>/gi, '')
    .replace(/<iframe\b[^>]*\bsrc\s*=\s*["']\/[^"']*["'][^>]*>/gi, '')
    .replace(/<audio\b[^>]*\bsrc\s*=\s*["']\/[^"']*["'][^>]*>/gi, '')
    .replace(/<video\b[^>]*\bsrc\s*=\s*["']\/[^"']*["'][^>]*>/gi, '')
    .replace(
      /(<a\b[^>]*\bhref\s*=\s*["'])\/[^"']*["']/gi,
      (all, before) => `${before}${catalogue}"`
    );
}

/*
 * A page carries its own code in the middle of it, and that code
 * sometimes holds a piece of markup as a piece of text.  Such a piece
 * is not a link of the page and must not be treated as one — a link
 * that is cut out of a piece of text takes the text apart with it.
 * So the work is done on the page outside its code, and the code is
 * left exactly as it was written.
 */
function cleanRootRefs(html, catalogue) {
  const CODE = /(<(?:script|style)\b[^>]*>)([\s\S]*?)(<\/(?:script|style)>)/gi;
  let out = '';
  let last = 0;
  let m;
  while ((m = CODE.exec(html))) {
    out += cleanPart(html.slice(last, m.index), catalogue);
    out += m[0];
    last = m.index + m[0].length;
  }
  out += cleanPart(html.slice(last), catalogue);
  return out;
}

/*
 * A lesson counts its names from two places, and they are not the same
 * place.  A name in a script that is loaded as a module is counted
 * from the file that holds it; every other name is counted from the
 * base the lesson sets for itself.
 */
function rewriteNames(text, map) {
  const NAME =
    /(["'])((?:[^"'\\\n\r]|\\[^\n\r"']){1,600})\1|([uU][rR][lL]\(\s*(["']?))((?:[^"')\\\n\r]|\\[^\n\r"']){1,600})([^)]*)\)/g;
  let out = '';
  let last = 0;
  let m;
  while ((m = NAME.exec(text))) {
    const inUrl = m[5] !== undefined;
    const inner = inUrl ? m[5] : m[2];
    const before = text.slice(Math.max(0, m.index - 24), m.index);
    const kind = /\b(?:from|import|export)\s*\(?\s*$/.test(before) ? 'module' : 'url';
    const urlish = inUrl || URL_CONTEXT.test(before);
    const next = map(inner, kind, urlish);
    if (next === inner) continue;
    out += text.slice(last, m.index);
    out += inUrl ? `${m[3]}${next}${m[6]})` : `${m[1]}${next}${m[1]}`;
    last = m.index + m[0].length;
  }
  return out + text.slice(last);
}

/* The names a text uses, and where each of them is counted from. */
function lessonRefs(text) {
  const NAME =
    /(["'])((?:[^"'\\\n\r]|\\[^\n\r"']){1,600})\1|([uU][rR][lL]\(\s*(["']?))((?:[^"')\\\n\r]|\\[^\n\r"']){1,600})([^)]*)\)/g;
  const out = [];
  let m;
  while ((m = NAME.exec(text))) {
    const inner = m[5] !== undefined ? m[5] : m[2];
    const before = text.slice(Math.max(0, m.index - 24), m.index);
    const kind = /\b(?:from|import|export)\s*\(?\s*$/.test(before) ? 'module' : 'url';
    out.push({ ref: inner, kind });
  }
  return out;
}

/*
 * A file whose name had to be changed is looked for in the lesson by
 * the name it used to have, and is called by the name it has now.
 * The name may stand in a quoted string or in a style, and it may
 * have been written with the characters of a web address spelled out.
 */
function applyRenames(html, renames) {
  if (!renames.length) return html;
  const swap = (text) => {
    for (const [from, to] of renames) {
      if (from === to) continue;
      text = text.split(from).join(to);
      const variants = [
        encodeURI(from),
        encodeURIComponent(from).replace(/%2F/g, '/'),
        from.replace(/:/g, '%3A'),
        from.replace(/:/g, '%3a'),
      ];
      for (const coded of variants) {
        if (coded === from) continue;
        text = text.split(coded).join(to);
      }
    }
    return text;
  };
  let out = html;
  const NAME =
    /(["'])([^"'\n\r]{1,600})\1|([uU][rR][lL]\(\s*(["']?))([^"')]{1,600})([^)]*)\)/g;
  out = out.replace(NAME, (all, q1, inner1, open, q2, inner2, close) => {
    if (inner1 !== undefined) {
      const next = swap(inner1);
      return next === inner1 ? all : q1 + next + q1;
    }
    const next = swap(inner2);
    return next === inner2 ? all : open + next + close + ')';
  });
  return out;
}


/* --------------------------------------------------------- a lesson ---- */

/*
 * A lesson is put away in a folder of its own.  Everything it asks for
 * has to be inside that folder, and every name it uses has to point
 * at what is inside it.
 *
 * The names in a lesson are counted from two places: the base the
 * lesson sets for itself, and the folder of the file that holds them.
 * Which base a lesson uses is worked out by looking at what it asks
 * for and what it carries — a lesson that counts its names from the
 * folder of files needs that folder to be its base, and one that
 * counts them from its own folder needs nothing.
 */
function buildLesson(id, entries, known) {
  const files = new Map();
  let html = null;
  for (const entry of entries) {
    if (entry.name === `${id}.html`) {
      html = decodeText(entry.name, entry.data).toString('utf8');
      continue;
    }
    /*
     * A file whose name carries a question — a sheet of fonts that is
     * asked for by name — is kept under the name of the file itself,
     * because a question is not a letter a disk will take.  The
     * longer copy is the one that is kept: it holds more of the sheet.
     */
    const qAt = entry.name.indexOf('?');
    if (qAt > 0) {
      const clean = entry.name.slice(0, qAt);
      const prev = files.get(clean);
      if (!prev || prev.length < entry.data.length) {
        files.set(clean, decodeText(clean, entry.data));
      }
      continue;
    }
    files.set(entry.name, decodeText(entry.name, entry.data));
  }
  if (html === null) throw new Error(`the archive of ${id} holds no lesson`);

  /* Where a name that the lesson does not carry is really kept. */
  const courseDir = path.join(LQ, 'courseware', `${id}.assets`);
  const shared = path.join(LQ, '_shared-ext');
  const liveFile = (rel) => {
    if (!rel || rel.includes('..')) return null;
    const own = path.join(courseDir, rel);
    try {
      if (fs.statSync(own).isFile()) return own;
    } catch {
      /* The lesson does not carry it. */
    }
    if (rel.startsWith('_ext/')) {
      const file = sharedRootFile(rel.slice('_ext/'.length));
      if (file) return file;
    }
    return sharedRootFile(rel);
  };
  /* Whether a folder of the lesson's own is there. */
  const liveDir = (rel) => {
    if (!rel || rel.includes('..')) return null;
    const own = path.join(courseDir, rel);
    try {
      if (fs.statSync(own).isDirectory()) return own;
    } catch {
      /* The lesson does not carry that folder. */
    }
    return null;
  };

  /*
   * A work often names a file by the address it has on the public
   * network, even though a copy of that file lies in the library
   * next to the work.  The copy is taken along and put next to the
   * work, under the name of the site it came from, and the work is
   * pointed at it.  A work that opens then needs no network at all.
   */
  const takeOuter = (host, tail) => {
    if (!host || !tail || tail.includes('..')) return null;
    if (NAMESPACE.test('https://' + host + '/' + tail)) return null;
    /*
     * A name may stand for a folder of files rather than for one
     * file: the work builds the name of the file it wants out of the
     * folder it names.  The whole folder is taken along.
     */
    const isDir = tail.endsWith('/');
    const clean = isDir ? tail.slice(0, -1) : tail;
    if (!clean) return null;
    /* Only a file that is used while the work runs is taken along. */
    if (!isDir && !ASSET_NAME.test(clean)) return null;
    const at = BASE_DIR + '/_ext/' + host + '/' + clean + (isDir ? '/' : '');
    if (files.has(at)) return at;
    if (isDir) {
      const dirs = [
        path.join(courseDir, '_ext', host, clean),
        path.join(courseDir, clean),
        path.join(shared, host, clean),
        path.join(shared, '_ext', host, clean),
        path.join(shared, 'vendor', clean),
      ];
      for (const dir of dirs) {
        let list = [];
        try {
          list = fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile());
        } catch {
          continue;
        }
        if (!list.length) continue;
        for (const entry of list) {
          const target = BASE_DIR + '/_ext/' + host + '/' + clean + '/' + entry.name;
          files.set(target, decodeText(target, fs.readFileSync(path.join(dir, entry.name))));
        }
        return at;
      }
      return null;
    }
    const tries = [
      path.join(courseDir, '_ext', host, tail),
      path.join(courseDir, tail),
      path.join(shared, host, tail),
      path.join(shared, '_ext', host, tail),
    ];
    for (const file of tries) {
      if (!isFile(file)) continue;
      placeModel(at, file);
      return at;
    }
    const fromLibrary = sharedRootFile(tail) || sharedRootFile('_ext/' + host + '/' + tail);
    if (!fromLibrary) return null;
    placeModel(at, fromLibrary);
    return at;
  };

  /*
   * A model that is packed into one file keeps its parts beside it:
   * the numbers, the shapes and the pictures.  The model names them
   * inside itself, so they are read from there and taken along from
   * the folder the model was taken from.
   */
  const placeModel = (at, file) => {
    files.set(at, decodeText(at, fs.readFileSync(file)));
    takeModelParts(at, file);
    if (!/\.(?:gltf|glb)$/i.test(at)) return;
    let model = null;
    try {
      model = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      return;
    }
    const dir = path.dirname(file);
    for (const list of [model.buffers, model.images]) {
      if (!Array.isArray(list)) continue;
      for (const item of list) {
        const uri = item && typeof item.uri === 'string' ? item.uri : '';
        if (!uri || uri.startsWith('data:') || uri.includes('..')) continue;
        const part = path.join(dir, ...uri.split('/'));
        if (!isFile(part)) continue;
        const target = posixDir(at) + '/' + uri;
        if (files.has(target)) continue;
        files.set(target, decodeText(target, fs.readFileSync(part)));
      }
    }
  };

  /* The name a lesson uses, counted from the folder of files. */
  const relOf = (target) =>
    target.startsWith(BASE_DIR + '/') ? target.slice(BASE_DIR.length + 1) : target;

  /*
   * A model that is packed into one file keeps its parts beside it:
   * the numbers, the shapes and the pictures.  The model names them
   * inside itself, so they are read from there and taken along, or
   * the model is shown empty.
   */
  const takeModelParts = (at, live) => {
    const dir = posixDir(at);
    const names = [];
    if (/\.(?:gltf|glb)$/i.test(at)) {
      let model = null;
      try {
        model = JSON.parse(fs.readFileSync(live, 'utf8'));
      } catch {
        return;
      }
      for (const list of [model.buffers, model.images]) {
        if (!Array.isArray(list)) continue;
        for (const item of list) {
          const uri = item && typeof item.uri === 'string' ? item.uri : '';
          if (uri && !uri.startsWith('data:')) names.push(uri);
        }
      }
    } else if (/\.dae$/i.test(at)) {
      let xml = '';
      try {
        xml = fs.readFileSync(live, 'utf8');
      } catch {
        return;
      }
      for (const m of xml.matchAll(/<init_from>([^<]+)<\/init_from>/gi)) {
        const name = m[1].trim();
        if (name) names.push(name);
      }
    } else if (/\.obj$/i.test(at)) {
      let text = '';
      try {
        text = fs.readFileSync(live, 'utf8');
      } catch {
        return;
      }
      for (const m of text.matchAll(/^mtllib\s+(.+)$/gim)) {
        const name = m[1].trim();
        if (name) names.push(name);
      }
    } else {
      return;
    }
    for (const name of names) {
      const part = posixNormal(posixJoin(dir, name));
      if (files.has(part)) continue;
      const file = liveFile(relOf(part));
      if (!file) continue;
      files.set(part, decodeText(part, fs.readFileSync(file)));
      /* A material names the pictures it uses in the same way. */
      takeModelParts(part, file);
    }
  };

  /* Is there such a file in the folder of the lesson? */
  const exists = (target) => {
    if (!target) return false;
    if (files.has(target)) return true;
    /* A name may carry the folder of files twice over. */
    const alt = target.startsWith(BASE_DIR + '/')
      ? target.slice(BASE_DIR.length + 1)
      : BASE_DIR + '/' + target;
    return files.has(alt);
  };

  /* The file a name stands for, taken from the library if it is not
     carried by the lesson itself. */
  const take = (target) => {
    if (!target) return null;
    if (files.has(target)) return target;
    const alt = target.startsWith(BASE_DIR + '/')
      ? target.slice(BASE_DIR.length + 1)
      : BASE_DIR + '/' + target;
    if (files.has(alt)) return alt;
    /*
     * The file is not carried by the lesson: it is taken from the
     * library.  Every file of a lesson lies in the folder of files,
     * so that the folder may be named as the base of the lesson.
     */
    const rels = [];
    const add = (rel) => {
      if (rel && !rels.includes(rel)) rels.push(rel);
    };
    if (target.startsWith(BASE_DIR + '/')) add(target.slice(BASE_DIR.length + 1));
    else add(target);
    if (alt.startsWith(BASE_DIR + '/')) add(alt.slice(BASE_DIR.length + 1));
    else add(alt);
    for (const rel of rels) {
      const live = liveFile(rel);
      if (!live) continue;
      const at = BASE_DIR + '/' + rel;
      files.set(at, decodeText(at, fs.readFileSync(live)));
      takeModelParts(at, live);
      return at;
    }
    return null;
  };

  /* The file a name stands for, put exactly where the name points. */
  const takeAt = (target) => {
    if (!target) return false;
    if (files.has(target)) return true;
    const live = liveFile(relOf(target));
    if (!live) return false;
    files.set(target, decodeText(target, fs.readFileSync(live)));
    takeModelParts(target, live);
    return true;
  };

  /*
   * A work sometimes keeps the names of its files in a folder and
   * builds a name out of that folder and the name of a file.  The
   * folder is taken along with the work, so that the name the work
   * builds finds its file where the work looks for it.
   */
  const takeFolder = (name) => {
    const clean = name.replace(/^\/+/, '').replace(/^\.\//, '');
    if (!clean || clean.includes('..')) return null;
    const target = posixJoin(BASE_DIR, clean);
    if (files.has(target)) return target;
    const dirs = [];
    const own = liveDir(clean);
    if (own) dirs.push(own);
    for (const dir of sharedRootDirs(clean)) dirs.push(dir);
    for (const dir of dirs) {
      let list = [];
      try {
        list = fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile());
      } catch {
        continue;
      }
      for (const entry of list) {
        const at = posixJoin(target, entry.name);
        if (files.has(at)) continue;
        files.set(at, fs.readFileSync(path.join(dir, entry.name)));
      }
      if (list.length) return target;
    }
    return null;
  };

  /* Where a name points, counted from the base or from the file. */
  const targetOf = (ref, baseDir) => {
    /* A name that stands at the root of the platform names a file
       that lies inside the program the lesson belongs to. */
    const prog = /^\/api\/program-assets\/[A-Za-z0-9_-]+\/(.+)$/.exec(ref);
    if (prog) return posixJoin(BASE_DIR, prog[1]);
    if (ref.startsWith('/')) return posixJoin(BASE_DIR, ref.slice(1));
    return posixNormal(posixJoin(baseDir, ref));
  };

  /*
   * A page of a site that was mirrored names its neighbours by the
   * root of that site: "/Face.html".  The neighbours were mirrored
   * next to it, in the folder that carries the name of the site, so
   * the name is counted from there.
   */
  const extRoots = () => {
    const out = [];
    for (const name of files.keys()) {
      const m = /_ext\/([^/]+)\//.exec(name);
      if (!m) continue;
      const root = `_ext/${m[1]}`;
      if (!out.includes(root)) out.push(root);
    }
    return out;
  };

  /* Which base answers the most of the names the lesson uses? */
  const scoreBase = (baseDir) => {
    let miss = 0;
    for (const { ref, kind } of lessonRefs(html)) {
      if (!ref || isOuterName(ref)) continue;
      if (/^\/?courseware\/[A-Za-z0-9_-]+(\.html)?$/.test(ref)) continue;
      if (rootSource(ref)) continue;
      if (ROOT_FILES.some((r) => r.from === ref)) continue;
      const target = targetOf(ref, baseDir);
      if (!target) continue;
      if (!exists(target)) miss++;
    }
    return miss;
  };
  /*
   * Which base a lesson counts its names from is written down by the
   * lesson itself: the folder that stands next to it and holds its
   * files.  That word is believed first — a lesson that holds no
   * files of its own has no such folder, and its names are counted
   * from its own place.
   *
   * Only when the lesson says nothing about it are the names counted
   * both ways, to see which of the two places holds more of them.
   */
  const baseTag = /<base\s+href=["']([^"']*)["']/i.exec(html);
  let baseDir = null;
  if (baseTag) {
    const href = baseTag[1].trim().replace(/^\.\//, '').replace(/^\/+/, '').replace(/\/+$/, '');
    if (!href || href === '.') baseDir = '';
    else if (href === BASE_DIR) baseDir = BASE_DIR;
  }
  if (baseDir === null) {
    baseDir = scoreBase(BASE_DIR) <= scoreBase('') ? BASE_DIR : '';
  } else if (baseDir === BASE_DIR) {
    /* A lesson that keeps no files of its own has no folder of them. */
    let any = false;
    for (const name of files.keys()) {
      if (!name.startsWith(BASE_DIR + '/')) continue;
      any = true;
      break;
    }
    if (!any) baseDir = '';
  }

  /*
   * The address of the site, counted from the base the lesson sets
   * for itself: the base of a lesson that keeps its files in a
   * folder of its own is one step deeper.
   */
  const toSite = (rel) => (baseDir ? `../../../${rel}` : `../../${rel}`);

  /* The names of the lesson, written so that they point at the copy
     that stands next to it. */
  const mapLesson = (ref, kind, urlish = true) => {
    if (!ref) return ref;
    /*
     * A name that names a file on the public network.  A copy of that
     * file may lie in the library next to the lesson; when it does,
     * the lesson is pointed at that copy, so that it opens without
     * asking the network for anything.
     */
    if (/^https?:\/\//i.test(ref)) {
      const outer = /^https?:\/\/([A-Za-z0-9._-]+)(\/[^?#]*)?([?#].*)?$/.exec(ref);
      if (!outer) return ref;
      const got = takeOuter(outer[1], (outer[2] || '').replace(/^\/+/, ''));
      if (!got) return ref;
      let rel = relativeTo(baseDir, got);
      if (got.endsWith('/') && !rel.endsWith('/')) rel += '/';
      if (kind === 'module' && !rel.startsWith('.')) rel = './' + rel;
      return outer[3] ? rel + outer[3] : rel;
    }
    if (isOuterName(ref)) return ref;
    /*
     * A name may carry a question and an answer after it — a version
     * number, a sheet of fonts that is asked for by name.  The file on
     * disk has no question in its name, and a folder that is put on a
     * website is asked for the file itself, so the question is taken
     * off the name.  Only a name that stands for a place is asked in
     * that way: a rule of a work of its own may hold a question mark
     * and must be left as it is.
     */
    if (/^(?:\/|\.{1,2}\/)|:\/\//.test(ref)) {
      const qAt = ref.indexOf('?');
      if (qAt > 0) {
        const clean = ref.slice(0, qAt);
        const mapped = mapLesson(clean, kind, urlish);
        if (mapped !== clean) return mapped;
        /*
         * The name is shortened only when the file is really there.
         * A piece of a rule of its own may hold a question mark, and
         * cutting it off would take a piece of the work with it.
         */
        if (FILE_NAME.test(clean) && take(targetOf(clean, baseDir))) {
          return clean;
        }
        return ref;
      }
    }
    /* A lesson that points at another lesson of the same library. */
    const other = /^\/?courseware\/([A-Za-z0-9_-]+)(?:\.html)?$/.exec(ref);
    if (other) {
      /*
       * A lesson of the library that is not in this copy is not a
       * lesson the reader can open, so the name is pointed at the
       * list of lessons instead of at a page that is not there.
       */
      if (known.has(other[1])) return `${toSite(`courseware/${other[1]}/index.html`)}`;
      return toSite('index.html');
    }
    /*
     * A name that stands for a folder: the work builds the names of
     * its files out of that folder.  The folder is taken along, and
     * the name is counted from the base of the lesson, so that the
     * files the work builds a name for are found next to it.
     */
    if (ref.endsWith('/')) {
      const got = takeFolder(ref);
      if (got) {
        /*
         * A name that is written as "./something" keeps that
         * beginning.  A map of modules is picky about it: a name
         * without it is read as a name that may not be used, and
         * the lesson is left with no picture at all.
         */
        const rel = relativeTo(baseDir, got);
        return `${rel.startsWith('.') ? rel : `./${rel}`}/`;
      }
    }
    /*
     * A name that begins at the folder of files is counted from the
     * base the lesson sets for itself, which is that same folder.
     * So the name is looked for under the folder of files, and the
     * name that is written out is counted from the base again.
     */
    /*
     * A name that climbs above the lesson belongs to the site the
     * lesson was written for.  Those files are kept in the shared
     * library, and a copy of them is put inside the lesson's own
     * folder, so that the lesson finds the file where it looks.
     */
    if (ref.startsWith('../')) {
      const rest = ref.replace(/^(?:\.\.\/)+/, '');
      const target = posixJoin(baseDir, rest);
      const got = take(target);
      if (!got) return ref;
      const rel = relativeTo(baseDir, got);
      return ref.startsWith('./') ? `./${rel}` : rel;
    }
    /* A name that begins at the folder the lessons are kept in. */
    if (ref.startsWith('/courseware/')) {
      const rest = ref.slice('/courseware/'.length);
      const target = posixJoin(baseDir, rest);
      const got = take(target);
      if (!got) return ref;
      return relativeTo(baseDir, got);
    }
    /* A name that begins at the root of a site. */
    const mount = rootSource(ref);
    if (mount) {
      const target = posixJoin(BASE_DIR, mount.to);
      if (isFile(mount.file)) {
        files.set(target, fs.readFileSync(mount.file));
      } else if (!take(target)) {
        return ref;
      }
      const rel = relativeTo(baseDir, target);
      return rel.startsWith('.') ? rel : `./${rel}`;
    }
    for (const r of ROOT_FILES) {
      /* A lesson may name the file by the root of a site, or by the
         name alone — both stand for the same file. */
      const bare = r.from.replace(/^\//, '');
      if (ref !== r.from && ref !== bare && ref !== './' + bare) continue;
      const target = posixJoin(BASE_DIR, r.to);
      if (isFile(r.file)) files.set(target, fs.readFileSync(r.file));
      const rel = relativeTo(baseDir, target);
      return rel.startsWith('.') ? rel : `./${rel}`;
    }
    const target = targetOf(ref, baseDir);
    if (!target) return ref;
    let got = take(target);
    /*
     * A page of a mirrored site names its neighbours by the root of
     * that site; the neighbours were mirrored next to it.
     */
    if (!got && ref.startsWith('/')) {
      for (const root of extRoots()) {
        const near = take(posixJoin(BASE_DIR, posixJoin(root, ref.slice(1))));
        if (!near) continue;
        got = near;
        break;
      }
    }
    /*
     * A name that stands at the root of the site the library was
     * written for names a file of that site, and the copy of it lies
     * at the root of this site.
     */
    if (!got) {
      const site = siteRootName(ref, urlish);
      if (site) return toSite(site);
    }
    if (!got) return ref;
    const rel = relativeTo(baseDir, got);
    if (kind === 'module') return rel.startsWith('.') ? rel : `./${rel}`;
    return ref.startsWith('./') ? `./${rel}` : rel;
  };

  html = rewriteNames(html, mapLesson);

  /*
   * A name in a page may stand in an attribute: the address of a
   * frame, of a picture, of a style sheet.  Those are looked at on
   * their own, so that a stray quotation mark somewhere else in the
   * page cannot hide them.
   */
  html = html.replace(
    /(\s(?:src|href|data-src|data-href)\s*=\s*)(["'])([^"'\n\r]{1,600})\2/gi,
    (all, before, quote, value) => {
      const next = mapLesson(value, 'url');
      return next === value ? all : `${before}${quote}${next}${quote}`;
    }
  );

  html = cleanRootRefs(html, toSite('index.html'));

  html = setBase(html, baseDir);

  /*
   * The lesson carries a small helper that turns the address of a
   * public library into the copy that lies next to it.  Those copies
   * are counted from the base of the lesson, so the address in the
   * helper is counted from there as well — otherwise the folder of
   * files would be named twice.
   */
  if (baseDir) {
    html = html
      .split(`"./${BASE_DIR}/_ext/`).join(`"./_ext/`)
      .split(`'./${BASE_DIR}/_ext/`).join(`'./_ext/`);
  }

  /* The files a lesson asks for that it does not carry are taken from
     the library, so that the lesson finds them where it looks. */
  const TEXT = /\.(?:html?|js|mjs|css|json)$/i;
  const queue = [...files.keys()];
  while (queue.length) {
    const at = queue.shift();
    if (!TEXT.test(at)) continue;
    let text = files.get(at).toString('utf8');
    let rewritten = false;
    for (const { ref, kind } of lessonRefs(text)) {
      if (!ref) continue;
      /*
       * A name that names a file on the public network is pointed at
       * the copy of that file that lies next to the lesson.
       */
      if (/^https?:\/\//i.test(ref)) {
        const outer = /^https?:\/\/([A-Za-z0-9._-]+)(\/[^?#]*)?([?#].*)?$/.exec(ref);
        if (!outer) continue;
        const got = takeOuter(outer[1], (outer[2] || '').replace(/^\/+/, ''));
        if (!got) continue;
        let rel = relativeTo(posixDir(at), got);
        if (got.endsWith('/') && !rel.endsWith('/')) rel += '/';
        if (kind === 'module' && !rel.startsWith('.')) rel = './' + rel;
        const to = outer[3] ? rel + outer[3] : rel;
        if (to === ref) continue;
        text = text.split(ref).join(to);
        rewritten = true;
        continue;
      }
      if (isOuterName(ref) || ref.startsWith('/')) continue;
      const target = posixNormal(posixJoin(posixDir(at), ref));
      if (!target || files.has(target)) continue;
      if (!takeAt(target)) continue;
      queue.push(target);
    }
    if (rewritten) files.set(at, Buffer.from(text, 'utf8'));
  }

  /*
   * A name that begins at the root of a site is counted from the file
   * that holds it, so that it stays inside the lesson's own folder.
   * A name that stands at the root of the platform names a file of
   * the program the lesson belongs to, and that file lies in the
   * lesson's own folder of files.  A name that stands at the root of
   * the site the library was written for names a file of that site,
   * which lies at the root of this site — two steps above the folder
   * of the lesson, and one more for every folder the file stands in.
   *
   * This is done again after the files of the shared library have
   * been taken in, because a page that was taken in late names its
   * neighbours the same way, and those neighbours are only found once
   * the page is here.
   */
  const rewriteInnerNames = () => {
    /*
     * A page that is taken in while the names are being rewritten names
     * its own neighbours the same way, and those are only found once
     * the page is here.  So the work is done again while it still
     * brings something new in.
     */
    let before = -1;
    let rounds = 0;
    while (files.size !== before && rounds < 5) {
      before = files.size;
      rounds++;
      rewriteInnerNamesOnce();
    }
  };
  const rewriteInnerNamesOnce = () => {
    for (const [at, data] of [...files]) {
      if (!TEXT.test(at)) continue;
      const text = dropForeignHints(data.toString('utf8'));
      const folder = posixDir(at);
      const toRoot = '../'.repeat(2 + (folder ? folder.split('/').length : 0));
      const next = rewriteNames(text, (ref, kind, urlish) => {
        if (!ref || isOuterName(ref)) return ref;
        /*
         * A name that climbs above the folder of files is counted from
         * the file that holds it.  The work, on the other hand, counts
         * it from the base of the lesson — so the name is written out
         * again, counted from the base, and the file is found where the
         * work looks for it.
         */
        if (ref.startsWith('../')) {
          /* A question and an answer after it are not part of the
             name of the file on disk. */
          const qAt = ref.indexOf('?');
          const clean = qAt > 0 ? ref.slice(0, qAt) : ref;
          const here = posixNormal(posixJoin(folder, clean));
          /*
           * A page that sets no base of its own counts its names
           * from the place it stands in.  A name that climbs above
           * that place is therefore found there, and the name stays
           * as it is — but the file it stands for is taken along.
           */
          if (!/<base\s+href=/i.test(text)) {
            if (here) take(here);
            return ref;
          }
          /*
           * A file that is asked for by a module or by a style sheet
           * is counted from the file that asks for it, so the name
           * stays as it is — but the file itself is taken along.
           */
          if (kind === 'module' || /\.css$/i.test(at)) {
            if (here) take(here);
            return ref;
          }
          if (!here || !files.has(here)) return ref;
          const fromBase = posixNormal(posixJoin(baseDir, clean));
          if (fromBase && files.has(fromBase)) return ref;
          const rel = relativeTo(baseDir, here);
          return rel.startsWith('.') ? rel : `./${rel}`;
        }
        if (!ref.startsWith('/')) return ref;
        /* A question and an answer after it are not part of the name
           of the file on disk. */
        const qAt = ref.indexOf('?');
        const clean = qAt > 0 ? ref.slice(0, qAt) : ref;
        /*
         * A name that stands for a folder: the work builds the names
         * of its files out of that folder.  The folder is taken along,
         * and the name is counted from the base of the lesson.
         */
        if (clean.endsWith('/')) {
          const got = takeFolder(clean);
          if (got) return `${relativeTo(baseDir, got)}/`;
        }
        const prog = /^\/api\/program-assets\/[A-Za-z0-9_-]+\/(.+)$/.exec(clean);
        const target = prog
          ? posixJoin(BASE_DIR, prog[1])
          : posixJoin(BASE_DIR, clean.slice(1));
        let got = take(target);
        /* A page of a mirrored site names its neighbours by the root of
           that site, and the neighbours were mirrored next to it. */
        if (!got) {
          const own = /_ext\/([^/]+)\//.exec(folder);
          const roots = own ? [`_ext/${own[1]}`] : extRoots();
          for (const root of roots) {
            const near = take(posixJoin(BASE_DIR, posixJoin(root, clean.slice(1))));
            if (!near) continue;
            got = near;
            break;
          }
        }
        /* A name that stands at the root of the site the library was
           written for names a file of that site, and the copy of it
           lies at the root of this site. */
        if (!got) {
          const site = siteRootName(clean, urlish);
          if (site) return toRoot + site;
        }
        /*
         * The name is shortened only when the file is really there: a
         * piece of a rule of its own may hold a question mark, and
         * cutting it off would take a piece of the work with it.
         */
        if (!got) return ref;
        const rel = relativeTo(folder, got);
        return rel.startsWith('.') ? rel : `./${rel}`;
      });
      /*
       * A link of the page is a link; a piece of markup that is held
       * as a piece of text inside a script is not.  So the links are
       * looked after only in a page.
       */
      const cleaned = /\.html?$/i.test(at)
        ? cleanRootRefs(next, `${toRoot}index.html`)
        : next;
      if (cleaned !== text) files.set(at, Buffer.from(cleaned, 'utf8'));
    }
  };
  rewriteInnerNames();

  /*
   * A work sometimes builds the name of a file while it runs: a folder
   * it keeps in one place and a picture it names in another.  The
   * library puts those names together, and the file that comes of it
   * is taken along, so that the work finds it where it looks.  A
   * folder the work keeps its names in is taken along the same way,
   * so that a name it builds at run time still finds its file.
   */
  const MEDIA =
    /\.(?:png|jpe?g|gif|svg|webp|mp3|wav|ogg|mp4|webm|gltf|glb|dae|obj|fbx|json|bin|ttf|otf|woff2?)$/i;
  const folders = new Set();
  const pieces = new Set();
  const links = new Set();
  /* The lesson itself is read as well as the files that go with it. */
  const texts = [html];
  for (const [at, data] of files) {
    if (!TEXT.test(at)) continue;
    texts.push(data.toString('utf8'));
  }
  for (const text of texts) {
    for (const m of text.matchAll(/["']([^"'\n\r]{1,120})["']/g)) {
      const piece = m[1];
      if (!piece || piece.includes('://') || piece.startsWith('data:')) continue;
      if (piece.endsWith('/') && piece.length < 120) {
        folders.add(piece);
      } else if (MEDIA.test(piece) && !piece.startsWith('/') && piece.length < 80) {
        pieces.add(piece);
      }
    }
    /* The address of a file on a site of its own. */
    for (const m of text.matchAll(/https?:\/\/([A-Za-z0-9.-]+)\/([A-Za-z0-9._/-]{2,120})/g)) {
      links.add(`${m[1]}/${m[2]}`);
    }
  }

  /* Every folder a name stands in is a folder the work may build a
     name in, so those are looked at as well. */
  for (const folder of [...folders]) {
    const parts = folder.split('/');
    for (let i = 1; i < parts.length; i++) {
      folders.add(parts.slice(0, i).join('/') + '/');
    }
  }

  /*
   * A folder of the shared library is copied next to the lesson when
   * the lesson keeps its names in such a folder.  Only small folders
   * are taken along, so that one lesson does not carry a whole
   * library with it.
   */
  const LIMIT = 3 * 1024 * 1024;
  let room = 16 * 1024 * 1024;
  /*
   * A work builds the name of a file while it runs: a folder it keeps
   * in one place and a file it names in another.  The folder is named
   * in the text of the work, so the name of the folder can be pointed
   * at the copy that lies next to the lesson.
   */
  const folderRewrites = [];
  for (const folder of [...folders]) {
    const name = folder.replace(/^\.\//, '').replace(/^\/+/, '');
    if (!name || name.includes('..')) continue;
    /* The folder the work keeps its names in, as it stands in the
       library. */
    const packName = folder.replace(/^(?:\.\.\/)+/, '').replace(/^\.\//, '').replace(/^\/+/, '');
    if (packName && !packName.includes('..')) {
      if (liveDir(packName)) {
        const target = posixJoin(BASE_DIR, packName);
        const rel = relativeTo(baseDir, target);
        folderRewrites.push([folder, rel.startsWith('.') ? rel : `./${rel}`]);
      }
    }
    for (const dir of sharedRootDirs(name)) {
      let list = LIST_CACHE.get(dir);
      if (!list) {
        list = [];
        try {
          list = fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile());
        } catch {
          list = [];
        }
        LIST_CACHE.set(dir, list);
      }
      if (list.length > 60) continue;
      for (const entry of list) {
        let stat = null;
        try {
          stat = fs.statSync(path.join(dir, entry.name));
        } catch {
          continue;
        }
        if (stat.size > LIMIT) continue;
        if (room - stat.size < 0) continue;
        room -= stat.size;
        const target = posixJoin(BASE_DIR, posixNormal(name + entry.name));
        if (files.has(target)) continue;
        files.set(target, decodeText(target, fs.readFileSync(path.join(dir, entry.name))));
      }
    }
  }

  if (pieces.size && pieces.size * (folders.size + 1) < 4000) {
    for (const piece of pieces) {
      const candidates = [piece];
      for (const folder of folders) {
        if (folder.endsWith(piece)) continue;
        candidates.push(folder + piece);
      }
      for (const candidate of candidates) {
        const file = liveFile(candidate);
        if (!file) continue;
        const target = posixJoin(BASE_DIR, posixNormal(candidate));
        if (files.has(target)) continue;
        files.set(target, decodeText(target, fs.readFileSync(file)));
      }
    }
  }

  /* A file on a site of its own is copied from the mirror of that
     site, so that the helper in the lesson finds it. */
  for (const link of links) {
    const file = sharedRootFile(link);
    if (!file) continue;
    const target = posixJoin(BASE_DIR, '_ext/' + link);
    if (files.has(target)) continue;
    files.set(target, decodeText(target, fs.readFileSync(file)));
  }

  /* A name that a disk will not take is changed, and the lesson is
     told the new name. */
  rewriteInnerNames();

  /*
   * A lesson sometimes keeps a whole page inside a string of its own,
   * and the address of the platform stays in that string.  The address
   * is of no use here — there is no platform — so it is pointed at
   * the copy that lies next to the lesson: the folder of files.
   */
  const platform = new RegExp(
    `/api/program-assets/${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/(?:t/[^"'\\\\\\s/]+/)?([^"'\\\\\\s]*)`,
    'g'
  );
  const pointAtFiles = (text, dir) =>
    text.replace(platform, (_all, rest) => {
      const target = BASE_DIR + (rest ? '/' + rest : '');
      const rel = relativeTo(dir, target);
      if (!rel) return './';
      return rel.startsWith('.') ? rel : `./${rel}`;
    });
  html = pointAtFiles(html, baseDir);
  for (const [at, data] of [...files]) {
    if (!TEXT.test(at)) continue;
    files.set(at, Buffer.from(pointAtFiles(data.toString('utf8'), posixDir(at)), 'utf8'));
  }

  /*
   * A lesson may ask for a picture of an avatar by a name it builds
   * while it runs, so the name is nowhere in the text of the lesson.
   * The library keeps those pictures in a folder of its own; the
   * folder is copied next to the lesson, and the name the lesson
   * builds is pointed at the copy.
   */
  const avatar = MOUNTS.find((m) => m.from === '/api/avatar/dicebear/');
  if (avatar) {
    const needle = '/api/avatar/dicebear/';
    let wanted = html.includes(needle);
    if (!wanted) {
      for (const [at, data] of files) {
        if (!TEXT.test(at)) continue;
        if (data.toString('utf8').includes(needle)) {
          wanted = true;
          break;
        }
      }
    }
    if (wanted) {
      for (const file of walk(avatar.dir)) {
        const target = posixJoin(baseDir, '_dicebear/' + file.name);
        if (files.has(target)) continue;
        files.set(target, fs.readFileSync(file.file));
      }
      const swap = (text) => text.split(needle).join('./_dicebear/');
      html = swap(html);
      for (const [at, data] of [...files]) {
        if (!TEXT.test(at)) continue;
        files.set(at, Buffer.from(swap(data.toString('utf8')), 'utf8'));
      }
    }
  }

  const renames = [];
  for (const name of files.keys()) {
    const safe = safeEntryName(name);
    if (safe === name) continue;
    renames.push([name, safe]);
  }
  if (renames.length) {
    /* A name may be written in the lesson as it is counted from the
       folder of files, and as it is counted from the lesson itself. */
    const both = [];
    for (const [from, to] of renames) {
      both.push([from, to]);
      const short = from.startsWith(BASE_DIR + '/');
      if (!short) continue;
      const fromShort = from.slice(BASE_DIR.length + 1);
      const toShort = to.slice(BASE_DIR.length + 1);
      if (fromShort !== from) both.push([fromShort, toShort]);
    }
    renames.length = 0;
    renames.push(...both);
    for (const [from, to] of renames) {
      const data = files.get(from);
      if (!data) continue;
      files.delete(from);
      files.set(to, data);
    }
    html = applyRenames(html, renames);
    for (const [at, data] of [...files]) {
      if (!TEXT.test(at)) continue;
      files.set(at, Buffer.from(applyRenames(data.toString('utf8'), renames), 'utf8'));
    }
  }

  return { html, files };
}

/* The base a lesson counts its names from. */
function setBase(html, baseDir) {
  const href = baseDir ? `./${baseDir}/` : './';
  if (/<base\s+href=/i.test(html)) {
    return html.replace(/<base\s+href=["'][^"']*["']\s*\/?>/i, `<base href="${href}">`);
  }
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (all) => `${all}<base href="${href}">`);
  }
  return `<base href="${href}">` + html;
}

/* ------------------------------------------------------------ main ---- */

async function main() {
  console.log('写出静态课件库 ->', OUT);
  /*
   * The shell of the site may be written again on its own, without
   * writing every lesson again — that is what this does.
   */
  if (args.includes('--shell')) {
    mkdir(OUT);
    copyShell();
    console.log('外壳已重新写出。');
    return;
  }
  fs.rmSync(OUT, { recursive: true, force: true });
  mkdir(OUT);

  /* The catalogue is the one answer every page waits for. */
  const catalogRes = await fetchWithRetry(`${BASE}/api/catalog`);
  if (!catalogRes.ok) throw new Error('the library is not answering; start it first');
  const catalog = JSON.parse(await catalogRes.text());
  /*
   * The pictures the catalogue shows are named from the root of a
 * domain.  In a folder that sits inside a website that root is
 * somewhere else, so every name in the catalogue is turned into a name
 * that is relative to the folder itself.
   */
  const CATALOG_PREFIXES = [
    '/brand/',
    '/images/',
    '/prod/uploads/',
    '/covers/',
  ];
  const rewriteValue = (value) => {
    if (typeof value === 'string') {
      if (value === '/license.html') return './license.html';
      for (const prefix of CATALOG_PREFIXES) {
        if (value.startsWith(prefix)) return './' + value.slice(1);
      }
      const launch = /^\/api\/launch\/([A-Za-z0-9_-]+)$/.exec(value);
      if (launch) return `courseware/${launch[1]}/index.html`;
      return value;
    }
    if (Array.isArray(value)) return value.map(rewriteValue);
    if (value && typeof value === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(value)) out[k] = rewriteValue(v);
      return out;
    }
    return value;
  };
  const catalogText = JSON.stringify(rewriteValue(catalog));
  write(path.join(OUT, 'catalog.json'), catalogText);
  const ids = catalog.products.filter((p) => p.localInstalled).map((p) => p.id);
  const only = arg('only', '');
  const limit = Number(arg('limit', 0));
  const wanted = only && only.includes(',')
    ? new Set(only.split(',').map((s) => s.trim()).filter(Boolean))
    : null;
  const picked = only
    ? ids.filter((id) => (wanted ? wanted.has(id) : id.includes(only)))
    : limit
      ? ids.slice(0, limit)
      : ids;
  console.log('课件', picked.length, '门');

  /* The shell of the site. */
  copyShell();

  /* The pictures the catalogue shows. */
  console.log('复制图片…');
  /*
   * The pictures the catalogue shows are the ones that are needed.
   * The rest of the folder holds films of the lessons that were
   * recorded for the platform the lessons came from; nobody watches
   * them here, so they are not carried along.
   */
  const wantedCovers = new Set();
  for (const product of catalog.products || []) {
    const cover = String(product.cover || '').replace(/^\.\//, '');
    if (cover) wantedCovers.add(cover);
  }
  for (const [prefix, dir] of [
    ['brand', path.join(LQ, 'brand')],
    ['images', path.join(LIBRARY, 'assets', 'images')],
    ['prod/uploads', path.join(STUDIO, 'public', 'prod', 'uploads')],
    ['covers', path.join(STUDIO, 'assets', 'premium-catalogue', 'covers')],
  ]) {
    if (!fs.existsSync(dir)) continue;
    for (const file of walk(dir)) {
      if (prefix === 'prod/uploads' && !wantedCovers.has(`${prefix}/${file.name}`)) continue;
      copy(file.file, path.join(OUT, prefix, file.name));
    }
  }

  /* The lessons. */
  console.log('写出课件…');
  let done = 0;
  let bytes = 0;
  const index = [];
  const failed = [];
  await pool(picked, CONC, async (id) => {
    try {
      const res = await fetchWithRetry(
        `${BASE}/api/downloads/file/${encodeURIComponent(id)}?pack=1`
      );
      const body = Buffer.from(await res.arrayBuffer());
      const entries = readZip(body);
      const dir = path.join(OUT, 'courseware', id);
      const manifest = [];
      const lesson = buildLesson(id, entries, new Set(picked));
      const finalHtml = dropForeignHints(
        replaceOldBrand(replaceSplashMark(refreshCsp(lesson.html)))
      );
      for (const [name, data] of lesson.files) {
        /* The page of the lesson is written last: a file of the lesson
           that carries the same name must not take its place. */
        if (name === 'index.html' || name === 'index.htm') continue;
        write(path.join(dir, name), data);
        manifest.push([name, name]);
      }
      write(path.join(dir, 'index.html'), finalHtml);
      manifest.unshift([`${id}.html`, 'index.html']);

      const product = catalog.products.find((p) => p.id === id);
      const title = String((product && product.title) || id);
      const fileName = safeName(title);
      const onlyHtml = manifest.length === 1;
      write(
        path.join(dir, 'download.json'),
        JSON.stringify({
          id,
          title,
          single: onlyHtml,
          filename: onlyHtml ? `${fileName}.html` : `${fileName}.zip`,
          entries: manifest,
        })
      );
      bytes += body.length;
      done++;
      if (done % 100 === 0) console.log(`  ${done}/${picked.length}`);
    } catch (err) {
      failed.push([id, String((err && err.message) || err)]);
      console.log(`  ! ${id}: ${(err && err.message) || err}`);
      if (process.env.LQ_DEBUG) console.log((err && err.stack) || '');
    }
  });

  if (failed.length) {
    console.log('');
    console.log('没有写出的课件', failed.length, '门：');
    for (const [id, why] of failed) console.log('  ', id, why);
  }

  console.log('写出课程清单…');
  write(
    path.join(OUT, 'courses.json'),
    JSON.stringify({
      builtAt: new Date().toISOString(),
      count: picked.length,
      courses: picked.map((id) => {
        const product = catalog.products.find((p) => p.id === id);
        return {
          id,
          title: String((product && product.title) || id),
          subject: String((product && product.subject) || ''),
          grades: (product && product.stages) || [],
        };
      }),
    })
  );

  const size = dirSize(OUT);
  console.log('');
  console.log('课件', picked.length, '门，写出', (size / 1024 / 1024).toFixed(0), 'MB');
  console.log('位置', OUT);
  if (index.length) console.log(index.join('\n'));
}

/* The files of a folder, as names that carry the folders with them. */
function walk(dir, base = '') {
  const out = [];
  let items = [];
  try {
    items = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const it of items) {
    const rel = base ? `${base}/${it.name}` : it.name;
    if (it.isDirectory()) out.push(...walk(path.join(dir, it.name), rel));
    else out.push({ name: rel, file: path.join(dir, it.name) });
  }
  return out;
}

function dirSize(dir) {
  let total = 0;
  for (const file of walk(dir)) {
    try {
      total += fs.statSync(file.file).size;
    } catch {
      /* A file that is being written is not counted twice. */
    }
  }
  return total;
}

function safeName(value) {
  return String(value)
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'course';
}

async function pool(list, size, worker) {
  let index = 0;
  const runners = Array.from({ length: size }, async () => {
    while (index < list.length) {
      const item = list[index++];
      await worker(item);
    }
  });
  await Promise.all(runners);
}

/* ----------------------------------------------------------- shell ---- */

/*
 * The shell of the site is a handful of files that name their own
 * neighbours from the root of a domain.  In a folder that sits inside
 * a website, that root is somewhere else, so every name is turned
 * into a name that is relative to the folder itself.
 */
const SITE_PREFIXES = [
  '/brand/',
  '/images/',
  '/prod/',
  '/covers/',
  '/courseware/',
];

function siteRelative(text, siteFiles) {
  /*
   * Only a name that points at something the folder really holds is
   * turned.  Anything else — a share of a lesson, an address of a
   * service — is left exactly as it was.
   */
  return text.replace(/(["'(])(\/[^"'\s]{0,200})\1/g, (all, q, name) => {
    if (name.charAt(1) === '/') return all;
    const clean = name.split('?')[0].split('#')[0];
    const known =
      siteFiles.has(clean) ||
      SITE_PREFIXES.some((prefix) => clean.startsWith(prefix));
    if (!known) return all;
    return q + './' + name.slice(1) + q;
  });
}

/*
 * A picture the page asks for that the folder does not hold is a
 * picture that is not there.  The name of it is taken away, so that
 * the page does not keep asking for it.
 */
function dropDeadPictures(text, siteFiles) {
  return text.replace(
    /url\(\s*(["']?)(\/[^)"'\s]{1,200})\1\s*\)/g,
    (all, q, name) => {
      const clean = name.split('?')[0].split('#')[0];
      if (siteFiles.has(clean)) return all;
      if (SITE_PREFIXES.some((prefix) => clean.startsWith(prefix))) return all;
      return 'none';
    }
  );
}

function copyShell() {
  const site = path.join(LQ, 'site');
  const siteFiles = new Set(
    walk(site).map((file) => '/' + file.name)
  );
  for (const file of walk(site)) {
    const to = path.join(OUT, file.name);
    if (/\.(?:html|css|js|mjs)$/i.test(file.name)) {
      let text = read(file.file).toString('utf8');
      text = siteRelative(text, siteFiles);
      text = dropDeadPictures(text, siteFiles);
      write(to, text);
    } else {
      copy(file.file, to);
    }
  }

  /* The page that opens a lesson names it by its own address. */
  const preview = path.join(OUT, 'lq-preview.js');
  if (fs.existsSync(preview)) {
    let text = fs.readFileSync(preview, 'utf8');
    /* The lesson lives in a folder of its own now. */
    text = text.split("'./courseware/'").join("'courseware/'");
    text = text.split('+ \'?local=1\'').join('+ \'/index.html?local=1\'');
    fs.writeFileSync(preview, text);
  }

  /* The download is handed over by the browser itself, out of the files
     the lesson is shown from, so the address of the file it hands over
     is one the browser made. */
  const store = path.join(OUT, 'download-store.js');
  if (fs.existsSync(store)) {
    let text = fs.readFileSync(store, 'utf8');
    text = text.replace(
      /!\/\^\\\/api\\\/downloads\\\/file\\\/\[A-Za-z0-9_-\]\+\$\/\.test\(file\.url\)/,
      '!/^(?:blob:|\\/api\\/downloads\\/file\\/)/.test(file.url)'
    );
    fs.writeFileSync(store, text);
  }

  /* The helper that answers the questions the site asks of itself. */
  const helper = fs.readFileSync(path.join(STATIC, 'lq-static.js'), 'utf8');
  write(path.join(OUT, 'lq-static.js'), helper);

  /* The helper has to be in place before the page starts asking. */
  const indexFile = path.join(OUT, 'index.html');
  if (fs.existsSync(indexFile)) {
    let text = fs.readFileSync(indexFile, 'utf8');
    text = text.replace(
      /<script type="module" src="\.\/app\.js/,
      '<script src="./lq-static.js"></script><script type="module" src="./app.js'
    );
    fs.writeFileSync(indexFile, text);
  }

  /*
   * A folder of files that is put on a web server says what kind of
   * file each of them is.  This note tells the server, so that a font
   * is a font and a sound is a sound, and so that a lesson which has
   * not changed is not fetched again every time it is opened.
 */
  write(
    path.join(OUT, '.htaccess'),
    [
      '# 乐启享课件库 · 静态站点说明',
      '',
      'AddType text/html .html',
      'AddType application/javascript .js .mjs',
      'AddType application/json .json',
      'AddType text/css .css',
      'AddType image/svg+xml .svg',
      'AddType image/png .png',
      'AddType image/jpeg .jpg .jpeg',
      'AddType image/webp .webp',
      'AddType image/gif .gif',
      'AddType image/x-icon .ico',
      'AddType font/woff2 .woff2',
      'AddType font/woff .woff',
      'AddType font/ttf .ttf',
      'AddType font/otf .otf',
      'AddType audio/mpeg .mp3',
      'AddType audio/wav .wav',
      'AddType video/mp4 .mp4',
      'AddType application/octet-stream .bin .gltf .glb .mp3 .wav .gz',
      '',
      'AddDefaultCharset UTF-8',
      '',
      '<IfModule mod_expires.c>',
      '  ExpiresActive On',
      '  ExpiresByType text/html "access plus 1 hour"',
      '  ExpiresByType application/json "access plus 1 hour"',
      '  ExpiresByType text/css "access plus 1 year"',
      '  ExpiresByType application/javascript "access plus 1 year"',
      '  ExpiresByType image/svg+xml "access plus 1 year"',
      '  ExpiresByType image/png "access plus 1 year"',
      '  ExpiresByType image/jpeg "access plus 1 year"',
      '  ExpiresByType image/webp "access plus 1 year"',
      '  ExpiresByType font/woff2 "access plus 1 year"',
      '  ExpiresByType font/woff "access plus 1 year"',
      '  ExpiresByType font/ttf "access plus 1 year"',
      '  ExpiresByType audio/mpeg "access plus 1 year"',
      '  ExpiresByType video/mp4 "access plus 1 year"',
      '</IfModule>',
      '',
      'Options -Indexes',
      '',
    ].join('\n')
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
