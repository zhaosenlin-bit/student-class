#!/usr/bin/env node
/*
 * 把空目录去掉。
 *
 * 出包的时候，每门课的 assets 底下都会按「地址对照表」建出一层
 * 目录——表上列了某个站点，就给它建一个同名目录。有的站点其实
 * 一张图都没取到，目录就空着留在那里。
 *
 * 空的目录既不占地方（存文件的地方才占），也不进对象存储，可它在
 * 打包的时候要跟着走，整理出来的成品看着也毛糙。
 *
 *   node tools/prune-empty-dirs.mjs --root dist --check
 *   node tools/prune-empty-dirs.mjs --root dist --fix
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const arg = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const ROOT = path.resolve(arg('root', 'dist'));
const FIX = args.includes('--fix');

/* 从最深的一层往上走；下面的空了，上面的才可能空。 */
function dirs(root) {
  const out = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let names = [];
    try {
      names = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const n of names) {
      if (n.isDirectory()) out.push(path.join(dir, n.name));
    }
    for (const n of names) {
      if (n.isDirectory()) stack.push(path.join(dir, n.name));
    }
  }
  return out.sort((a, b) => b.length - a.length);
}

let gone = 0;
for (const dir of dirs(ROOT)) {
  let names = [];
  try {
    names = fs.readdirSync(dir);
  } catch {
    continue;
  }
  if (names.length) continue;
  if (FIX) {
    try {
      fs.rmdirSync(dir);
    } catch {
      continue;
    }
  }
  gone++;
}

console.log(`${FIX ? '去掉' : '可以去掉'} ${gone} 个空目录（${ROOT}）。`);
