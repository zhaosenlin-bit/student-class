#!/usr/bin/env node
/*
 * 把被文本模式写坏的二进制文件重新取回来。
 *
 * 这些文件在抓下来的时候走了"按文字读"的路子，图里那些不认识的字节就被
 * 换成了问号（U+FFFD）。画面上就是裂开的图，听起来是沙沙的杂音。
 *
 * 每一份坏掉的文件都有它的来处：镜像清单里记着的地址，或者原站上相同
 * 的位置。这一页照着来处重新取一遍，取回来的字节原样写回磁盘。
 *
 *   node tools/repair-corrupt-assets.mjs
 *   node tools/repair-corrupt-assets.mjs --dry
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry');

/* The replacement character: the mark left where a byte could not be read. */
const FFFD = Buffer.from([0xef, 0xbf, 0xbd]);

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

/* The ticket of the last sign-in, if there is one. */
const TOKEN_FILE = path.join(ROOT, 'recon', 'scratch', 'afe-token.txt');
const TOKEN = fs.existsSync(TOKEN_FILE) ? fs.readFileSync(TOKEN_FILE, 'utf8').trim() : '';
if (TOKEN) console.log('带着登录凭证去取文件。');

function listFiles(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) listFiles(p, out);
    else if (e.isFile()) out.push(p);
  }
  return out;
}

function isCorrupt(file) {
  let st;
  try {
    st = fs.statSync(file);
  } catch {
    return false;
  }
  if (st.size < 200) return false;
  let buf;
  try {
    buf = fs.readFileSync(file);
  } catch {
    return false;
  }
  return buf.includes(FFFD);
}

async function grab(url, tries = 2) {
  for (let i = 0; i < tries; i++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 25000);
      const headers = {
        'user-agent': UA,
        referer: new URL(url).origin + '/',
      };
      /*
       * The platform hands out its files only to a signed-in reader, so
       * the ticket that was saved at the last sign-in is sent along.
       */
      if (TOKEN) {
        headers.authorization = 'Bearer ' + TOKEN;
        headers['x-access-token'] = TOKEN;
      }
      const res = await fetch(url, {
        headers,
        signal: ctrl.signal,
        redirect: 'follow',
      });
      clearTimeout(timer);
      if (!res.ok) {
        await new Promise((r) => setTimeout(r, 500 * (i + 1)));
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      if (!buf.length) continue;
      return buf;
    } catch {
      await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
  }
  return null;
}

/*
 * Where each broken file came from.
 *
 * The shared folder of the laboratories was mirrored from the root of the
 * site, so a file under it sits at the same place on the site.  The rest of
 * the mirror keeps a list of the addresses it used.
 */
