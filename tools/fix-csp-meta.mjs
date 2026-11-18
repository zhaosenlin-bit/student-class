#!/usr/bin/env node
/*
 * 补上被截断的那一行网页安全声明。
 *
 * 有几门课件的 <meta http-equiv="Content-Security-Policy" ...> 少了收尾
 * 的引号和尖括号，浏览器读到一半就把下一行也当成了声明的内容，于是
 * 报 "invalid source"，页面里的图片和脚本也会被拦下来。
 *
 *   node tools/fix-csp-meta.mjs          # 查一遍
 *   node tools/fix-csp-meta.mjs --fix    # 顺手改好
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOTS = ['mirror'];
const SKIP = new Set(['node_modules', '.git']);

const walk = (dir, out = []) => {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.html?$/i.test(e.name)) out.push(p);
  }
  return out;
};

/* 声明本身没有收尾，就是坏的。 */
const FIX = process.argv.includes('--fix');
let count = 0;
for (const root of ROOTS) {
  for (const file of walk(root)) {
    let text;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    for (const m of text.matchAll(/<meta\b[^>]*Content-Security-Policy[^>]*>/gi)) {
      const tag = m[0];
      /* 引号是关好的就没问题。 */
      if (/content="[^"]*"/i.test(tag)) continue;
      count++;
      console.log('坏的 ' + file);
      if (!FIX) continue;
      /* 声明的内容到尖括号为止，把收尾的引号和尖括号补回去。 */
      const body = tag.replace(/<meta\b/i, '').replace(/>$/, '');
      const fixed = '<meta' + body + '">';
      fs.writeFileSync(file, text.slice(0, m.index) + fixed + text.slice(m.index + tag.length));
      console.log('   改好了');
      break;
    }
  }
}
console.log('一共 ' + count + ' 处');
