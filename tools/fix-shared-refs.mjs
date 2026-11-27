#!/usr/bin/env node
/*
 * 把课件里"按页面的基准算、却算出了课件目录之外"的地址改回来。
 *
 * 课件的页面会写 <base href="./assets/">，于是页面里的地址都从
 * assets/ 那一层起算。脚本里有些地址是照着"打开课件那个页面"算的：
 *
 *     new Audio('../Audio/cheer.mp3')
 *
 * 这一句按页面算，得到的是 courseware/<课>/Audio/cheer.mp3。
 *
 * 有些脚本里的地址是照着"脚本自己站在哪儿"算的：
 *
 *     import * as THREE from '../../../shared/assets/jsm/three.module.js'
 *
 * 这一句按脚本自己算，得到的是 shared/assets/jsm/three.module.js。
 *
 * 收拢素材的时候，这两种混在一起改写过。改对了的没有问题；
 * 改错的那一种，浏览器会去站点外面找文件，找不到，
 * 那个声音、那张图、那个模块就静悄悄地没了。
 *
 * 这个工具把改错的那一种找出来，按脚本自己站的位置解开，
 * 看看指的是哪个文件，再按页面的基准重新写一遍。
 *
 *   node tools/fix-shared-refs.mjs --root dist
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const DIST = path.resolve(arg('root', path.join(ROOT, 'dist')));
const DRY = args.includes('--dry');

if (!fs.existsSync(DIST)) {
  console.error(`找不到成品目录：${DIST}`);
  process.exit(2);
}

const COURSE = path.join(DIST, 'courseware');

/* 这些写法，浏览器是按打开课件那个页面的基准算的。 */
const DOC_BASED = [
  [/\bnew\s+(?:Audio|Video|Image|Worker|SharedWorker)\s*\(\s*(["'])([^"']{1,400})\1/g, 2],
  [/\bnew\s+URL\s*\(\s*(["'])([^"']{1,400})\1\s*,\s*(?:window\.)?document\.baseURI/g, 2],
  [/\bfetch\s*\(\s*(["'])([^"']{1,400})\1/g, 2],
  [/\.(?:src|href)\s*=\s*(["'])([^"']{1,400})\1/g, 2],
  [
    /\.\s*setAttribute\s*\(\s*(["'])(?:src|href|data-src)["']\s*,\s*(["'])([^"']{1,400})\2/g,
    3,
  ],
];

const SCRIPT = /\.(?:js|mjs|cjs)$/i;

/* 两个地方之间怎么走。 */
function relativeTo(from, to) {
  const a = from.replace(/\/+$/, '').split(path.sep);
  const b = to.replace(/\/+$/, '').split(path.sep);
  let i = 0;
  while (i < a.length - 1 && i < b.length - 1 && a[i] === b[i]) i += 1;
  const up = a.slice(i).map(() => '..');
  const rel = [...up, ...b.slice(i)].join('/');
  return rel.startsWith('.') ? rel : `./${rel}`;
}

const walk = (dir, acc = []) => {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
};

let fixedFiles = 0;
let fixedRefs = 0;
const unresolved = [];

for (const id of fs.readdirSync(COURSE, { withFileTypes: true })) {
  if (!id.isDirectory()) continue;
  const lessonDir = path.join(COURSE, id.name);

  /* 打开课件的那个页面的基准。 */
  let pageBase = lessonDir;
  const indexFile = path.join(lessonDir, 'index.html');
  if (fs.existsSync(indexFile)) {
    const html = fs.readFileSync(indexFile, 'utf8');
    const m = /<base\b[^>]*\bhref\s*=\s*["']([^"']+)["']/i.exec(html);
    if (m) pageBase = path.resolve(lessonDir, m[1]);
  }

  for (const file of walk(lessonDir)) {
    if (!SCRIPT.test(file)) continue;
    let text;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    if (!text.includes('..')) continue;

    const ownDir = path.dirname(file);
    let changed = false;

    for (const [re, pick] of DOC_BASED) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text))) {
        const raw = m[pick];
        if (!raw || !raw.startsWith('..')) continue;
        const clean = raw.split('#')[0].split('?')[0];
        if (!clean) continue;

        /* 按页面的基准算，跑出成品目录了。 */
        const asPage = path.resolve(pageBase, clean);
        if (asPage.startsWith(DIST + path.sep) || asPage === DIST) continue;

        /* 按脚本自己站的位置解，看指的是哪个文件。 */
        const asOwn = path.resolve(ownDir, clean);
        if (!asOwn.startsWith(DIST + path.sep) || !fs.existsSync(asOwn)) {
          unresolved.push({
            id: id.name,
            file: path.relative(DIST, file),
            raw,
          });
          continue;
        }

        const tail = raw.slice(clean.length);
        const next = relativeTo(pageBase, asOwn) + tail;
        if (next === raw) continue;
        text = text.slice(0, m.index + m[0].indexOf(raw)) + next + text.slice(m.index + m[0].indexOf(raw) + raw.length);
        changed = true;
        fixedRefs += 1;
        re.lastIndex = m.index + next.length;
      }
    }

    if (changed) {
      fixedFiles += 1;
      if (!DRY) fs.writeFileSync(file, text);
      console.log(`  改 ${path.relative(DIST, file)}`);
    }
  }
}

console.log('');
console.log(`改好的地址：${fixedRefs} 处，动了 ${fixedFiles} 个文件。`);
if (unresolved.length) {
  console.log(`没找到对应文件的：${unresolved.length} 处`);
  for (const u of unresolved.slice(0, 20)) {
    console.log(`  ${u.id}  ${u.file}  ${u.raw}`);
  }
}
process.exitCode = unresolved.length ? 1 : 0;
