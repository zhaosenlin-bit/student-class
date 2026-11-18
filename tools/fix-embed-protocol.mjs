#!/usr/bin/env node
/*
 * 课件里嵌着的模块是一段 base64，正文替换看不见它。于是模块里还是旧
 * 家的说话方式：它报"我好了"用的是旧名字，外壳听不见，课件就一直
 * 转圈 —— 看上去像加载失败，其实是名字对不上。
 *
 * 这里把每一段 base64 解开，把旧名字换成新名字，再装回去。
 *
 *   node tools/fix-embed-protocol.mjs          只报告
 *   node tools/fix-embed-protocol.mjs --write  真的改文件
 */
import fs from 'node:fs';
import path from 'node:path';

const WRITE = process.argv.includes('--write');
const ROOTS = [
  'mirror/leqixiang/courseware',
  'mirror/3jcn/courseware',
  'mirror/phet/courseware',
];
/* A long run of base64 characters is an embedded module. */
const BLOB = /"([A-Za-z0-9+/]{4000,}={0,2})"/g;
const REPLACEMENTS = [
  ['xiaobai:courseware-startup', 'leqixiang:courseware-startup'],
  ['xiaobai:classroom-access', 'leqixiang:classroom-access'],
  ['xiaobai:content-guard', 'leqixiang:content-guard'],
  ['xiaobai:', 'leqixiang:'],
];

const files = [];
for (const root of ROOTS) {
  if (!fs.existsSync(root)) continue;
  for (const name of fs.readdirSync(root)) {
    if (name.endsWith('.html')) files.push(path.join(root, name));
  }
}

let changedFiles = 0;
let changedBlobs = 0;
const report = [];

for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8');
  let touched = 0;
  const next = raw.replace(BLOB, (whole, blob) => {
    let text;
    try {
      text = Buffer.from(blob, 'base64').toString('utf8');
    } catch {
      return whole;
    }
    /* Only a blob that survives the round trip untouched may be rewritten. */
    if (Buffer.from(text, 'utf8').toString('base64') !== blob) return whole;
    let updated = text;
    for (const [from, to] of REPLACEMENTS) {
      if (!updated.includes(from)) continue;
      updated = updated.split(from).join(to);
      touched++;
    }
    if (!touched) return whole;
    changedBlobs++;
    return `"${Buffer.from(updated, 'utf8').toString('base64')}"`;
  });
  if (next !== raw) {
    changedFiles++;
    report.push(`${file}  换了 ${touched} 处`);
    if (WRITE) fs.writeFileSync(file, next, 'utf8');
  }
}

console.log(WRITE ? '已经改好的文件：' : '需要改的文件：');
for (const line of report) console.log('  ' + line);
console.log(`共 ${report.length} 个文件，${changedBlobs} 段内嵌模块。`);
