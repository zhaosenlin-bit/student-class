#!/usr/bin/env node
/*
 * 把课件里引用了、但本地还没有的外部文件补回来。
 *
 * 有些课件在正文里引用了网上的参考页（几何图、实验手册、题图）。
 * 这些地址在本地是断的，点进去就是一张裂开的图。这里按引用的
 * 名字逐个去原站要一次，存进课件自己的 _ext 目录里，以后离线
 * 也能打开。
 *
 *   node tools/fill-missing-ext.mjs            # 先扫描再补
 *   node tools/fill-missing-ext.mjs --scan     # 只扫描，列出缺口
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'mirror/leqixiang/courseware';
const SKIP = /^(?:https?:|data:|blob:|mailto:|javascript:|#|\/\/)/i;

const list = (d, o = []) => {
  let e;
  try {
    e = fs.readdirSync(d, { withFileTypes: true });
  } catch {
    return o;
  }
  for (const x of e) {
    const p = path.join(d, x.name);
    if (x.isDirectory()) list(p, o);
    else if (x.isFile()) o.push(p);
  }
  return o;
};

/* 只认真正像地址的引用：带扩展名、不带插值符号。 */
const REAL = (r) => {
  if (!r || SKIP.test(r)) return false;
  if (/[${}`]|%%/.test(r)) return false;
  if (r.includes(',')) return false;
  if (!/\.[a-z0-9]{1,6}$/i.test(r.split('#')[0].split('?')[0])) return false;
  return true;
};

const scan = () => {
  const out = [];
  const courses = fs
    .readdirSync(ROOT)
    .filter((n) => n.endsWith('.assets'))
    .map((n) => n.replace(/\.assets$/, ''));
  for (const c of courses) {
    const dir = path.join(ROOT, c + '.assets');
    const missing = new Map();
    for (const f of list(dir)) {
      const ext = path.extname(f).toLowerCase();
      if (!['.html', '.htm', '.css'].includes(ext)) continue;
      let txt;
      try {
        txt = fs.readFileSync(f, 'utf8');
      } catch {
        continue;
      }
      const refs = [];
      for (const m of txt.matchAll(/(?:src|href|data-src|poster)\s*=\s*["']([^"']+)["']/gi)) refs.push(m[1]);
      for (const m of txt.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) refs.push(m[1]);
      for (const r of refs) {
        if (!REAL(r)) continue;
        const clean = r.split('#')[0].split('?')[0];
        let decoded = clean;
        try {
          decoded = decodeURIComponent(clean);
        } catch {}
        const abs = path.resolve(path.dirname(f), decoded);
        const rel = path.relative(dir, abs).split(path.sep).join('/');
        if (rel.startsWith('..')) continue;
        if (fs.existsSync(abs)) continue;
        if (!missing.has(rel)) missing.set(rel, new Set());
        missing.get(rel).add(path.relative(dir, f).split(path.sep).join('/'));
      }
    }
    if (missing.size) out.push({ c, missing: [...missing].map(([k, v]) => [k, [...v]]) });
  }
  return out;
};

/* 把 _ext 里的相对地址换成能直接问原站的写法。 */
const remoteUrl = (rel) => {
  const m = rel.match(/^_ext\/([^/]+)\/(.+)$/);
  if (!m) return null;
  return 'https://' + m[1] + '/' + m[2].split('/').map(encodeURIComponent).join('/');
};

const grab = async (url, dest) => {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 25000);
  try {
    const r = await fetch(url, {
      signal: ctl.signal,
      redirect: 'follow',
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36',
        accept: '*/*',
      },
    });
    if (!r.ok) return { ok: false, status: r.status };
    const buf = Buffer.from(await r.arrayBuffer());
    if (!buf.length) return { ok: false, status: r.status };
    const ct = String(r.headers.get('content-type') || '');
    /*
     * 原站给的是 html，多半是这个地址本身就是一个页面。地址结尾就是
 * .html 的时候照收不误；否则说明我们猜错了地址，不能乱存。
     */
    const wantsHtml = /\.(?:html?|shtml)$/i.test(dest);
    if (/text\/html/i.test(ct) && !wantsHtml) return { ok: false, status: 'html' };
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buf);
    return { ok: true, size: buf.length };
  } catch (e) {
    return { ok: false, status: e.message };
  } finally {
    clearTimeout(timer);
  }
};

const argv = process.argv.slice(2);
const gaps = scan();
const total = gaps.reduce((n, o) => n + o.missing.length, 0);
console.log(`扫描：${gaps.length} 门课件有缺口，一共 ${total} 个文件`);

if (argv.includes('--scan')) {
  for (const o of gaps) {
    console.log('  ' + o.c + '  缺 ' + o.missing.length);
    for (const [k] of o.missing.slice(0, 5)) console.log('       ' + k);
  }
  process.exit(0);
}

const failed = [];
let saved = 0;
for (const o of gaps) {
  for (const [rel] of o.missing) {
    const url = remoteUrl(rel);
    const dest = path.join(ROOT, o.c + '.assets', rel);
    if (!url) {
      failed.push([o.c, rel, '本地地址，需单独处理']);
      continue;
    }
    const r = await grab(url, dest);
    if (r.ok) saved++;
    else failed.push([o.c, rel, r.status]);
  }
}

console.log(`补回 ${saved} 个，失败 ${failed.length} 个`);
const byReason = new Map();
for (const [, , why] of failed) byReason.set(why, (byReason.get(why) || 0) + 1);
for (const [why, n] of byReason) console.log('   ' + why + ' : ' + n + ' 个');
fs.writeFileSync(
  'recon/scratch/lq-ext-failed.json',
  JSON.stringify(failed.map(([c, p, why]) => ({ c, p, why })), null, 1)
);
