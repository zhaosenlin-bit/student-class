#!/usr/bin/env node
/*
 * 把课件用到的网络字体收进本地，样式表也换成正经的 .css 文件。
 *
 * 三件事：
 *
 * 一、归并。同一张样式表在很多门课里各存一份，加起来几十兆。改成只留
 *    共享目录里的那一份，各门课都指向它。
 *
 * 二、本地化。样式表里写的是网络上的字体地址（fonts.gstatic.com）。本地
 *    化以后课件不该再往外面跑，缺的文件补下来，地址换成自己目录里的。
 *
 * 三、类型。样式表的名字没有扩展名（css、css2），对象存储和服务器都只
 *    能猜它是什么类型，一律当成二进制；浏览器拿到类型不对的样式表会整
 *    张丢掉，页面里 @font-face 定义的字体一个也用不上。所以改成 .css。
 *
 * 顺带把引用样式表的地方（网页、下载清单）一并改掉。
 *
 *   node tools/lq-fonts.mjs                 # 收拾 dist
 *   node tools/lq-fonts.mjs --root 目录
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf('--' + name);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};

/* 字体统一放在这个目录下。 */
const STORE = 'shared/assets/_ext/fonts.gstatic.com';

const TEXT = /\.(?:json|js|mjs|html|css|txt|md|svg)$/i;
const SHEET = /_ext[\\/]fonts\.googleapis\.com[\\/](css|css2)(\.css)?$/;
const GSTATIC = 'fonts.gstatic.com/';

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    e.isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
}

/* 从一段地址里取出字体文件在网络上的名字。 */
function gstaticKey(url) {
  const i = url.indexOf(GSTATIC);
  if (i < 0) return null;
  return url.slice(i + GSTATIC.length).split('?')[0].split('#')[0];
}

