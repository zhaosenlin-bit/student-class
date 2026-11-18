#!/usr/bin/env node
/*
 * 把课件里写死的相对地址改成本地真正有的那份。
 *
 * 有几门物理仿真课在自己的页面里写着 "textures/xxx.png"，那是原来
 * 那台服务器上的相对写法；本地把资源统一放在共用库的 vendor 目录里，
 * 于是浏览器去 /courseware/textures/ 找，当然找不到。
 *
 *   node tools/fix-relative-assets.mjs          # 查
 *   node tools/fix-relative-assets.mjs --fix    # 改
 */
import fs from 'node:fs';
import path from 'node:path';

const CW = 'mirror/leqixiang/courseware';
const SHARED = 'mirror/leqixiang/_shared-ext';

/* 课件里写死的相对写法，和它们该去哪里。 */
const RULES = [
  { from: 'textures/', to: '/api/program-assets/ID/_ext/vendor/Phyc240/textures/' },
  { from: 'models/', to: '/api/program-assets/ID/_ext/vendor/Phyc240/models/' },
  { from: 'pictures/', to: '/api/program-assets/ID/_ext/vendor/Phyc240/pictures/' },
  { from: 'video/', to: '/api/program-assets/ID/_ext/vendor/Phyc240/video/' },
];

const fix = process.argv.includes('--fix');
const files = fs.readdirSync(CW).filter((n) => n.endsWith('.html'));
let changed = 0;
let hits = 0;

for (const name of files) {
  const file = path.join(CW, name);
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  const id = name.replace(/\.html$/, '');
  let out = text;
  let touched = 0;
  for (const rule of RULES) {
    const re = new RegExp('(["\'(])' + rule.from, 'g');
    let m;
    while ((m = re.exec(text))) {
      const tail = text.slice(m.index + m[0].length).split(/["')]/)[0];
      const local = path.join(SHARED, 'vendor', 'Phyc240', rule.from, tail);
      if (!fs.existsSync(local)) continue;
      touched++;
    }
    if (touched) {
      out = out.split('"' + rule.from).join('"' + rule.to.replace('ID', id));
      out = out.split("'" + rule.from).join("'" + rule.to.replace('ID', id));
      out = out.split('(' + rule.from).join('(' + rule.to.replace('ID', id));
    }
  }
  if (out !== text) {
    hits++;
    console.log((fix ? '改了 ' : '要改 ') + name);
    if (fix) fs.writeFileSync(file, out);
    changed++;
  }
}
console.log((fix ? '改了 ' : '要改 ') + changed + ' 门课件');
