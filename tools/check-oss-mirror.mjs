#!/usr/bin/env node
/*
 * 看一遍桶里的东西是不是本地这一份的完整照搬。
 *
 * 课件的「下载」是把清单上的每一个文件取回来再打包，所以清单里写着的
 * 名字，桶里必须一个不少地存在——少一个，下载下来的包里就缺一块。
 * 这个工具把桶里的清单拉下来，和本地的文件清单、每一门课件的下载清单
 * 逐一对照，报出缺的东西和多余的东西。
 *
 *   node tools/check-oss-mirror.mjs --root dist --prefix leqixiang-courseware
 *
 * 账号写在 work/oss.txt（不进仓库）或者环境变量里：
 *   OSS_REGION / OSS_BUCKET / OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listObjects } from './oss-prefix.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const FLAGS_WITH_VALUE = ['--region', '--bucket', '--config', '--root', '--prefix', '--out'];
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};

const ROOT = path.resolve(arg('root', path.join(HERE, '..', 'dist')));
const PREFIX = String(arg('prefix', 'site')).replace(/^\/+|\/+$/g, '');
const OUT = arg('out', '');

if (!fs.existsSync(ROOT)) {
  console.error('没有找到本地的那一份：' + ROOT);
  process.exit(1);
}

/* 本地的文件：相对 root 的名字，写法一律用斜杠。 */
const local = new Map();
(function walk(dir, rel = '') {
  for (const it of fs.readdirSync(dir, { withFileTypes: true })) {
    const r = rel ? rel + '/' + it.name : it.name;
    const abs = path.join(dir, it.name);
    if (it.isDirectory()) walk(abs, r);
    else local.set(r.replace(/\\/g, '/'), fs.statSync(abs).size);
  }
})(ROOT);

console.log(`本地 ${local.size} 个文件，正在看桶里 ${PREFIX}/ …`);
const onBucket = await listObjects(PREFIX ? PREFIX + '/' : '');
const bucket = new Map();
for (const item of onBucket) {
  const key = PREFIX ? item.Key.slice(PREFIX.length + 1) : item.Key;
  bucket.set(key.replace(/\\/g, '/'), item.Size);
}
console.log(`桶里 ${bucket.size} 个文件。`);

/* 本地有、桶里没有：上传漏了。 */
const missing = [];
for (const key of local.keys()) if (!bucket.has(key)) missing.push(key);

/* 桶里有、本地没有：上一次上传留下的旧东西。 */
const extra = [];
for (const key of bucket.keys()) if (!local.has(key)) extra.push(key);

/*
 * 每一门课件的下载清单：清单里写着的名字，桶里必须都在。
 * 名字有几种写法（斜杠的方向、重复的斜杠），摆正了再找。
 */
const courses = path.join(ROOT, 'courseware');
const broken = [];
let entries = 0;
for (const id of fs.readdirSync(courses)) {
  const manifest = path.join(courses, id, 'download.json');
  if (!fs.existsSync(manifest)) continue;
  let data;
  try {
    data = JSON.parse(fs.readFileSync(manifest, 'utf8'));
  } catch (e) {
    broken.push({ id, file: 'download.json', why: '读不出来：' + e.message });
    continue;
  }
  const base = `courseware/${id}/`;
  for (const entry of data.entries || []) {
    const name = String(entry[1] ?? '').split('#')[0].split('?')[0].replace(/\\/g, '/');
    const clean = path.posix.normalize(name).replace(/^\.\//, '');
    entries++;
    /*
     * 清单里的名字是按课件自己的位置写的，收拢过的素材会写成
     * ../../shared/… 这样从上面绕出去的路子。拼上之后要摆正，
     * 摆正出来的才是真的那个位置。
     */
    const key = path.posix.normalize(base + clean);
    if (!bucket.has(key)) {
      broken.push({ id, file: name, why: '桶里没有' });
      continue;
    }
    const want = local.get(key);
    if (want !== undefined && bucket.get(key) !== want) {
      broken.push({ id, file: name, why: `大小不一样（本地 ${want}，桶里 ${bucket.get(key)}）` });
    }
  }
}

console.log('');
console.log(`上传漏掉：${missing.length} 个`);
for (const key of missing.slice(0, 30)) console.log('  - ' + key);
console.log(`桶里多出：${extra.length} 个`);
for (const key of extra.slice(0, 30)) console.log('  - ' + key);
console.log(`下载清单对不上：${broken.length} 处（共 ${entries} 条）`);
for (const b of broken.slice(0, 30)) console.log(`  - ${b.id} ${b.file} ${b.why}`);

if (OUT) {
  fs.writeFileSync(
    OUT,
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        prefix: PREFIX,
        local: local.size,
        onBucket: bucket.size,
        missing,
        extra,
        broken,
        entries,
      },
      null,
      1
    )
  );
  console.log(`\n报告写入 ${OUT}`);
}

const ok = !missing.length && !extra.length && !broken.length;
console.log(ok ? '\n桶里的这一份和本地完全一致。' : '\n还有对不上的地方。');
process.exit(ok ? 0 : 1);
