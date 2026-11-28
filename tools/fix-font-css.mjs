#!/usr/bin/env node
/*
 * 把样式表里指不到地方的字体地址摆正。
 *
 * 有几门课，样式表是这么写的：
 *
 *   url(../../../../assets/_ext/fonts.gstatic.com/s/xxx/v1/xxx.woff2)
 *
 * 样式表自己放在  课件/assets/_ext/fonts.googleapis.com/  里，
 * 从那儿往上退四级正好到「课件」这一层的外面去，所以每一个字体都
 * 找不到——页面看着没字体，字全是浏览器现凑的。
 *
 * 正确的写法是往上一层，指到同一层的兄弟目录：
 *
 *   url(../fonts.gstatic.com/s/xxx/v1/xxx.woff2)
 *
 * 字体文件也要真的在那儿：把已经有的那一份放回课件自己的目录
 * （硬链接，磁盘上不占第二份），再把下载清单补上。
 *
 *   node tools/fix-font-css.mjs --root dist
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
const DRY = args.includes('--dry');

const COURSES = path.join(ROOT, 'courseware');

/* 字体池：/<字体名>/<版本>/<文件> -> 一个真的存在的文件 */
const pool = new Map();
function scan(dir, rel = '') {
  let items;
  try {
    items = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const it of items) {
    const abs = path.join(dir, it.name);
    const r = rel ? rel + '/' + it.name : it.name;
    if (it.isDirectory()) scan(abs, r);
    else {
      const m = /fonts\.gstatic\.com\/(.+)$/.exec(r);
      if (m && !pool.has(m[1])) pool.set(m[1], abs);
    }
  }
}
scan(COURSES, 'courseware');
scan(path.join(ROOT, 'shared'), 'shared');

/*
 * 样式表在成品里是硬链接：好几门课共用一份。硬链接的好处是磁盘上
 * 只占一份，坏处是改一处就跟着改一片——这里要把每一门课改成自己的
 * 样子，就得先把链接拆开：先写进临时文件，再改名换掉原来那一条，
 * 别的课那一份不会跟着变。
 */
function writeOwn(file, text) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, file);
}

let cssFixed = 0;
let fontsPlaced = 0;
const missing = [];
const manifestUpdates = new Map();

for (const id of fs.readdirSync(COURSES)) {
  const cssDir = path.join(COURSES, id, 'assets', '_ext', 'fonts.googleapis.com');
  if (!fs.existsSync(cssDir)) continue;
  const cssFiles = fs.readdirSync(cssDir).filter((n) => n.endsWith('.css'));
  if (!cssFiles.length) continue;

  const added = new Set();
  for (const name of cssFiles) {
    const file = path.join(cssDir, name);
    const text = fs.readFileSync(file, 'utf8');
    const wanted = [];

    const after = text.replace(/url\(\s*([^)]+?)\s*\)/g, (whole, ref) => {
      if (/^(data:|https?:|\/\/)/i.test(ref)) return whole;
      const tail = /fonts\.gstatic\.com\/(.+)$/.exec(ref);
      if (!tail) return whole;
      const key = tail[1];
      /* 从样式表自己所在的位置算起，这个地址指得到吗？ */
      const here = path.posix.normalize(
        path.posix.join('courseware/' + id + '/assets/_ext/fonts.googleapis.com', ref)
      );
      if (fs.existsSync(path.join(ROOT, here))) return whole;
      wanted.push(key);
      return `url(../fonts.gstatic.com/${key})`;
    });

    if (after !== text) {
      cssFixed++;
      if (!DRY) writeOwn(file, after);
    }

    /* 字体文件要真的放到课件自己的目录里 */
    for (const key of wanted) {
      const dest = path.join(ccssDirOf(cssDir), 'fonts.gstatic.com', key);
      const rel = 'assets/_ext/fonts.gstatic.com/' + key;
      if (fs.existsSync(dest)) continue;
      const src = pool.get(key);
      if (!src) {
        missing.push(`${id}  ${key}`);
        continue;
      }
      if (!DRY) {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        /* 硬链接：磁盘上不占第二份 */
        try {
          fs.linkSync(src, dest);
        } catch {
          fs.copyFileSync(src, dest);
        }
      }
      fontsPlaced++;
      added.add(rel);
    }
  }

  if (added.size) manifestUpdates.set(id, [...added]);
}

function ccssDirOf(dir) {
  /* dir = 课件/assets/_ext/fonts.googleapis.com → 课件/assets/_ext */
  return path.dirname(dir);
}

/*
 * 下载清单：包里的名字要干净，也要和课件页面实际要的东西对上。
 * 这里顺手改两处：
 *   - 包里的名字往回跑的（../../shared/…），换成课件自己的位置；
 *   - 名字重复的，留一份。
 */
let manifestChanged = 0;
for (const id of manifestUpdates.keys()) {
  const file = path.join(COURSES, id, 'download.json');
  if (!fs.existsSync(file)) continue;
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    continue;
  }
  if (!Array.isArray(data.entries)) continue;

  const seen = new Set();
  const out = [];
  let touched = false;
  for (const entry of data.entries) {
    const name = String(entry[0] ?? '').replace(/\\/g, '/');
    const from = String(entry[1] ?? '');
    /* 名字里的反斜杠是 Windows 留下的，浏览器当不了目录分隔符。 */
    const clean = name.replace(/\/+/g, '/').replace(/^\.\//, '');
    /*
     * 包里的名字不能往回跑。素材是收拢过的，取货的地方在共享目录里，
     * 但包里的名字要落在课件自己的目录里，页面才找得到。
     * 课件自己那儿已经有一份的，就用自己那份，别再往包里塞一份
     * 走回头路的。
     */
    const back = /^(?:\.\.\/)+shared\/(.+)$/.exec(clean);
    if (back) {
      const tail = back[1];
      const at = tail.indexOf('assets/');
      const fixedName = at >= 0 ? tail.slice(at) : 'assets/_ext/' + tail;
      touched = true;
      const local = path.join(COURSES, id, fixedName.replace(/\//g, path.sep));
      if (fs.existsSync(local)) {
        if (!seen.has(fixedName)) {
          seen.add(fixedName);
          out.push([fixedName, fixedName]);
        }
        continue;
      }
      if (seen.has(fixedName)) {
        continue;
      }
      seen.add(fixedName);
      out.push([fixedName, from]);
      continue;
    }
    if (clean !== name) touched = true;
    if (seen.has(clean)) {
      touched = true;
      continue;
    }
    seen.add(clean);
    out.push([clean, from]);
  }

  /* 补上刚放进来的字体文件 */
  for (const rel of manifestUpdates.get(id)) {
    if (seen.has(rel)) continue;
    seen.add(rel);
    out.push([rel, rel]);
    touched = true;
  }

  if (touched) {
    manifestChanged++;
    if (!DRY) {
      data.entries = out;
      fs.writeFileSync(file, JSON.stringify(data));
    }
  }
}

console.log(
  `样式表改了 ${cssFixed} 个，字体放回 ${fontsPlaced} 份，下载清单改了 ${manifestChanged} 门`
);
if (missing.length) {
  console.log(`还缺 ${missing.length} 份字体（整个库里都没有）：`);
  for (const m of missing.slice(0, 20)) console.log('  - ' + m);
}
