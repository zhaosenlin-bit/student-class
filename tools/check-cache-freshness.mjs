#!/usr/bin/env node
/*
 * 线上发出来的，到底是最新版还是旧版？
 *
 * 服务器可能自己在前面留一份缓存。留了缓存，访客拿到的就是改之前的那一
 * 版——表现是「有的资源加载不出来」「改了还是老样子」，而且改多少次都
 * 不生效，因为缓存里那份根本不会再问源站要。
 *
 * 这一份把同一个文件分别从两个地方各要一次头：
 *
 *   线上   --site   （走域名，走服务器）
 *   源站   --origin （走对象存储，直接问源头）
 *
 * 两个地方的 ETag（文件内容的指纹）或者长度对不上，就是线上那份是旧的。
 *
 * 另外还做一件事：同一个地址连着要两次，看两次的 x-oss-request-id 是不是
 * 同一个。同一个就说明服务器在回放它存下来的那份，没回源——这是缓存最
 * 明显的指纹，一眼就能看出来。
 *
 *   node tools/check-cache-freshness.mjs
 *   node tools/check-cache-freshness.mjs --scope all --out receipts/cache-freshness.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};

const SITE = arg('site', 'https://codebn.cn/leqixiang').replace(/\/+$/, '');
const ORIGIN = arg(
  'origin',
  'https://teaching-platform-files.oss-cn-hangzhou.aliyuncs.com/leqixiang'
).replace(/\/+$/, '');
const LOCAL = path.resolve(ROOT, arg('root', 'dist'));
const SCOPE = arg('scope', 'changed'); // changed | all
const DAYS = Number(arg('days', 2));
const CONC = Number(arg('conc', 16));
const OUT = arg('out', '');

/* 文件名里有中文、空格、表情符号，地址里要转义好才不会走偏。 */
const encode = (rel) => rel.split('/').map(encodeURIComponent).join('/');

function walk(dir, rel = '') {
  const out = [];
  for (const it of fs.readdirSync(dir, { withFileTypes: true })) {
    const r = rel ? rel + '/' + it.name : it.name;
    const abs = path.join(dir, it.name);
    if (it.isDirectory()) out.push(...walk(abs, r));
    else {
      const st = fs.statSync(abs);
      out.push({ rel: r, abs, size: st.size, mtime: st.mtimeMs });
    }
  }
  return out;
}

