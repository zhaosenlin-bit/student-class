#!/usr/bin/env node
/*
 * 把课件库传到对象存储上。
 *
 * 直接用对象存储的接口，不装任何第三方库：仓库里保持干净，谁拿到
 * 这个仓库都能直接跑。
 *
 *   node tools/upload-oss.mjs --root dist --bucket leqixiang-courseware --prefix site
 *
 * 账号从环境变量或者一个配置文件里读，配置文件不进仓库：
 *   OSS_REGION / OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET / OSS_BUCKET
 * 或者  --config work/oss.txt
 *
 * 别的开关：
 *   --dry            只说要传哪些东西，不真的传
 *   --conc 8         同时传几个文件
 *   --match 关键字    只传路径里带这个字的文件
 *   --list 文件名     只传这个清单里写的文件（每行一个相对路径）
 *   --clean          把桶里这个前缀下、这次没有的旧文件删掉
 *   --skip-shared    不传 shared/ 那一层（调试时用）
 *   --skip-unchanged 桶里和本地一模一样的就不重传
 *   --public         把桶设成公开可读，课件才能让别人直接打开
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { listObjects, deleteObject } from './oss-prefix.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const flag = (name) => args.includes(`--${name}`);

const ROOT = path.resolve(arg('root', path.join(HERE, '..', 'dist')));
const REGION = arg('region', process.env.OSS_REGION || 'oss-cn-hangzhou');
let BUCKET = arg('bucket', process.env.OSS_BUCKET || '');
const PREFIX = String(arg('prefix', 'site')).replace(/^\/+|\/+$/g, '');
const MATCH = arg('match', '');
const LIST = arg('list', '');
const CONC = Number(arg('conc', 8));
const DRY = flag('dry');
const CLEAN = flag('clean');
const SKIP_SHARED = flag('skip-shared');
const PUBLIC = flag('public');
const SKIP_UNCHANGED = flag('skip-unchanged');

/*
 * 改了缓存的规矩之后，已经传过的文件也要重传一遍——文件本身没变，
 * 但桶里记着的「缓存多久」是老的。
 */
const REFRESH_CACHE = flag('refresh-cache');

/* 页面和清单本来就是五分钟的缓存；脚本、样式和启动脚本这一回换了规矩。 */
const SHORT_CACHE = /\.(?:js|mjs|css|cmd|sh|py)$/i;

/* ------------------------------------------------------- 账号与配置 --- */

function readConfig(file) {
  const out = {};
  if (!file || !fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Za-z0-9_]+)\s*=\s*(.+?)\s*$/.exec(line);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

const cfg = readConfig(arg('config', path.join(HERE, '..', 'work', 'oss.txt')));
const AK = process.env.OSS_ACCESS_KEY_ID || cfg.OSS_ACCESS_KEY_ID || '';
const SK = process.env.OSS_ACCESS_KEY_SECRET || cfg.OSS_ACCESS_KEY_SECRET || '';
/* 桶名也可以写在配置文件里，命令行不用再写一遍。 */
if (!BUCKET && cfg.OSS_BUCKET) BUCKET = cfg.OSS_BUCKET;

if (!AK || !SK) {
  console.error('没有找到对象存储的账号。请给 --config 指向一个配置文件，或者设好环境变量。');
  process.exit(1);
}
if (!BUCKET) {
  console.error('没有指定桶名。请加 --bucket <名字>。');
  process.exit(1);
}

/* ------------------------------------------------------------ 签名 --- */

const host = `${BUCKET}.${REGION}.aliyuncs.com`;

function sign(method, key, headers = {}, sub = '') {
  const date = new Date().toUTCString();
  const ossHeaders = Object.keys(headers)
    .filter((h) => h.toLowerCase().startsWith('x-oss-'))
    .map((h) => [h.toLowerCase(), String(headers[h]).trim()])
    .sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const canonical = ossHeaders.map(([k, v]) => `${k}:${v}\n`).join('');
  const resource = `/${BUCKET}/${key}${sub}`;
  const stringToSign = [
    method,
    headers['Content-MD5'] || '',
    headers['Content-Type'] || '',
    date,
    canonical + resource,
  ].join('\n');
  const signature = crypto.createHmac('sha1', SK).update(stringToSign, 'utf8').digest('base64');
  return {
    date,
    headers: {
      ...headers,
      Date: date,
      Authorization: `OSS ${AK}:${signature}`,
    },
  };
}

/* ------------------------------------------------------------ 类型 --- */

const TYPES = {
  html: 'text/html; charset=utf-8',
  htm: 'text/html; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  mjs: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8',
  json: 'application/json; charset=utf-8',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  ico: 'image/x-icon',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
  mp4: 'video/mp4',
  webm: 'video/webm',
  glb: 'model/gltf-binary',
  gltf: 'model/gltf+json',
  wasm: 'application/wasm',
  ttf: 'font/ttf',
  otf: 'font/otf',
  woff: 'font/woff',
  woff2: 'font/woff2',
  txt: 'text/plain; charset=utf-8',
  md: 'text/markdown; charset=utf-8',
  xml: 'application/xml',
  csv: 'text/csv; charset=utf-8',
  glsl: 'text/plain; charset=utf-8',
  bin: 'application/octet-stream',
};