function buildSources() {
  const sources = new Map();

  /* The laboratories: mirror/3jcn/shared/vendor/<path> is <path> on the site. */
  const vendorRoot = path.join(ROOT, 'mirror', '3jcn', 'shared', 'vendor');
  for (const file of listFiles(vendorRoot)) {
    const rel = path.relative(vendorRoot, file).split(path.sep).join('/');
    sources.set(path.resolve(file), `https://www.new3jcn.com/${rel}`);
  }

  /* The same folder, kept a second time for the library. */
  const lqVendor = path.join(ROOT, 'mirror', 'leqixiang', '_shared-ext', 'vendor');
  for (const file of listFiles(lqVendor)) {
    const rel = path.relative(lqVendor, file).split(path.sep).join('/');
    sources.set(path.resolve(file), `https://www.new3jcn.com/${rel}`);
  }

  /* The rest of the shared folder, kept a second time for the library. */
  const lqShared = path.join(ROOT, 'mirror', 'leqixiang', '_shared-ext');
  for (const file of listFiles(lqShared)) {
    const rel = path.relative(lqShared, file).split(path.sep).join('/');
    if (!rel.includes('/')) continue;
    const host = rel.split('/')[0];
    if (!host.includes('.')) continue;
    const tail = rel.slice(host.length + 1);
    sources.set(path.resolve(file), `https://${host}/${tail}`);
  }

  /* The list of the shared files the mirror wrote down. */
  const sharedJson = path.join(ROOT, 'mirror', '3jcn', 'shared.json');
  if (fs.existsSync(sharedJson)) {
    const entries = JSON.parse(fs.readFileSync(sharedJson, 'utf8'));
    const base = path.join(ROOT, 'mirror', '3jcn');
    for (const e of entries) {
      if (!e.url || !e.file) continue;
      sources.set(path.resolve(base, e.file), e.url);
    }
  }

  /*
   * The shared folder keeps the name of the host in front of the file.
   * A name that carries an "@" or a "+" is a name the site uses for a
   * package, and it has to be asked for exactly as it is written.
   */
  const sharedRoot = path.join(ROOT, 'mirror', '3jcn', 'shared');
  for (const file of listFiles(sharedRoot)) {
    const rel = path.relative(sharedRoot, file).split(path.sep).join('/');
    if (!rel.includes('/')) continue;
    const host = rel.split('/')[0];
    /* A host that is a name of a machine, not a name of a place. */
    if (!host.includes('.')) continue;
    const tail = rel.slice(host.length + 1);
    sources.set(path.resolve(file), `https://${host}/${tail}`);
  }

  /* The laboratory's own folder: the site keeps it at the root. */
  const vendorRoot2 = path.join(ROOT, 'mirror', '3jcn', 'shared', 'vendor');
  for (const file of listFiles(vendorRoot2)) {
    const rel = path.relative(vendorRoot2, file).split(path.sep).join('/');
    sources.set(path.resolve(file), `https://www.new3jcn.com/${rel}`);
  }

  /* The pictures people uploaded live under the uploads path of the site. */
  const uploadsRoot = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'public', 'prod');
  for (const file of listFiles(uploadsRoot)) {
    const rel = path.relative(uploadsRoot, file).split(path.sep).join('/');
    sources.set(
      path.resolve(file),
      `https://aifunengjiaoyu.com/prod/${encodeURI(rel).replace(/%2F/g, '/')}`
    );
  }

  /* The courses of 图灵智赋 keep their files under their own program id. */
  const afeCourse = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'courseware');
  for (const dir of fs.existsSync(afeCourse) ? fs.readdirSync(afeCourse) : []) {
    if (!dir.endsWith('.assets')) continue;
    const id = dir.replace(/\.assets$/, '');
    const root = path.join(afeCourse, dir);
    for (const file of listFiles(root)) {
      const rel = path.relative(root, file).split(path.sep).join('/');
      sources.set(
        path.resolve(file),
        `https://aifunengjiaoyu.com/api/program-assets/${id}/${rel}`
      );
    }
  }

  /*
   * The files that came from a public library are kept under _ext with the
   * name of the host in front of them, so the address is read back from
   * that name.  These libraries are open to everyone.
   */
  for (const base of [
    path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'courseware'),
    path.join(ROOT, 'mirror', 'leqixiang', 'courseware'),
    path.join(ROOT, 'mirror', '3jcn', 'shared'),
    path.join(ROOT, 'mirror', 'leqixiang', '_shared-ext'),
  ]) {
    for (const file of listFiles(base)) {
      const at = file.lastIndexOf(path.sep + '_ext' + path.sep);
      if (at < 0) continue;
      const tail = file.slice(at + 6).split(path.sep).join('/');
      sources.set(path.resolve(file), 'https://' + tail);
    }
  }

  /* The pages of the courses are kept beside the library that holds them. */
  const afePublic = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'public');
  for (const file of listFiles(afePublic)) {
    const rel = path.relative(afePublic, file).split(path.sep).join('/');
    sources.set(
      path.resolve(file),
      `https://aifunengjiaoyu.com/${encodeURI(rel).replace(/%2F/g, '/')}`
    );
  }

  /* The brand folder of the library holds the pictures of the courses. */
  const brandRoot = path.join(ROOT, 'mirror', 'leqixiang', 'brand');
  for (const file of listFiles(brandRoot)) {
    const rel = path.relative(brandRoot, file).split(path.sep).join('/');
    sources.set(path.resolve(file), `https://www.new3jcn.com/${rel}`);
  }

  /* The library keeps a copy of every course under its own name. */
  const lqCourse = path.join(ROOT, 'mirror', 'leqixiang', 'courseware');
  for (const dir of fs.existsSync(lqCourse) ? fs.readdirSync(lqCourse) : []) {
    if (!dir.endsWith('.assets')) continue;
    /* The library prefixes the works of 图灵智赋; the site does not. */
    const id = dir.replace(/\.assets$/, '').replace(/^afe-/, '');
    const root = path.join(lqCourse, dir);
    for (const file of listFiles(root)) {
      const rel = path.relative(root, file).split(path.sep).join('/');
      sources.set(
        path.resolve(file),
        `https://aifunengjiaoyu.com/api/program-assets/${id}/${rel}`
      );
    }
  }

  return sources;
}

