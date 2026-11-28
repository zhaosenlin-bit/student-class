#!/usr/bin/env node
/*
 * 查一遍每一门课件的下载清单。
 *
 * 下载是把清单上的文件一份一份取回来、再在浏览器里打包成 zip。
 * 清单里每一行是 [包里的名字, 取货的地方]。两个地方都得对：
 *
 *   - 取货的地方要真的存在，不然打包出来的是一份空壳（浏览器不报错，
 *     403 的错误页会被当成文件内容收进去）；
 *   - 包里的名字不能带 ..，也不能跑到课件目录外面去——解包的程序
 *     未必肯收这种名字，收下了也未必放对地方。
 *
 *   node tools/check-download-entries.mjs --root dist
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const ROOT = path.resolve(arg('root', path.join(HERE, '..', 'dist')));
const OUT = arg('out', '');

const coursesDir = path.join(ROOT, 'courseware');
const problems = [];
let courses = 0;
let entries = 0;

for (const id of fs.readdirSync(coursesDir)) {
  const manifest = path.join(coursesDir, id, 'download.json');
  if (!fs.existsSync(manifest)) continue;
  courses++;
  let data;
  try {
    data = JSON.parse(fs.readFileSync(manifest, 'utf8'));
  } catch (e) {
    problems.push({ id, why: 'download.json 读不出来：' + e.message });
    continue;
  }
  if (data.single) {
    const src = path.resolve(coursesDir, id, String(data.entries?.[0]?.[1] || ''));
    entries++;
    if (!fs.existsSync(src)) problems.push({ id, why: '单文件课件取不到：' + src });
    continue;
  }
  const seen = new Set();
  for (const entry of data.entries || []) {
    entries++;
    const name = String(entry[0] ?? '');
    const from = String(entry[1] ?? '');
    const src = path.resolve(coursesDir, id, from);
    if (!fs.existsSync(src)) {
      problems.push({ id, why: `取不到：${from}` });
      continue;
    }
    /*
     * 包里的名字要是一条干净的相对路径：不能往回跑，不能跑到
     * 课件目录外面去，也不能是绝对路径。
     */
    const clean = name.replace(/\\/g, '/');
    if (clean.startsWith('/') || /^[A-Za-z]:/.test(clean)) {
      problems.push({ id, why: `包里的名字是绝对路径：${name}` });
      continue;
    }
    const norm = path.posix.normalize(clean);
    if (norm.startsWith('../') || norm === '..') {
      problems.push({ id, why: `包里的名字往回跑了：${name}` });
      continue;
    }
    if (norm !== clean) {
      problems.push({ id, why: `包里的名字不干净：${name}` });
      continue;
    }
    if (seen.has(norm)) {
      problems.push({ id, why: `包里的名字重了：${name}` });
      continue;
    }
    seen.add(norm);
  }
}

console.log(`查了 ${courses} 门课件，${entries} 条下载清单`);
console.log(`有问题的：${problems.length} 处`);
const byCourse = new Map();
for (const p of problems) {
  if (!byCourse.has(p.id)) byCourse.set(p.id, []);
  byCourse.get(p.id).push(p.why);
}
console.log(`涉及 ${byCourse.size} 门课件`);
for (const [id, list] of [...byCourse].slice(0, 40)) {
  console.log(`  ${id}  ${list.length} 处  ${list[0]}`);
}
if (OUT) {
  fs.writeFileSync(OUT, JSON.stringify({ checkedAt: new Date().toISOString(), courses, entries, problems }, null, 1));
  console.log(`报告写入 ${OUT}`);
}
process.exit(problems.length ? 1 : 0);
