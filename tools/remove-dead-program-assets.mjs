#!/usr/bin/env node
/*
 * 扫掉抓取时留下的、谁都没用过的「程序入口」文件。
 *
 * 抓课件的时候，平台的一个入口地址会被当成普通素材存下来，存到
 * 每门课的 assets/api/program-assets/<编号> 下面。那个文件里是一句
 * 「正在加载程序」，外加一个跳转地址和一枚令牌。
 *
 * 课件本身从来没有去用它——它只是抓的时候顺手存下来的。留着没有
 * 好处：文件里带着别处的地址，白白占着下载清单，还让人以为这个
 * 库是照着别处的接口做出来的。
 *
 * 这里先确认「真的没有课件用它」，确认不了就不动；确认得了就删掉，
 * 连下载清单里那一行一起去掉。
 *
 *   node tools/remove-dead-program-assets.mjs --check
 *   node tools/remove-dead-program-assets.mjs --fix
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const args = process.argv.slice(2);
const has = (n) => args.includes('--' + n);

const TEXT = /\.(html|js|mjs|css|json)$/i;
/* 这个地址的形状：/api/program-assets/<编号>。 */
const PLATFORM_PATH = /api\/program-assets\//;

const removed = [];
const skipped = [];

/* 一门课里，除了那个遗留文件本身，还有没有别的地方提到它。 */
function referencedElsewhere(paths, strayDir, needle) {
  const stack = [...paths];
  while (stack.length) {
    const dir = stack.pop();
    /* 清单里的东西也可能是单个页面，那也是一个要看的地方。 */
    let stat = null;
    try {
      stat = fs.statSync(dir);
    } catch {
      continue;
    }
    if (stat.isFile()) {
      if (!TEXT.test(dir)) continue;
      let text = '';
      try {
        text = fs.readFileSync(dir, 'utf8');
      } catch {
        continue;
      }
      if (text.includes(needle)) return dir;
      continue;
    }
    let names = [];
    try {
      names = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const n of names) {
      const full = path.join(dir, n.name);
      if (n.isDirectory()) {
        /* 遗留文件自己那一层不算引用。 */
        if (full === strayDir) continue;
        stack.push(full);
        continue;
      }
      if (!TEXT.test(n.name)) continue;
      /* 下载清单是清单，不是课件本身——它那一行本来就是要删掉的。 */
      if (n.name === 'download.json') continue;
      let text = '';
      try {
        text = fs.readFileSync(full, 'utf8');
      } catch {
        continue;
      }
      if (text.includes(needle)) return path.relative(courseDir, full).split(path.sep).join('/');
    }
  }
  return null;
}

/* 空了的目录一层层去掉。 */
function pruneEmpty(dir) {
  let cur = dir;
  while (cur && cur.startsWith(ROOT)) {
    let rest;
    try {
      rest = fs.readdirSync(cur);
    } catch {
      return;
    }
    if (rest.length) return;
    try {
      fs.rmdirSync(cur);
    } catch {
      return;
    }
    cur = path.dirname(cur);
  }
}

/* 一处：<课程目录>/assets/api/program-assets/<编号>
   素材里的放法少一层：<课程目录>/api/program-assets/<编号>。 */
function sweep(courseDir, extraDirs = []) {
  const strays = [
    path.join(courseDir, 'assets', 'api', 'program-assets'),
    path.join(courseDir, 'api', 'program-assets'),
  ].filter((p) => fs.existsSync(p));
  for (const stray of strays) sweepOne(courseDir, stray, extraDirs);
}

function sweepOne(courseDir, stray, extraDirs) {
  const dirs = [courseDir, ...extraDirs];
  let names = [];
  try {
    names = fs.readdirSync(stray, { withFileTypes: true });
  } catch {
    return;
  }
  for (const n of names) {
    if (!n.isFile()) continue;
    const file = path.join(stray, n.name);
    /* 要找的是「有人指名要这一个文件」，不是「有人提到同一类地址」。 */
    const needle = 'api/program-assets/' + n.name;
    const used = referencedElsewhere(dirs, stray, needle);
    if (used) {
      skipped.push(`${path.relative(ROOT, file)}  被 ${used} 用着，不动`);
      continue;
    }
    const rel = path.relative(courseDir, file).split(path.sep).join('/');
    removed.push(path.relative(ROOT, file));
    if (!has('fix')) continue;
    fs.rmSync(file, { force: true });
    pruneEmpty(stray);

    /* 下载清单里那一行也去掉。 */
    const dl = path.join(courseDir, 'download.json');
    if (fs.existsSync(dl)) {
      const meta = JSON.parse(fs.readFileSync(dl, 'utf8'));
      const before = (meta.entries || []).length;
      meta.entries = (meta.entries || []).filter((e) => e[0] !== rel);
      if (meta.entries.length !== before) {
        fs.writeFileSync(dl, JSON.stringify(meta), 'utf8');
      }
    }
  }
}

/* 成品里的课。 */
const distCourses = path.join(ROOT, 'dist', 'courseware');
if (fs.existsSync(distCourses)) {
  for (const id of fs.readdirSync(distCourses)) sweep(path.join(distCourses, id));
}

/* 素材里的课（两种放法）。课目的那一页和素材是并排放的，一块看。 */
for (const base of [
  path.join(ROOT, 'mirror', 'leqixiang', 'courseware'),
  path.join(ROOT, 'mirror', 'studio', 'courseware'),
]) {
  if (!fs.existsSync(base)) continue;
  for (const name of fs.readdirSync(base)) {
    if (!name.endsWith('.assets')) continue;
    const dir = path.join(base, name);
    const page = path.join(base, name.replace(/\.assets$/, '.html'));
    sweep(dir, fs.existsSync(page) ? [page] : []);
  }
}

for (const r of removed) console.log(`${has('fix') ? '删掉' : '会删'}  ${r}`);
for (const s of skipped) console.log(`  留着  ${s}`);
console.log('');
console.log(`${removed.length} 个遗留文件${has('fix') ? '已删' : '待删'}，${skipped.length} 个留着。`);