/* The copies that live in more than one place are repaired once each. */
function mirrorPairs() {
  const pairs = [];
  const map = (a, b) => {
    if (fs.existsSync(a) && fs.existsSync(b)) pairs.push([path.resolve(a), path.resolve(b)]);
  };
  const lq = path.join(ROOT, 'mirror', 'leqixiang');
  map(
    path.join(ROOT, 'mirror', '3jcn', 'shared', 'vendor'),
    path.join(lq, '_shared-ext', 'vendor')
  );
  const jcnCourse = path.join(ROOT, 'mirror', '3jcn', 'courseware');
  const lqCourse = path.join(lq, 'courseware');
  if (fs.existsSync(jcnCourse) && fs.existsSync(lqCourse)) {
    for (const dir of fs.readdirSync(jcnCourse)) {
      if (!dir.endsWith('.assets')) continue;
      const twin = path.join(lqCourse, dir.replace(/^(\d+)\.assets$/, 'lab-$1.assets'));
      if (fs.existsSync(twin)) pairs.push([path.join(jcnCourse, dir), twin]);
    }
  }
  return pairs;
}

const SOURCES = buildSources();
const PAIRS = mirrorPairs();

const roots = [
  path.join(ROOT, 'mirror', '3jcn', 'shared'),
  path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'courseware'),
  path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'public'),
  path.join(ROOT, 'mirror', 'leqixiang', 'courseware'),
  path.join(ROOT, 'mirror', 'leqixiang', '_shared-ext'),
  path.join(ROOT, 'mirror', 'leqixiang', 'brand'),
];

const broken = [];
for (const r of roots) {
  for (const file of listFiles(r)) {
    if (isCorrupt(file)) broken.push(file);
  }
}

console.log(`坏掉的文件 ${broken.length} 个。`);

/* Group by the address it came from, so one address is fetched once. */
const byUrl = new Map();
const noSource = [];
for (const file of broken) {
  const src = SOURCES.get(path.resolve(file));
  if (!src) {
    noSource.push(file);
    continue;
  }
  if (!byUrl.has(src)) byUrl.set(src, []);
  byUrl.get(src).push(file);
}

console.log(`能找回 ${byUrl.size} 个地址，另有 ${noSource.length} 个找不到来处。`);
if (noSource.length) {
  for (const f of noSource.slice(0, 10)) console.log('   没有来处 ' + path.relative(ROOT, f));
}

let fixed = 0;
let failed = 0;
const failedUrls = [];

/*
 * The site answers slowly when it is asked for too much at once, so the
 * work is spread over a few workers and each one waits a little between
 * two requests.
 */
const CONC = Number(process.env.LQ_REPAIR_CONC || 6);
const entries = [...byUrl.entries()];
let cursor = 0;

async function worker() {
  for (;;) {
    const i = cursor++;
    if (i >= entries.length) return;
    const [url, files] = entries[i];
    const buf = await grab(url);
    if (!buf || buf.includes(FFFD)) {
      failed++;
      failedUrls.push(url);
      continue;
    }
    for (const file of files) {
      if (!DRY) fs.writeFileSync(file, buf);
      fixed++;
    }
    /* The same picture is often kept in a second place; it is repaired too. */
    for (const [a, b] of PAIRS) {
      if (!files.some((f) => path.resolve(f).startsWith(path.resolve(a) + path.sep))) continue;
      const rel = path.relative(path.resolve(a), path.resolve(files[0]));
      const twin = path.join(b, rel);
      if (fs.existsSync(twin) && isCorrupt(twin)) {
        if (!DRY) fs.writeFileSync(twin, buf);
        fixed++;
      }
    }
    if (fixed % 25 === 0) console.log(`   修好 ${fixed} 个…`);
    await new Promise((r) => setTimeout(r, 120));
  }
}

await Promise.all(Array.from({ length: CONC }, () => worker()));

console.log('');
console.log(`修好 ${fixed} 个，取不回 ${failed} 个。`);
if (failedUrls.length) {
  console.log('\n--- 取不回的地址');
  for (const u of failedUrls.slice(0, 30)) console.log('   ' + u);
}

process.exit(failed ? 1 : 0);
