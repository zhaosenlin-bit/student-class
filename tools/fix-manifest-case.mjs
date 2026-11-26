#!/usr/bin/env node
/*
 * 把下载清单里的名字改成磁盘上真正的那一个。
 *
 * 清单里写的是课件自己的位置：../../shared/assets/Audio/x.mp3 这样的
 * 绕出去再绕回来的路子。在 Windows 上这样找得到，在对象存储上找不到——
 * 那里的大小写是分明的，Audio 和 audio 是两个地方。
 *
 * 这个工具按磁盘上真的有的名字把清单摆正：找的时候不挑大小写，
 * 找到之后照着真的那个名字写回去。
 *
 *   node tools/fix-manifest-case.mjs --root dist
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
const ROOT = path.resolve(arg('root', path.join(HERE, '..', 'dist')));
const DRY = args.includes('--dry');

if (!fs.existsSync(ROOT)) {
  console.error('没有找到课件的成品：' + ROOT);
  process.exit(1);
}

/* 站点里每一个文件，按真的名字记一份，再按不挑大小写的记一份。 */
const exact = new Set();
const loose = new Map();
(function walk(dir, rel = '') {
  for (const it of fs.readdirSync(dir, { withFileTypes: true })) {
    const r = rel ? rel + '/' + it.name : it.name;
    const abs = path.join(dir, it.name);
    if (it.isDirectory()) walk(abs, r);
    else {
      exact.add(r);
      const key = r.toLowerCase();
      if (!loose.has(key)) loose.set(key, r);
    }
  }
})(ROOT);

const courses = path.join(ROOT, 'courseware');
let fixed = 0;
let missing = 0;
const unresolved = [];

for (const id of fs.readdirSync(courses)) {
  const manifestPath = path.join(courses, id, 'download.json');
  if (!fs.existsSync(manifestPath)) continue;
  let data;
  try {
    data = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch {
    continue;
  }
  if (!Array.isArray(data.entries)) continue;
  let touched = false;
  for (const entry of data.entries) {
    if (!Array.isArray(entry) || typeof entry[1] !== 'string') continue;
    const raw = entry[1].split('#')[0].split('?')[0].replace(/\\/g, '/');
    const target = path.posix.normalize('courseware/' + id + '/' + raw);
    if (exact.has(target)) continue;
    /*
     * 名字写错了大小写的时候，真正在的那个地方就在它的上一级里，
     * 名字是上一级的名字。两种都试一遍。
     */
    let real = loose.get(target.toLowerCase());
    if (!real) {
      const dir = path.posix.dirname(target);
      const trimmed = path.posix.join(path.posix.dirname(dir), path.posix.basename(dir));
      real = loose.get(trimmed.toLowerCase());
      if (real && trimmed !== target) {
        entry[1] = path.posix.relative('courseware/' + id, real) + entry[1].slice(raw.length);
        touched = true;
        fixed++;
        continue;
      }
    }
    if (!real) {
      missing++;
      unresolved.push(`${id} ${raw}`);
      continue;
    }
    /* 真的那个文件在站点里的位置，换成从课件出发怎么走。 */
    const back = path.posix.relative('courseware/' + id, real);
    const next = back;
    if (next !== raw) {
      entry[1] = next + entry[1].slice(raw.length);
      touched = true;
      fixed++;
    }
  }
  if (touched && !DRY) fs.writeFileSync(manifestPath, JSON.stringify(data));
}

console.log(DRY ? `会改 ${fixed} 处` : `改了 ${fixed} 处`);
if (unresolved.length) {
  console.log(`还有 ${missing} 处清单里的东西找不到：`);
  for (const u of unresolved.slice(0, 20)) console.log('  ' + u);
}
