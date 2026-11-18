#!/usr/bin/env node
/*
 * 修好三维课里被拼坏的贴图路径。
 *
 * 早先镜像这批实验室课件的时候，站点名和它后面的目录是用字符串直接
 * 拼在一起的，中间少了一个斜杠：
 *
 *   /_ext/vendorPhyc140/texture/          <- 拼坏了
 *   /_ext/vendor/Phyc140/texture/         <- 本来该是这样
 *
 * 于是每一张贴图都取不到，课件打开是一片空白。这个工具只动这一处，
 * 别的字一个不改。
 *
 *   node tools/fix-lq-vendor-paths.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const DIRS = [
  'mirror/3jcn/courseware',
  'mirror/leqixiang/courseware',
];

/* 站点名后面直接跟上一个目录名，中间少了一个斜杠。 */
const BROKEN = /(_ext\/)vendor(?=[A-Z][A-Za-z0-9]*\/)/g;
const RIGHT = '$1vendor/';

let files = 0;
let places = 0;

for (const dir of DIRS) {
  if (!fs.existsSync(dir)) continue;
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.html')) continue;
    const file = path.join(dir, name);
    const text = fs.readFileSync(file, 'utf8');
    const hits = (text.match(BROKEN) || []).length;
    if (!hits) continue;
    fs.writeFileSync(file, text.replace(BROKEN, RIGHT), 'utf8');
    files++;
    places += hits;
    console.log('* 改了 ' + dir + '/' + name + '（' + hits + ' 处）');
  }
}

console.log('\n改了 ' + files + ' 个文件，共 ' + places + ' 处');
