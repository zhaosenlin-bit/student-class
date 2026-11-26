#!/usr/bin/env node
/*
 * 把清单里的地址收拾干净。
 *
 * 有些课件在清单里写的是 "assets/models//Boat.fbx" 这样带两个斜杠的
 * 路径。网页服务器会把两个斜杠当成一个，这个项目放在对象存储上时
 * 不行——存储认的是每个字，课件一打开就会少文件，下载也会缺东西。
 *
 *   node tools/fix-path-slashes.mjs --root dist
 *
 * 改之前先看每个地址在磁盘上是不是真的在它该在的地方，对不上的就不动。
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
const flag = (name) => args.includes(`--${name}`);

const ROOT = path.resolve(arg('root', path.join(HERE, '..', 'dist')));
const DRY = flag('dry');

const flat = (s) => String(s).replace(/\/{2,}/g, '/');

const coursesDir = path.join(ROOT, 'courseware');
const ids = fs.readdirSync(coursesDir);
let touched = 0;
let entriesFixed = 0;
const problems = [];

for (const id of ids) {
  const file = path.join(coursesDir, id, 'download.json');
  if (!fs.existsSync(file)) continue;
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  const entries = manifest.entries || [];

  /* 先看看哪些地址要改，改完的地址在磁盘上都得有东西。 */
  const plan = [];
  for (const [name, from] of entries) {
    const nextName = flat(name);
    const nextFrom = flat(from);
    if (nextName === name && nextFrom === from) {
      plan.push(null);
      continue;
    }
    const target = path.resolve(path.join(coursesDir, id), nextFrom);
    if (!fs.existsSync(target)) {
      problems.push(`${id}  ${from}  磁盘上没有`);
      plan.push(null);
      continue;
    }
    plan.push([nextName, nextFrom]);
  }

  /* 名字一样的只留一条。 */
  const seen = new Map();
  const out = [];
  let changed = 0;
  for (let i = 0; i < entries.length; i++) {
    const entry = plan[i] || entries[i];
    const key = entry[0];
    if (seen.has(key)) {
      const before = seen.get(key);
      if (before[1] !== entry[1]) problems.push(`${id}  ${key}  指向两个地方`);
      changed++;
      continue;
    }
    if (entry[0] !== entries[i][0] || entry[1] !== entries[i][1]) changed++;
    seen.set(key, entry);
    out.push(entry);
  }

  if (!changed) continue;
  if (!DRY) {
    manifest.entries = out;
    fs.writeFileSync(file, JSON.stringify(manifest));
  }
  touched++;
  entriesFixed += changed;
}

console.log(DRY ? '（只看不改）' : '');
console.log(`清单 ${ids.length} 份，改了 ${touched} 份，收掉 ${entriesFixed} 条重复或带双斜杠的地址`);
if (problems.length) {
  console.log(`对不上的 ${problems.length} 处：`);
  for (const p of problems.slice(0, 20)) console.log('   ' + p);
}
