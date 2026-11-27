#!/usr/bin/env node
/*
 * 查一遍样式表和字体的地址是不是都指向真实存在的文件。
 *
 * 样式表是按名字引用的，名字对不上的时候页面不会报错，只会安安静静
 * 少一块样式或者少一种字体。这里把每一个地址都算出来，看它落在哪儿，
 * 落在不存在的文件上就报出来。
 *
 *   node tools/check-font-links.mjs [--root dist]
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf('--' + name);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const root = path.resolve(arg('root', 'dist'));

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    e.isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
}

const files = walk(root);
const TEXT = /\.(?:json|js|mjs|html|css)$/i;
const SHEET = /_ext[\\/]fonts\.googleapis\.com[\\/](css|css2)(\.css)?$/;

let checked = 0;
let missing = [];
let outside = [];

/*
 * 把文字里提到样式表的地方一个一个找出来。
 * 不用正则：大文件里正则会退回来重试，慢得能把人等急。
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
    out.push(text.slice(s, e));
    i = e;
  }
}

/* 一、样式表里写的每一个字体地址。 */
for (const f of files) {
  if (!SHEET.test(f.replace(/\\/g, '/'))) continue;
  const dir = path.dirname(f);
  const text = fs.readFileSync(f, 'utf8');
  for (const m of text.matchAll(/url\(([^)]*)\)/g)) {
    const u = m[1].trim().replace(/^["']|["']$/g, '');
    checked++;
    if (/^https?:\/\//i.test(u)) {
      outside.push(path.relative(root, f).replace(/\\/g, '/') + '  ' + u);
      continue;
    }
    const abs = path.resolve(dir, u.split('?')[0].split('#')[0]);
    if (!fs.existsSync(abs)) {
      missing.push(path.relative(root, f).replace(/\\/g, '/') + '  ->  ' + u);
    }
  }
}

/* 二、网页和下载清单里引用的每一张样式表。 */
for (const f of files) {
  if (!TEXT.test(f)) continue;
  let text;
  try {
    text = fs.readFileSync(f, 'utf8');
  } catch {
    continue;
  }
  if (!text.includes('fonts.googleapis.com')) continue;
  const dir = path.dirname(f);
  for (const raw of tokens(text)) {
    if (/^https?:\/\//i.test(raw)) continue;
    const p = raw.split(/[?#]/)[0];
    if (!p) continue;
    /* 清单里的名字是压缩包里的名字，不一定是磁盘上的位置。 */
    if (/\.(?:html?|js|mjs|css|json)$/i.test(p) === false && !fs.existsSync(path.resolve(dir, p))) {
      continue;
    }
    checked++;
    const abs = path.resolve(dir, p);
    /*
     * 清单里有两个名字：一个是压缩包里的名字，本来就不在磁盘上；
     * 一个是真正去取的地方。只有后者断了才算问题。
     */
    const parent = path.dirname(abs);
    if (!fs.existsSync(abs) && fs.existsSync(parent)) {
      missing.push(path.relative(root, f).replace(/\\/g, '/') + '  ->  ' + p);
    }
  }
}

console.log('查了 ' + checked + ' 个地址');
console.log('指空的 ' + missing.length + ' 处');
const byFile = new Map();
for (const m of missing) {
  const f = m.split('  ->  ')[0];
  if (!byFile.has(f)) byFile.set(f, 0);
  byFile.set(f, byFile.get(f) + 1);
}
console.log('  涉及 ' + byFile.size + ' 个文件：');
for (const [f, n] of [...byFile].sort((a, b) => b[1] - a[1]).slice(0, 20)) {
  console.log('    ' + n + '  ' + f);
}
const others = [...byFile].filter(([f]) => !/fonts\.googleapis\.com[/\\]css2$/.test(f));
console.log('  除掉补不齐的那批，还剩 ' + others.length + ' 个文件：');
for (const [f, n] of others.sort((a, b) => b[1] - a[1]).slice(0, 20)) {
  console.log('    ' + n + '  ' + f);
}
console.log('还往站外指的 ' + outside.length + ' 处');
for (const o of outside.slice(0, 15)) console.log('  ' + o);

if (missing.length || outside.length) process.exit(1);
