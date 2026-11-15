#!/usr/bin/env node
/*
 * 把本地模式守卫接进已生成的站点外壳。
 *
 * build-leqixiang.mjs 生成外壳时会顺手插这一行；但如果只是想在
 * 已经跑起来的站点上补上它（不必重建、不必清空 courseware），
 * 就跑这个脚本 —— 它只做一次字符串插入，不碰任何课件文件。
 *
 *   node tools\wire-lq-mode.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'mirror', 'leqixiang', 'site', 'index.html');
const SRC = path.join(ROOT, 'tools', 'lq-mode.js');
const DST = path.join(ROOT, 'mirror', 'leqixiang', 'site', 'lq-mode.js');

const ANCHOR = '<script type="module" src="/app.js';
const TAG = '<script src="/lq-mode.js?v=1"></script>';

if (!fs.existsSync(INDEX)) {
  console.error('找不到站点外壳，先跑 node tools\\build-leqixiang.mjs');
  process.exit(1);
}

fs.copyFileSync(SRC, DST);

let html = fs.readFileSync(INDEX, 'utf8');
if (html.includes('/lq-mode.js')) {
  console.log('外壳已经接过 lq-mode.js，只刷新了脚本本身。');
} else if (!html.includes(ANCHOR)) {
  console.error('外壳结构变了，找不到 app.js 的挂载点，手动加一行 lq-mode.js。');
  process.exit(1);
} else {
  html = html.replace(ANCHOR, TAG + ANCHOR);
  fs.writeFileSync(INDEX, html, 'utf8');
  console.log('已把 lq-mode.js 接到 app.js 之前。');
}

