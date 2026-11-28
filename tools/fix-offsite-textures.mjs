#!/usr/bin/env node
/*
 * 把课件还在往外站要的贴图，搬回课件自己身边。
 *
 * 每门课件的页面顶上都有一张「地址对照表」：课件在运行时向某个
 * 站点要一张图，对照表就把这个地址换成课件旁边的那一份。这些图
 * 早就在本地了，只是有几门课对照表里少了一行，浏览器只好跑到
 * 站外去要——线上没有外网时，那张图就是空的。
 *
 * 这里做两件事：
 *
 *   - 把缺的那张图复制到课件自己的 assets 底下；
 *   - 在对照表最前面补一行，让这个地址指回本地。
 *
 *   node tools/fix-offsite-textures.mjs --check
 *   node tools/fix-offsite-textures.mjs --fix
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const has = (n) => args.includes('--' + n);

const ROOT = 'dist';

/*
 * 每一门课要单独记，因为它缺的东西不一样。
 *
 *   course       哪一门课
 *   urlPrefix    课件在运行时用的那个站外地址开头
 *   localPrefix  换成什么（相对课件自己）
 *   from         本地现成的那一份在哪儿（相对 dist）
 *   files        要搬过去的文件（相对 from）
 */
const FIXES = [
  {
    course: 'lq-15',
    urlPrefix: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/',
    localPrefix: './assets/_ext/threejs.org/examples/',
    from: 'shared/assets/_ext/threejs.org/examples/',
    files: ['textures/planets/earth_clouds_1024.png'],
  },
];

/* 对照表在页面里是一行 var map=[[...],[...]]; */
const MAP_RE = /var map=(\[\[.*?\]\]);/s;

let touched = 0;
let broken = 0;

for (const fix of FIXES) {
  const dir = path.join(ROOT, 'courseware', fix.course);
  const page = path.join(dir, 'index.html');
  if (!fs.existsSync(page)) {
    console.log(`${fix.course}  没有这门课了，跳过`);
    continue;
  }

  const problems = [];
  const touchedFiles = [];

  /* 一、图得在课件身边 */
  for (const rel of fix.files) {
    const src = path.join(ROOT, fix.from, rel);
    const dst = path.join(dir, fix.localPrefix.replace(/^\.\//, ''), rel);
    if (!fs.existsSync(src)) {
      problems.push(`本地没有现成的 ${src}`);
      continue;
    }
    if (!fs.existsSync(dst)) {
      touchedFiles.push(path.relative(ROOT, dst).split(path.sep).join('/'));
      if (has('fix')) {
        fs.mkdirSync(path.dirname(dst), { recursive: true });
        fs.copyFileSync(src, dst);
      }
    } else if (fs.readFileSync(src).compare(fs.readFileSync(dst)) !== 0) {
      touchedFiles.push(path.relative(ROOT, dst).split(path.sep).join('/') + '（覆盖）');
      if (has('fix')) {
        fs.copyFileSync(src, dst);
      }
    }
  }

  /* 二、对照表里得有一行 */
  const html = fs.readFileSync(page, 'utf8');
  const m = html.match(MAP_RE);
  if (!m) {
    problems.push('这一页没有对照表，改不了');
  } else {
    let map = null;
    try {
      map = JSON.parse(m[1]);
    } catch (e) {
      problems.push('对照表不是合法的 JSON：' + e.message);
    }
    if (map) {
      const already = map.some((row) => row[0] === fix.urlPrefix);
      if (!already) {
        /*
         * 放在最前面：对照表是按开头一个一个比的，谁在前面谁先生效。
         * raw.githubusercontent 这个开头和别的都不冲突，放前面最稳。
         */
        map.unshift([fix.urlPrefix, fix.localPrefix]);
        const out = html.replace(MAP_RE, `var map=${JSON.stringify(map)};`);
        if (has('fix')) {
          fs.writeFileSync(page, out, 'utf8');
          touchedFiles.push(`${fix.course}/index.html（对照表 +1 行）`);
        }
      }
    }
  }

  /* 三、下载清单要跟上 */
  const dl = path.join(dir, 'download.json');
  if (fs.existsSync(dl)) {
    const meta = JSON.parse(fs.readFileSync(dl, 'utf8'));
    const have = new Set((meta.entries || []).map((e) => e[0]));
    let added = 0;
    for (const rel of fix.files) {
      const relPath = fix.localPrefix.replace(/^\.\//, '') + rel;
      if (!have.has(relPath)) {
        meta.entries.push([relPath, relPath]);
        have.add(relPath);
        added++;
      }
    }
    if (added) {
      if (has('fix')) {
        fs.writeFileSync(dl, JSON.stringify(meta), 'utf8');
        touchedFiles.push(`${fix.course}/download.json（清单 +${added} 条）`);
      }
    }
  }

  if (problems.length) {
    broken++;
    console.log(`${fix.course}  有问题`);
    for (const p of problems) console.log('  ' + p);
  } else {
    touched++;
    console.log(`${fix.course}  ${has('fix') ? '已修好' : '可以修好'}：${fix.files.join('、')}`);
    for (const t of touchedFiles) console.log('  ' + t);
  }
}

console.log('');
console.log(broken ? `有 ${broken} 门课改不了。` : `${touched} 门课 ${has('fix') ? '已修好' : '没有问题'}。`);
process.exit(broken ? 1 : 0);
