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
 *   - "回到首页"的按钮（lab-simulation）：那门课本地根本没有，改成乐启享
 *     的首页（/），按钮照样能回目录。
 *   - 其余的按钮：指向本门自己。
 *
 *   node tools/fix-dead-course-links.mjs          # 查
 *   node tools/fix-dead-course-links.mjs --fix    # 改
 */
import fs from 'node:fs';
import path from 'node:path';

const CW = 'mirror/leqixiang/courseware';
const CW_AFE = 'mirror/aifunengjiaoyu/courseware';
const fix = process.argv.includes('--fix');

const local = new Set(
  fs
    .readdirSync(CW)
    .filter((n) => n.endsWith('.html'))
    .map((n) => n.replace(/\.html$/, ''))
);

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
  for (const name of fs.readdirSync(dir).filter((n) => n.endsWith('.html'))) {
    const file = path.join(dir, name);
    const own = name.replace(/\.html$/, '');
    let text;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }

    const logged = new Set();
    const out = text.replace(LINK, (m, prefix, id, query, at) => {
      if (local.has(id)) return m;

      const tag = enclosingTag(text, at);
      const isCanonical = /rel=["']canonical["']/.test(tag);
      const isOg = /property=["']og:url["']/.test(tag);

      let to;
      let why;
      if (isCanonical || isOg) {
        to = own;
        why = '地址标错，改成本门';
      } else if (id === 'lab-simulation') {
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

repairDir(CW, '乐启享');
repairDir(CW_AFE, '来源');

for (const n of notes) console.log(n);
console.log(`\n改了 ${touched} 门课件；共 ${fixed} 处`);