/* 名字后面带问号的那些文件，是镜像下来的地址，类型只能猜。 */
function typeOf(file) {
  const ext = path.extname(file).replace(/^\./, '').toLowerCase();
  if (TYPES[ext]) return TYPES[ext];
  return 'application/octet-stream';
}

/*
 * 页面、清单、脚本和样式改得勤，缓存短一点；其余的按长期缓存走。
 *
 * 素材（图、模型、字体、视频）传上去就不再动了，一年 immutable 是对的。
 * 但脚本和样式是要改的——改完还让浏览器拿旧的一份，课件就会停在改
 * 之前的样子，看起来就是「加载不出来」。所以这几类只缓存五分钟。
 *
 * 启动脚本（.cmd / .sh / .py）也算在里头：它们跟着课件一起下载，改了
 * 以后要是还被浏览器存着，用户拿到的就是旧的那一份。
 */
function cacheOf(file) {
  if (/\.(?:html?|json|js|mjs|css|cmd|sh|py)$/i.test(file)) return 'public, max-age=300';
  return 'public, max-age=31536000, immutable';
}

/* ------------------------------------------------------------ 清单 --- */

function walk(dir, rel = '') {
  const out = [];
  for (const it of fs.readdirSync(dir, { withFileTypes: true })) {
    const r = rel ? rel + '/' + it.name : it.name;
    const abs = path.join(dir, it.name);
    if (it.isDirectory()) out.push(...walk(abs, r));
    else out.push({ rel: r, abs, size: fs.statSync(abs).size });
  }
  return out;
}

if (!fs.existsSync(ROOT)) {
  console.error('没有找到要传的目录：' + ROOT);
  process.exit(1);
}

let files = walk(ROOT);
const allFiles = files;
if (SKIP_SHARED) files = files.filter((f) => !f.rel.startsWith('shared/'));
/* 只传一部分的时候，用 --match 挑出需要的那些。 */
if (MATCH) files = files.filter((f) => f.rel.includes(MATCH));
/* 或者照着清单传：清单里没写的就不动。 */
if (LIST) {
  const want = new Set(
    fs
      .readFileSync(LIST, 'utf8')
      .split(/\r?\n/)
      .map((s) => s.trim().replace(/\\/g, '/'))
      .filter(Boolean)
  );
  files = files.filter((f) => want.has(f.rel.replace(/\\/g, '/')));
  const missing = [...want].filter((w) => !files.some((f) => f.rel.replace(/\\/g, '/') === w));
  if (missing.length) {
    console.error(`清单里有 ${missing.length} 个文件本地没有：`);
    for (const m of missing.slice(0, 20)) console.error('   ' + m);
    process.exit(1);
  }
}

const keyOf = (rel) => (PREFIX ? PREFIX + '/' : '') + rel;

/*
 * 桶里已经有的、而且和本地一模一样的，就不必再传一遍。
 * 上传用的是一次 PUT，桶那边的校验值就是整份文件的 MD5，
 * 和本地算出来的一样，就说明两边是同一份东西。
 */
if (SKIP_UNCHANGED && !DRY) {
  const onBucket = await listObjects(PREFIX ? PREFIX + '/' : '');
  const etagOf = new Map();
  for (const item of onBucket) {
    if (!item.ETag) continue;
    etagOf.set(PREFIX ? item.Key.slice(PREFIX.length + 1) : item.Key, item.ETag);
  }
  const before = files.length;
  files = files.filter((f) => {
    const key = f.rel.replace(/\\/g, '/');
    const etag = etagOf.get(key);
    if (!etag) return true;
    /*
     * 缓存的规矩改了的时候，文件本身没变，但桶里存的那条「缓存多久」
     * 还是老规矩。这时候要重传一遍，把新的规矩写进去。
     */
    if (REFRESH_CACHE && SHORT_CACHE.test(key)) return true;
    const md5 = crypto.createHash('md5').update(fs.readFileSync(f.abs)).digest('hex');
    return md5 !== etag;
  });
  console.log(`桶里已经有 ${before - files.length} 个和本地一模一样的，不用重传。`);
}

const total = files.reduce((s, f) => s + f.size, 0);
console.log(`要传 ${files.length} 个文件，${(total / 1048576).toFixed(0)} MB`);
console.log(`桶 ${BUCKET}，前缀 ${PREFIX ? PREFIX + '/' : '(根)'}`);

