#!/usr/bin/env node
/*
 * 把《微小世界 · 从放大镜到显微镜》装进乐启享课件库。
 *
 * 用法（在这个文件夹里）：
 *   node install.mjs "D:\path\to\student-class"
 *
 * 不带参数时，默认把当前目录当作仓库根目录。
 * 脚本只新增文件、只往 catalog.json 里插一条记录，不删不改别的课件。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(process.argv[2] || process.cwd());
const ID = 'micro-world-6';
const SUB_PAGES = ['microscope-3d.html', 'steps-flow.html'];

if (!fs.existsSync(path.join(root, 'mirror', 'leqixiang', 'courseware'))) {
  console.error('× 这个目录不像是课件库：缺少 mirror/leqixiang/courseware');
  console.error('  请在命令后面带上仓库根目录，例如：node install.mjs "D:\\student-class"');
  process.exit(1);
}

const done = [];
const copy = (from, to, label) => {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  done.push(`${label} → ${path.relative(root, to)}`);
};

/* 1. 课件正文：一份给成品目录（立刻能打开），一份给构建源（重建不丢） */
copy(path.join(here, `${ID}.html`), path.join(root, 'mirror', 'leqixiang', 'courseware', `${ID}.html`), '课件正文');
copy(path.join(here, `${ID}.html`), path.join(root, 'mirror', 'xbjiaoyu', 'courseware', `${ID}.html`), '课件正文（构建源）');

/* 1b. 主页面打开的 3D 子页面，同样写两份 */
for (const sub of SUB_PAGES) {
  copy(path.join(here, sub), path.join(root, 'mirror', 'leqixiang', 'courseware', sub), '3D 子页面');
  copy(path.join(here, sub), path.join(root, 'mirror', 'xbjiaoyu', 'courseware', sub), '3D 子页面（构建源）');
}

/* 2. 封面 */
copy(path.join(here, `${ID}-cover.svg`), path.join(root, 'mirror', 'leqixiang', 'brand', 'original', `${ID}-cover.svg`), '封面');

/* 3. 目录登记：成品目录 + 构建源目录各一份 */
const entry = JSON.parse(fs.readFileSync(path.join(here, 'catalog-entry.json'), 'utf8'));
for (const rel of ['mirror/leqixiang/catalog.json', 'mirror/xbjiaoyu/catalog.json']) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) {
    done.push(`跳过（文件不存在） ${rel}`);
    continue;
  }
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(data.products)) {
    done.push(`跳过（没有 products） ${rel}`);
    continue;
  }
  if (data.products.some((p) => p.id === ID)) {
    done.push(`已登记，不重复写 ${rel}`);
    continue;
  }
  const anchor = data.products.findIndex((p) => p.id === 'afe-664');
  data.products.splice(anchor >= 0 ? anchor + 1 : data.products.length, 0, JSON.parse(JSON.stringify(entry)));
  fs.writeFileSync(file, JSON.stringify(data), 'utf8');
  done.push(`登记目录 ${rel}`);
}

console.log('✔ 《微小世界》已装进课件库：');
for (const line of done) console.log('  · ' + line);
console.log('\n启动：node server/server.mjs');
console.log('打开：http://localhost:4173/  在课件库里搜「微小世界」即可看到。');
