#!/usr/bin/env node
/*
 * 把指向不存在的课件的内链改到真正存在的那一门。
 *
 * 这些物理课件大多带着一份"这份内容在别处的地址"（canonical / og:url），
 * 写的是作者那边的旧编号，而本地的编号多了一个前缀或者换了个写法。
 * 点过去就是一个 404，搜索引擎和分享卡片也会指错地方。
 *
 * 改法分三种：
 *   - 那种"我在别处的地址"（canonical / og:url）：改成这一门自己的地址，
 *     因为它指的就是本页。
 *   - "回到首页"的按钮（lab-course-simulation）：那门课本地根本没有，改成乐启享
 *     的首页（/），按钮照样能回目录。
 *   - 其余的按钮：指向本门自己。
 *
 *   node tools/fix-dead-course-links.mjs          # 查
 *   node tools/fix-dead-course-links.mjs --fix    # 改
 */
import fs from 'node:fs';
import path from 'node:path';

const CW = 'mirror/leqixiang/courseware';
const fix = process.argv.includes('--fix');

const local = new Set(
  fs
    .readdirSync(CW)
    .filter((n) => n.endsWith('.html'))
    .map((n) => n.replace(/\.html$/, ''))
);

/*
 * The name each family gives a lesson on its own site, and the name the
 * library gives it.  A button written for the family's own site has to be
 * given the library's name, or it points at nothing.
 */
const FAMILIES = [
  { dir: 'mirror/studio/courseware', lib: 'lq-' },
  { dir: 'mirror/lab-explore/courseware', lib: 'lab-explore-' },
  { dir: 'mirror/lab-physics/courseware', lib: 'lab-physics-' },
  { dir: 'mirror/lab-process/courseware', lib: 'lab-process-' },
  { dir: 'mirror/lab-reaction/courseware', lib: 'lab-reaction-' },
  { dir: 'mirror/lab-virtual/courseware', lib: 'lab-virtual-' },
  { dir: 'mirror/lab-course/courseware', lib: 'lab-course-' },
  { dir: 'mirror/library/courseware', lib: '' }
];

/* The library's name for a lesson of a family, and the other names it is known by. */
const familyNames = new Map();
for (const f of FAMILIES) {
  if (!fs.existsSync(f.dir)) continue;
  const map = new Map();
  for (const name of fs.readdirSync(f.dir).filter((n) => n.endsWith('.html'))) {
    const bare = name.replace(/\.html$/, '');
    const id = f.lib + (f.strip ? bare.replace(new RegExp('^' + f.strip), '') : bare);
    map.set(bare, id);
    map.set(id, id);
    if (f.strip) map.set(bare.replace(new RegExp('^' + f.strip), ''), id);
  }
  familyNames.set(f.dir, map);
}

/* The tag a match sits in: the last "<" before it, the first ">" after it. */
function enclosingTag(text, index) {
  const a = text.lastIndexOf('<', index);
  const b = text.indexOf('>', index);
  return text.slice(a, b + 1);
}

const LINK = /(\/courseware\/)([A-Za-z0-9_\-]+)(\?local=1)?/g;

let touched = 0;
let fixed = 0;
const notes = [];

function repairDir(dir, label) {
  if (!fs.existsSync(dir)) return;
  const names = familyNames.get(dir) || new Map();
  for (const name of fs.readdirSync(dir).filter((n) => n.endsWith('.html'))) {
    const file = path.join(dir, name);
    const bare = name.replace(/\.html$/, '');
    /* The library's name for this lesson: how a button has to call it. */
    const own = names.get(bare) || bare;
    let text;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }

    const logged = new Set();
    const out = text.replace(LINK, (m, prefix, id, query, at) => {
      /* The name already used in the library: nothing to do. */
      if (local.has(id)) return m;

      /* A name of the family's own site: give it the library's name. */
      const viaFamily = names.get(id);
      if (viaFamily && local.has(viaFamily)) {
        fixed++;
        if (!logged.has(id + viaFamily)) {
          logged.add(id + viaFamily);
          notes.push(`  ${id} -> ${viaFamily}   改用库内名字   [${label}] ${name}`);
        }
        return prefix + viaFamily + (query || '');
      }

      const tag = enclosingTag(text, at);
      const isCanonical = /rel=["']canonical["']/.test(tag);
      const isOg = /property=["']og:url["']/.test(tag);

      let to;
      let why;
      if (isCanonical || isOg) {
        to = own;
        why = '地址标错，改成本门';
      } else if (id === 'lab-course-simulation') {
        to = '';
        why = '回首页';
      } else {
        to = own;
        why = '按钮指向本门';
      }
      fixed++;
      if (!logged.has(id + why)) {
        logged.add(id + why);
        notes.push(`  ${id} -> ${to || '/'}   ${why}   [${label}] ${name}`);
      }
      return to ? prefix + to + (query || '') : '/';
    });

    if (out !== text) {
      touched++;
      if (fix) fs.writeFileSync(file, out);
    }
  }
}

for (const f of FAMILIES) repairDir(f.dir, '来源');
repairDir(CW, '乐启享');

for (const n of notes) console.log(n);
console.log(`\n改了 ${touched} 门课件；共 ${fixed} 处`);