if (DRY) {
  const byType = new Map();
  for (const f of files) {
    const t = typeOf(f.rel);
    byType.set(t, (byType.get(t) || 0) + f.size);
  }
  for (const [t, n] of [...byType].sort((a, b) => b[1] - a[1]))
    console.log(`   ${(n / 1048576).toFixed(0).padStart(6)} MB  ${t}`);
  process.exit(0);
}

/* ------------------------------------------------------------ 传 --- */

/* 桶设成公开可读，别人才能直接打开课件。 */
async function makePublic() {
  const got = await fetch(`https://${host}/?acl`, { headers: sign('GET', '', {}, '?acl').headers });
  if (!got.ok) {
    console.error('读不到桶的权限设置：' + got.status);
    return false;
  }
  const xml = await got.text();
  const id = /<ID>([^<]*)<\/ID>/.exec(xml);
  const name = /<DisplayName>([^<]*)<\/DisplayName>/.exec(xml);
  const body =
    '<AccessControlPolicy>' +
    '<Owner>' +
    `<ID>${id ? id[1] : ''}</ID>` +
    `<DisplayName>${name ? name[1] : ''}</DisplayName>` +
    '</Owner>' +
    '<AccessControlList><Grant>public-read</Grant></AccessControlList>' +
    '</AccessControlPolicy>';
  const res = await fetch(`https://${host}/?acl`, {
    method: 'PUT',
    headers: {
      ...sign('PUT', '', { 'Content-Type': 'application/xml' }, '?acl').headers,
      'Content-Length': String(Buffer.byteLength(body)),
    },
    body,
  });
  if (!res.ok) {
    console.error('桶设成公开可读失败：' + res.status + ' ' + (await res.text().catch(() => '')));
    return false;
  }
  console.log('桶已经设成公开可读。');
  return true;
}

if (PUBLIC && !DRY) {
  await makePublic();
}

let done = 0;
let sent = 0;
let failed = 0;
const failures = [];
const started = Date.now();

async function put(file) {
  const key = keyOf(file.rel);
  const body = fs.readFileSync(file.abs);
  const headers = {
    'Content-Type': typeOf(file.rel),
    'Content-Length': String(body.length),
    'Content-MD5': crypto.createHash('md5').update(body).digest('base64'),
    'Cache-Control': cacheOf(file.rel),
    'x-oss-meta-source': 'leqixiang-courseware',
  };
  const signed = sign('PUT', key, headers);
  for (let tries = 0; tries < 4; tries++) {
    try {
      const res = await fetch(`https://${host}/${key.split('/').map(encodeURIComponent).join('/')}`, {
        method: 'PUT',
        headers: signed.headers,
        body,
      });
      if (res.ok) {
        sent += body.length;
        return true;
      }
      const text = await res.text().catch(() => '');
      if (res.status >= 500 && tries < 3) {
        await new Promise((r) => setTimeout(r, 500 * (tries + 1)));
        continue;
      }
      throw new Error(`${res.status} ${text.slice(0, 200)}`);
    } catch (err) {
      if (tries < 3) {
        await new Promise((r) => setTimeout(r, 500 * (tries + 1)));
        continue;
      }
      failed++;
      failures.push(`${file.rel} → ${err.message}`);
      return false;
    }
  }
  return false;
}

let cursor = 0;
async function worker() {
  while (cursor < files.length) {
    const file = files[cursor++];
    await put(file);
    done++;
    if (done % 200 === 0 || done === files.length) {
      const secs = (Date.now() - started) / 1000;
      const rate = sent / 1048576 / Math.max(0.001, secs);
      const left = (total - sent) / 1048576 / Math.max(0.001, rate);
      process.stdout.write(
        `  ${done}/${files.length} 个 · ${(sent / 1048576).toFixed(0)} MB · ${rate.toFixed(1)} MB/s · 还差 ${left.toFixed(0)}s\n`
      );
    }
  }
}

await Promise.all(Array.from({ length: Math.max(1, CONC) }, worker));

console.log(`传完 ${files.length} 个文件，${(sent / 1048576).toFixed(0)} MB，用时 ${((Date.now() - started) / 1000).toFixed(0)} 秒`);
if (failed) {
  console.log(`有 ${failed} 个没传上去：`);
  for (const f of failures.slice(0, 20)) console.log('   ' + f);
  process.exitCode = 1;
}

/* ------------------------------------------------------------ 清理 --- */

if (CLEAN && MATCH) {
  console.error('只传一部分的时候不能顺手清理，--clean 会把别的文件都删掉。');
  process.exit(1);
}

if (CLEAN && !failed) {
  /* 清理按"本地一共有什么"算，不能按"这次传了哪些"算。 */
  const keep = new Set(allFiles.map((f) => keyOf(f.rel)));
  const onBucket = await listObjects(PREFIX ? PREFIX + '/' : '');
  let removed = 0;
  for (const item of onBucket) {
    if (keep.has(item.Key)) continue;
    if ((await deleteObject(item.Key)) === 204) removed++;
  }
  console.log(`清掉 ${removed} 个旧文件`);
}
