#!/usr/bin/env node
/*
 * 把课件首页里点了走不通的链接改到真的地方去。
 *
 * 课件页面里写着 <base>，链接是按它算的；有几页写链接时少算了一层
 * 或者多算了一层，于是"回到目录"这类按钮点了没反应。这里只按
 * 写好的表逐条改，不做猜测，改完再确认目标文件确实在。
 *
 * 只改链接和与之紧挨着的文字，不动页面内容。
 *
   node tools/fix-course-links.mjs --root dist            # 改
   node tools/fix-course-links.mjs --root dist --dry      # 只看会改什么
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildIndex, pageBase, posix } from './lq-refs.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const ROOT = path.resolve(arg('root', path.join(HERE, '..', 'dist')));
const DRY = args.includes('--dry');

const index = buildIndex(ROOT);
const lessons = path.join(ROOT, 'courseware');

/*
 * 改法一张表，每行写清楚：在哪种基准下、原来写的是什么、改成什么。
 *
 *   ['base=./', '原来的 href', '新的 href', '新的链接文字（不给就照旧）']
 *
 * 新地址是按页面自己的 <base> 算的相对地址：
 *   base = ./         页面在 courseware/<id>/index.html
 *   base = ./assets/  页面声明素材都在 assets 目录下
 */
const RULES = [
  /* 回到站点目录页：按各自的基准往上退到根。 */
  ['base=./', '../index.html', '../../index.html'],
  ['base=./assets/', 'index.html', '../../../index.html'],
  ['base=./assets/', './index.html', '../../../index.html'],
  ['base=./assets/', '../../index.html', '../../../index.html'],

  /* 专利说明页没有，改到站点的许可与署名页，文字也跟着改。 */
  ['base=./assets/', '../patent.html', '../../../license.html', '许可与署名'],

  /* 这三门课只剩下实验报告原件，缩略图改指到报告本身。 */
  ['base=./assets/', 'seesaw.html', '_ext/vendor/Phyc140/labs/balancing_act_lab.pdf'],
  ['base=./assets/', 'gravity_force.html', '_ext/vendor/Phyc140/labs/gravitational_force_lab.pdf'],
  ['base=./assets/', 'pressure_fluid_lab.html', '_ext/vendor/Phyc140/labs/pressure_fluid_lab.pdf'],
];

/* 链接文字里可能夹着图片，所以正文放宽；但不许跨过下一个 <a>。 */
const LINK = /(<a\b[^>]*\bhref\s*=\s*)(["'])([^"']*)\2([^>]*>)((?:(?!<a\b)[\s\S]){0,600}?)(<\/a>)/gi;

let patched = 0;
const notes = [];
const skipped = [];

for (const id of fs.readdirSync(lessons)) {
  const file = path.join(lessons, id, 'index.html');
  if (!fs.existsSync(file)) continue;
  let text = fs.readFileSync(file, 'utf8');
  const base = pageBase('courseware/' + id, text);
  const baseTag = /<base\b[^>]*href\s*=\s*["']([^"']*)["']/i.exec(text);
  const baseKey = 'base=' + (baseTag ? baseTag[1] : './');

  const jobs = [];
  LINK.lastIndex = 0;
  let m;
  while ((m = LINK.exec(text))) {
    const href = m[3].trim();
    if (!href) continue;
    /* 模板占位符是脚本拼出来的，不是真的链接。 */
    if (/[{}]/.test(href)) continue;
    if (/^(?:[a-z][a-z0-9+.\-]*:|\/\/|#|javascript:|mailto:|\/)/i.test(href)) continue;

    const bare = href.split('#')[0].split('?')[0];
    if (!bare) continue;
    if (index.exact.has(posix.normalize(posix.join(base, bare)))) continue;

    const rule = RULES.find((r) => r[0] === baseKey && r[1] === href);
    if (!rule) {
      skipped.push(id + '  ' + href);
      continue;
    }
    const to = rule[2];
    if (!index.exact.has(posix.normalize(posix.join(base, to)))) {
      skipped.push(id + '  ' + href + '  (目标不存在，不改)');
      continue;
    }
    jobs.push({ m, href, to, label: rule[3] });
  }
  if (!jobs.length) continue;

  /* 从后往前替换，免得位置跑偏。 */
  jobs.sort((a, b) => b.m.index - a.m.index);
  for (const j of jobs) {
    const [whole, pre, q, , mid, body, end] = j.m;
    let newBody = body;
    if (j.label) newBody = j.label;
    const rebuilt = pre + q + j.to + q + mid + newBody + end;
    text = text.slice(0, j.m.index) + rebuilt + text.slice(j.m.index + whole.length);
    patched++;
    notes.push(id + '  ' + j.href + '  ->  ' + j.to);
  }
  if (!DRY) fs.writeFileSync(file, text);
}

console.log(DRY ? '会改 ' + patched + ' 处' : '改了 ' + patched + ' 处');
for (const n of notes) console.log('  ' + n);
if (skipped.length) {
  console.log('\n没动、还在的：');
  for (const s of [...new Set(skipped)]) console.log('  ' + s);
}
