#!/usr/bin/env node
/*
 * 修好共享目录里的字体样式表。
 *
 * 样式表指字体的时候，用的是「从自己所在的位置往上退几层」这种写法。
 * 同一份样式表放在不同的地方，要退的层数不一样：
 *
 *   shared/assets/_ext/fonts.googleapis.com/css2.css
 *       →  ../fonts.gstatic.com/…                      （退一层）
 *   shared/~名字/assets/_ext/fonts.googleapis.com/css2.css
 *       →  ../../../../assets/_ext/fonts.gstatic.com/…   （退四层）
 *
 * 层数弄错了，字体就找不着，页面上的字会变成浏览器现凑的样子。
 * 这个工具不靠手数：先找出字体文件到底在哪儿，再算出该退几层。
 *
 *   node tools/fix-shared-font-css.mjs --root dist
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const ROOT = path.resolve(arg('root', path.join(HERE, '..', 'dist')));

/* 字体池：/<字体名>/<版本>/<文件> -> 一个真的存在的文件 */
const pool = new Map();
function scan(dir, rel = '') {
  let items;
  try {
    items = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const it of items) {
    const abs = path.join(dir, it.name);
    const r = rel ? rel + '/' + it.name : it.name;
    if (it.isDirectory()) scan(abs, r);
    else {
      const m = /fonts\.gstatic\.com\/(.+)$/.exec(r);
      if (m && !pool.has(m[1])) pool.set(m[1], r);
    }
  }
}
scan(path.join(ROOT, 'shared'), 'shared');
scan(path.join(ROOT, 'courseware'), 'courseware');

/*
 * 硬链接：好几份共用一份内容。改之前先把链接断开（写进临时文件再改名），
 * 不然改一处就跟着改一片，课件自己那份样式表会被改坏。
 */
function writeOwn(file, text) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, file);
}

let fixed = 0;
const missing = [];

function walk(dir, rel = '') {
  let items;
  try {
    items = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const it of items) {
    const abs = path.join(dir, it.name);
    const r = rel ? rel + '/' + it.name : it.name;
    if (it.isDirectory()) walk(abs, r);
    else if (it.name.endsWith('.css')) {
      const text = fs.readFileSync(abs, 'utf8');
      if (!text.includes('fonts.gstatic.com')) continue;
      const dirOf = path.posix.dirname(r);
      const after = text.replace(/url\(\s*([^)]+?)\s*\)/g, (whole, ref) => {
        if (/^(data:|https?:|\/\/)/i.test(ref)) return whole;
        const tail = /fonts\.gstatic\.com\/(.+)$/.exec(ref);
        if (!tail) return whole;
        const key = tail[1];
        const target = pool.get(key);
        if (!target) {
          missing.push(r + '  ' + key);
          return whole;
        }
        /* 从样式表自己所在的位置，算出到字体文件该走哪条路。 */
        return `url(${path.posix.relative(dirOf, target)})`;
      });
      if (after === text) continue;
      writeOwn(abs, after);
      fixed++;
    }
  }
}
walk(path.join(ROOT, 'shared'), 'shared');

console.log(`共享目录里的字体样式表改了 ${fixed} 个`);
if (missing.length) {
  console.log(`还有 ${missing.length} 条字体地址指不到：`);
  for (const b of missing.slice(0, 20)) console.log('  - ' + b);
}