async function head(url) {
  for (let t = 0; t < 4; t++) {
    try {
      const r = await fetch(url, {
        method: 'HEAD',
        cache: 'no-store',
        /*
         * 一定要说清楚「不要压缩」。
         *
         * 服务器压缩过的响应里，文件长度会被抹掉，文件指纹也会被去掉，
         * 拿到的就只是半个信息，什么也比不出来。
         */
        headers: { 'accept-encoding': 'identity' },
        signal: AbortSignal.timeout(20000),
      });
      if (r.status === 405 || r.status === 501) return null;
      const len = r.headers.get('content-length');
      return {
        ok: r.ok,
        status: r.status,
        size: len === null ? null : Number(len),
        etag: (r.headers.get('etag') || '').replace(/^W\//, '').replace(/"/g, ''),
        modified: r.headers.get('last-modified') || '',
      };
    } catch (e) {
      if (t === 3) return { ok: false, err: String(e?.message || e) };
      await new Promise((r) => setTimeout(r, 600 * (t + 1)));
    }
  }
  return { ok: false };
}

async function pool(items, worker) {
  let index = 0;
  const runners = Array.from({ length: Math.min(CONC, Math.max(1, items.length)) }, async () => {
    for (;;) {
      const i = index++;
      if (i >= items.length) return;
      await worker(items[i]);
    }
  });
  await Promise.all(runners);
}

async function main() {
  if (!fs.existsSync(LOCAL)) {
    console.error(`找不到本地目录：${LOCAL}`);
    process.exit(1);
  }
  const all = walk(LOCAL);
  const cutoff = Date.now() - DAYS * 86400000;
  const files = SCOPE === 'all' ? all : all.filter((f) => f.mtime >= cutoff);

  console.log(`本地 ${all.length} 个文件，本次要查 ${files.length} 个`);
  console.log(`线上 ${SITE}`);
  console.log(`源站 ${ORIGIN}`);

  const stale = [];
  const missing = [];
  const broken = [];
  const ok = [];
  let done = 0;

  await pool(files, async (f) => {
    const rel = f.rel;
    const [site, origin] = await Promise.all([
      head(`${SITE}/${encode(rel)}`),
      head(`${ORIGIN}/${encode(rel)}`),
    ]);
    done++;
    if (done % 200 === 0) console.log(`  ${done}/${files.length}`);

    if (!site || !site.ok) {
      missing.push({ file: rel, status: site?.status ?? 'no-head', err: site?.err || '' });
      return;
    }
    if (!origin || !origin.ok) {
      /* 源站自己都取不到，这一项没法比，先记下来，不算线上的错。 */
      broken.push({ file: rel, status: origin?.status ?? 'no-head' });
      return;
    }
    /*
     * 比对文件的指纹（ETag）。指纹是内容算出来的，同一个内容一定是同一个
     * 指纹——线上和源站不一样，就说明线上拿的是旧的一份。
     *
     * 只在对方不给指纹的时候才退一步比长度，最后才比修改时间：文件重新
     * 传一次，修改时间就变了，可内容一个字都没动，这种情况不该算「旧版」。
     */
    let same = null;
    if (site.etag && origin.etag) same = site.etag === origin.etag;
    else if (site.size !== null && origin.size !== null) same = site.size === origin.size;
    else if (site.modified && origin.modified) same = site.modified === origin.modified;

    if (same === true) ok.push(rel);
    else {
      stale.push({
        file: rel,
        siteSize: site.size,
        originSize: origin.size,
        siteEtag: site.etag,
        originEtag: origin.etag,
        siteModified: site.modified,
        originModified: origin.modified,
      });
    }
  });

  /* 缓存指纹：同一个地址要两次，看源站给的请求号是不是同一个。 */
  let replay = null;
  try {
    const probe = encode('index.html');
    const a = await fetch(`${SITE}/${probe}`, { cache: 'no-store' });
    const b = await fetch(`${SITE}/${probe}`, { cache: 'no-store' });
    const ia = a.headers.get('x-oss-request-id');
    const ib = b.headers.get('x-oss-request-id');
    if (ia && ib) replay = { same: ia === ib, first: ia, second: ib };
  } catch {
    /* 探不到就算了，不影响正事。 */
  }

  const report = {
    site: SITE,
    origin: ORIGIN,
    scope: SCOPE,
    checked: files.length,
    ok: ok.length,
    stale: stale.length,
    missing: missing.length,
    sourceUnreachable: broken.length,
    cacheReplay: replay,
    staleFiles: stale.slice(0, 200),
    missingFiles: missing.slice(0, 200),
  };

  console.log('');
  console.log(`对得上   ${ok.length}`);
  console.log(`是旧版   ${stale.length}`);
  console.log(`取不到   ${missing.length}`);
  if (broken.length) console.log(`源站取不到 ${broken.length}`);
  if (replay) {
    console.log(
      replay.same
        ? `缓存指纹：两次请求的源站请求号相同（${replay.first}）——服务器在回放存下来的旧文件`
        : '缓存指纹：两次请求的源站请求号不同——每次都回源，没有缓存'
    );
  }
  if (stale.length) {
    console.log('');
    console.log('发旧版的文件（前 20 个）：');
    for (const s of stale.slice(0, 20)) {
      console.log(`  ${s.file}  线上 ${s.siteSize} 字节 / 源站 ${s.originSize} 字节`);
    }
  }
  if (missing.length) {
    console.log('');
    console.log('取不到的文件（前 20 个）：');
    for (const m of missing.slice(0, 20)) console.log(`  ${m.file}  ${m.status}`);
  }

  if (OUT) {
    const file = path.isAbsolute(OUT) ? OUT : path.join(ROOT, OUT);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(report, null, 2));
    console.log('');
    console.log(`结果写到 ${file}`);
  }

  /* 有旧版就说明还没好，退出码留给流水线用。 */
  process.exitCode = stale.length || missing.length ? 1 : 0;
}

main();
