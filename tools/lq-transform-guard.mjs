#!/usr/bin/env node
/*
 * 折纸这一组课件里有一处会踩空的地方。
 *
 * 画面上的位置换算放在 transform 里，这个东西是画布量好大小之后才算
 * 出来的。画布刚摆上去、还没量好的时候，鼠标若恰好落在上面，换算就用
 * 了一个还没有的值，浏览器当场报错，课件就白屏了。平时看不出来，
 * 一次开好几门课的时候容易撞上。
 *
 * 这个工具给换算加一道门：还没有值的时候就用画布自己的位置顶上，
 * 等量好了自然又是原来的样子。
 *
 *   node tools/lq-transform-guard.mjs --root dist/courseware
 *   node tools/lq-transform-guard.mjs --root mirror/leqixiang/courseware
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const ROOTS = String(arg('root', path.join(HERE, '..', 'dist', 'courseware')))
  .split(',')
  .map((p) => path.resolve(p.trim()))
  .filter(Boolean);
const DRY = args.includes('--dry');

const LOCAL_FROM =
  'function local(e){const r=P.canvas.getBoundingClientRect(),t=P.trans;return{';
const LOCAL_TO =
  'function local(e){const r=P.canvas.getBoundingClientRect(),t=P.trans;if(!t)return{x:0,y:0,screenX:e.clientX-r.left,screenY:e.clientY-r.top};return{';
const PROJECT_FROM =
  'function project(x,y){const r=P.canvas.getBoundingClientRect(),t=P.trans;return{';
const PROJECT_TO =
  'function project(x,y){const r=P.canvas.getBoundingClientRect(),t=P.trans;if(!t)return{x:r.left,y:r.top};return{';

let patched = 0;
let already = 0;

for (const root of ROOTS) {
  if (!fs.existsSync(root)) {
    console.error('没有找到：' + root);
    continue;
  }
  const files = [];
  (function walk(dir) {
    for (const it of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, it.name);
      if (it.isDirectory()) walk(p);
      else if (/\.html?$/.test(it.name)) files.push(p);
    }
  })(root);

  for (const file of files) {
    let text = fs.readFileSync(file, 'utf8');
    if (!text.includes(LOCAL_FROM) && !text.includes(PROJECT_FROM)) continue;
    let next = text;
    if (next.includes(LOCAL_FROM)) next = next.split(LOCAL_FROM).join(LOCAL_TO);
    if (next.includes(PROJECT_FROM)) next = next.split(PROJECT_FROM).join(PROJECT_TO);
    if (next === text) {
      already++;
      continue;
    }
    if (!DRY) fs.writeFileSync(file, next);
    patched++;
    console.log((DRY ? '会补 ' : '补上 ') + path.relative(root, file));
  }
}

console.log(`\n补了 ${patched} 个文件，已经补过的 ${already} 个。`);