/* 从某个目录算起，到目标文件的相对地址。 */
function relFrom(fromDir, toFile) {
  let rel = path.relative(fromDir, toFile).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

/*
 * 把一段文字里提到样式表的地方找出来。
 *
 * 用逐个查找的办法，不用正则：大文件里正则会退回来重试，慢得能把人
 * 等急。找到 "fonts.googleapis.com" 以后，向两边扩到一个完整的地址。
 */
function tokens(text) {
  const MARK = 'fonts.googleapis.com';
  const out = [];
  let i = 0;
  for (;;) {
    const at = text.indexOf(MARK, i);
    if (at < 0) return out;
    let s = at;
    while (s > 0 && !/[\s"'()\[\]<>]/.test(text[s - 1])) s--;
    let e = at + MARK.length;
    while (e < text.length && !/[\s"'()\[\]<>]/.test(text[e])) e++;
    out.push({ start: s, end: e, raw: text.slice(s, e) });
    i = e;
  }
}

export async function fixFonts(root) {
  root = path.resolve(root);
  let files = walk(root);

  const sheets = () => files.filter((f) => SHEET.test(f.replace(/\\/g, '/')));

  /* ---------------------------------------------------------- 一、归并 --- */

  const groups = new Map();
  for (const f of sheets()) {
    const md5 = crypto.createHash('md5').update(fs.readFileSync(f)).digest('hex');
    if (!groups.has(md5)) groups.set(md5, []);
    groups.get(md5).push(f);
  }

  const redirect = new Map(); // 被挪走的文件 -> 留下的那一份
  const merged = [];
  for (const [md5, list] of groups) {
    if (list.length < 2) continue;
    /* 留在共享目录里的那一份当主角。 */
    const shared = list.filter((f) => f.replace(/\\/g, '/').includes('/shared/'));
    if (shared.length !== 1) continue;
    const canonical = shared[0];
    for (const f of list) {
      if (f === canonical) continue;
      redirect.set(path.resolve(f), path.resolve(canonical));
      merged.push(path.relative(root, f));
    }
  }
  for (const f of merged) fs.rmSync(path.join(root, f));

  files = walk(root);

  /* ---------------------------------------------------- 二、本地化字体 --- */

  const fonts = new Map(); // 网络上的名字 -> 本地的文件
  for (const f of files) {
    const norm = f.replace(/\\/g, '/');
    const i = norm.indexOf(GSTATIC);
    if (i < 0) continue;
    const key = norm.slice(i + GSTATIC.length);
    if (!fonts.has(key)) fonts.set(key, []);
    fonts.get(key).push(f);
  }

  const downloaded = [];
  const edited = [];
  const dead = [];
  const renamed = new Map(); // 旧文件 -> 新文件

  for (const sheet of sheets()) {
    const dir = path.dirname(sheet);
    const text = fs.readFileSync(sheet, 'utf8');
    const urls = [...new Set([...text.matchAll(/url\(([^)]*)\)/g)].map((m) => m[1].trim()))];

    const missing = [];
    for (const u of urls) {
      const key = gstaticKey(u);
      if (!key || fonts.has(key)) continue;
      /* 缺的就补下来。不管原文写的是哪一种写法，都从字体站取。 */
      const target = path.join(root, STORE, key);
      try {
        fs.mkdirSync(path.dirname(target), { recursive: true });
        const res = await fetch('https://fonts.gstatic.com/' + key);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const buf = Buffer.from(await res.arrayBuffer());
        fs.writeFileSync(target, buf);
        if (!fonts.has(key)) fonts.set(key, []);
        fonts.get(key).push(target);
        downloaded.push(path.relative(root, target));
      } catch (e) {
        missing.push(u + '  (' + e.message + ')');
      }
    }

    if (missing.length) {
      dead.push({ file: path.relative(root, sheet), missing });
      continue;
    }

    /* 地址换成自己目录里的文件。 */
    let out = text;
    for (const u of urls) {
      const key = gstaticKey(u);
      if (!key) continue;
      const list = fonts.get(key) || [];
      if (!list.length) continue;
      /* 取离这张样式表最近的那一份。 */
      let best = list[0];
      let bestLen = Infinity;
      for (const cand of list) {
        const len = relFrom(dir, cand).length;
        if (len < bestLen) {
          best = cand;
          bestLen = len;
        }
      }
      const rel = relFrom(dir, best);
      for (const form of ['url(' + u + ')', 'url("' + u + '")', "url('" + u + "')"]) {
        out = out.split(form).join(form.replace(u, rel));
      }
    }
    if (out !== text) {
      fs.writeFileSync(sheet, out);
      edited.push(path.relative(root, sheet));
    }

    /* 样式表改名，带上 .css，服务器才知道该怎么给类型。 */
    const base = path.basename(sheet);
    if (!base.endsWith('.css')) {
      const next = path.join(dir, base + '.css');
      if (fs.existsSync(next)) {
        fs.rmSync(sheet);
      } else {
        fs.renameSync(sheet, next);
      }
      renamed.set(path.resolve(sheet), path.resolve(next));
    }
  }

  /* ------------------------------------------------- 三、把地址改过来 --- */

  /* 最后该指向哪里：先归并，再改名。 */
  const final = new Map();
  for (const [oldAbs, newAbs] of renamed) final.set(oldAbs, newAbs);
  for (const [oldAbs, canon] of redirect) {
    final.set(oldAbs, renamed.get(canon) || canon);
  }

  const byBase = new Map();
  for (const [oldAbs, newAbs] of final) {
    byBase.set(path.basename(oldAbs), path.basename(newAbs));
  }

  const refs = [];
  for (const f of walk(root)) {
    if (!TEXT.test(f)) continue;
    let text;
    try {
      text = fs.readFileSync(f, 'utf8');
    } catch {
      continue;
    }
    if (!text.includes('fonts.googleapis.com')) continue;
    const dir = path.dirname(f);
    let count = 0;
    let out = '';
    let i = 0;
    for (const t of tokens(text)) {
      out += text.slice(i, t.start);
      i = t.end;
      const raw = t.raw;
      if (/^https?:\/\//i.test(raw)) {
        out += raw;
        continue;
      }
      const q = raw.search(/[?#]/);
      const p = q >= 0 ? raw.slice(0, q) : raw;
      const tail = q >= 0 ? raw.slice(q) : '';
      const abs = path.resolve(dir, p);
      if (final.has(abs)) {
        count++;
        out += relFrom(dir, final.get(abs)) + tail;
        continue;
      }
      const base = path.basename(p);
      if (byBase.has(base) && !fs.existsSync(abs)) {
        /* 压缩包里的名字：不是磁盘上的位置，只要把最后一段改掉。 */
        count++;
        const dir2 = path.dirname(p);
        const nb = byBase.get(base);
        out += (dir2 === '.' ? nb : dir2 + '/' + nb) + tail;
        continue;
      }
      out += raw;
    }
    out += text.slice(i);
    if (count) {
      fs.writeFileSync(f, out);
      refs.push({ file: path.relative(root, f), count });
    }
  }

  return {
    merged,
    downloaded,
    edited,
    renamed: [...renamed].map(([a, b]) => [path.relative(root, a), path.relative(root, b)]),
    refs,
    dead,
  };
}

/* ------------------------------------------------------------ 用起来 --- */

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = arg('root', 'dist');
  if (!fs.existsSync(root)) {
    console.error('找不到目录：' + root);
    process.exit(1);
  }
  const r = await fixFonts(root);
  console.log('目录 ' + root);
  console.log('  归并掉的重复样式表 ' + r.merged.length + ' 张');
  for (const x of r.merged.slice(0, 6)) console.log('    ' + x);
  console.log('  补下字体 ' + r.downloaded.length + ' 个');
  console.log('  改过内容的样式表 ' + r.edited.length + ' 张');
  console.log('  改了名的样式表 ' + r.renamed.length + ' 张');
  for (const [a, b] of r.renamed.slice(0, 6)) console.log('    ' + a + ' -> ' + path.basename(b));
  console.log('  改过地址的文件 ' + r.refs.length + ' 个，共 ' + r.refs.reduce((s, x) => s + x.count, 0) + ' 处');
  console.log('  补不齐的样式表 ' + r.dead.length + ' 张');
  for (const d of r.dead.slice(0, 6)) {
    console.log('    ' + d.file);
    for (const m of d.missing.slice(0, 2)) console.log('        缺 ' + m);
  }
}
