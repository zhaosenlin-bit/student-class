#!/usr/bin/env node
/*
 * 把下载清单里写坏的路径改回来。
 *
 * 清单里的地址是给浏览器去取的，必须是斜杠。抓取时有几条地址混进了
 * 反斜杠（Windows 的写法），还有几条多打了一个斜杠，浏览器按原样去取
 * 就取不到——打包出来的课件于是少几张图、少一段脚本。
 *
 * 这一份只改写法：反斜杠换成斜杠，重复的斜杠并成一个。改完以后再确认
 * 本地真的有这个文件；没有的话原样留着，别把地址改到别处去。
 *
 *   node tools/fix-download-paths.mjs --root dist --fix
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const SITE = path.resolve(ROOT, arg('root', 'dist'));
const FIX = args.includes('--fix');

function tidy(p) {
  return String(p).replace(/\\+/g, '/').replace(/\/{2,}/g, '/');
}

const courseDir = path.join(SITE, 'courseware');
const ids = fs
  .readdirSync(courseDir, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

let changedFiles = 0;
let changedEntries = 0;
const skipped = [];

for (const id of ids) {
  const manifestPath = path.join(courseDir, id, 'download.json');
  if (!fs.existsSync(manifestPath)) continue;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const list = manifest.entries || [];
  let touched = false;

  for (const entry of list) {
    const name = entry[0];
    const rel = entry[1];
    if (typeof rel !== 'string') continue;
    const cleanRel = tidy(rel);
    const cleanName = typeof name === 'string' ? tidy(name) : name;
    if (cleanRel === rel && cleanName === name) continue;

    /* 改完的地址要真的对得上本地这个文件，否则就只改名字。 */
    const local = path.resolve(courseDir, id, cleanRel.split('/').join(path.sep));
    if (!fs.existsSync(local)) {
      skipped.push({ id, name, rel, cleanRel });
      continue;
    }
    entry[0] = cleanName;
    entry[1] = cleanRel;
    touched = true;
    changedEntries++;
  }

  if (touched) {
    changedFiles++;
    if (FIX) {
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
    }
  }
}

console.log(
  `清单 ${ids.length} 门 · 改到 ${changedFiles} 个文件 / ${changedEntries} 条地址` +
    (skipped.length ? ` · 改不动的 ${skipped.length} 条` : '')
);
for (const s of skipped.slice(0, 20)) console.log('  跳过', JSON.stringify(s));
if (!FIX) {
  console.log('（这只是演练。加上 --fix 才真的写回去。）');
}
