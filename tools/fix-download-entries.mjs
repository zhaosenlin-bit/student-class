#!/usr/bin/env node
/*
 * 把每一门课件的下载清单摆正。
 *
 * 下载是把清单上的文件一份一份取回来、再在浏览器里打包成 zip。
 * 清单里每一行是 [包里的名字, 取货的地方]。两个地方都得对：
 *
 *   - 取货的地方要真的存在，不然打出来的是一份空壳（浏览器不报错，
 *     403 的错误页会被当成文件内容收进去）；
 *   - 包里的名字要是一条干净的相对路径：不能带反斜杠，不能往回跑，
 *     不能重名。页面在压缩包里找的是「包里的名字」，名字摆错了，
 *     解开以后课件就缺东西。
 *
 * 素材是收拢过的：同一份文件放在共享目录里，各门课从那儿取。
 * 取货的地方可以指向共享目录，但包里的名字要落在课件自己的目录里。
 *
 *   node tools/fix-download-entries.mjs --root dist
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
const COURSES = path.join(ROOT, 'courseware');

let changed = 0;
let names = 0;
let sources = 0;
let dupes = 0;
const problems = [];

for (const id of fs.readdirSync(COURSES)) {
  const file = path.join(COURSES, id, 'download.json');
  if (!fs.existsSync(file)) continue;
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    problems.push(`${id}  download.json 读不出来：${e.message}`);
    continue;
  }
  if (!Array.isArray(data.entries)) continue;

  const byName = new Map();
  let touched = false;

  for (const entry of data.entries) {
    const rawName = String(entry[0] ?? '');
    const rawFrom = String(entry[1] ?? '');

    /* 反斜杠是 Windows 留下的，浏览器当不了目录分隔符。 */
    let name = rawName.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\.\//, '');

    /*
     * 包里的名字不能往回跑。共享目录里的东西，包里的名字要落在
     * 课件自己的目录里；课件那儿已经有一份的，就用自己那份。
     */
    const back = /^(?:\.\.\/)+shared\/(.+)$/.exec(name);
    if (back) {
      const tail = back[1];
      const at = tail.indexOf('assets/');
      name = at >= 0 ? tail.slice(at) : 'assets/_ext/' + tail;
    }

    let from = rawFrom;
    /* 取货的地方指到自己目录里的，就用自己目录里那份。 */
    const local = path.resolve(COURSES, id, name);
    if (from && !fs.existsSync(path.resolve(COURSES, id, from)) && fs.existsSync(local)) {
      from = name;
    }

    if (name !== rawName) {
      names++;
      touched = true;
    }
    if (from !== rawFrom) {
      sources++;
      touched = true;
    }

    const prev = byName.get(name);
    if (prev) {
      /* 重名的留一份：自己目录里的那份优先。 */
      dupes++;
      touched = true;
      const prevLocal = !prev[1].startsWith('../');
      const nowLocal = !from.startsWith('../');
      if (nowLocal && !prevLocal) byName.set(name, [name, from]);
      continue;
    }
    byName.set(name, [name, from]);
  }

  /* 取货的地方必须真的在 */
  for (const [name, from] of byName.values()) {
    if (!from) continue;
    if (!fs.existsSync(path.resolve(COURSES, id, from))) {
      problems.push(`${id}  取不到：${from}`);
    }
  }

  if (touched) {
    changed++;
    data.entries = [...byName.values()];
    fs.writeFileSync(file, JSON.stringify(data));
  }
}

console.log(
  `下载清单改了 ${changed} 门：名字摆正 ${names} 处，取货地方换成本地 ${sources} 处，重名去掉 ${dupes} 处`
);
if (problems.length) {
  console.log(`还有 ${problems.length} 处取不到：`);
  for (const p of problems.slice(0, 20)) console.log('  - ' + p);
}
