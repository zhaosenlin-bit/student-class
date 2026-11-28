#!/usr/bin/env node
/*
 * 牛顿大炮那门课的画面背景视频在下载时被当成文本读了一遍，
 * 字节被替换成了编码标记，文件从此放不出来（37MB 的体积就是这么来的）。
 *
 * 原始字节找不回来了：同一批素材里另一个天空视频是好的，画面上也是
 * 一样的用途，于是改用它，坏文件删掉，课件包里也少一份大件。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

const ID = 'lab-course-simulation-newton-cannon';
const GOOD = 'Clouds.mp4';
const BAD = 'Background_08.mov';

const DONOR = path.join(
  ROOT, 'dist', 'courseware',
  'lab-course-mechanics-work-energy-simulation',
  'assets', '_ext', 'vendor', 'video', GOOD,
);

const targets = [
  // 成品里那门课自己的那份
  path.join(ROOT, 'dist', 'courseware', ID, 'assets', '_ext', 'vendor', 'video'),
  // 收素材的那一层（两个目录里的同一个硬链接）
  path.join(ROOT, 'mirror', 'lab-course', 'shared', 'vendor', 'video'),
  path.join(ROOT, 'mirror', 'leqixiang', '_shared-ext', 'vendor', 'video'),
];

for (const dir of targets) {
  if (!fs.existsSync(dir)) continue;

  const good = path.join(dir, GOOD);
  const bad = path.join(dir, BAD);

  if (!fs.existsSync(good)) {
    // 先写成临时文件再改名，这样不会动到别处指向同一个 inode 的链接
    const tmp = good + '.tmp';
    fs.copyFileSync(DONOR, tmp);
    fs.renameSync(tmp, good);
  }

  if (fs.existsSync(bad)) {
    fs.unlinkSync(bad);
    console.log(`删掉坏文件：${path.relative(ROOT, bad)}`);
  }

  console.log(`换好背景视频：${path.relative(ROOT, good)}`);
}

// 下载清单跟着换名字
const manifest = path.join(ROOT, 'dist', 'courseware', ID, 'download.json');
if (fs.existsSync(manifest)) {
  const text = fs.readFileSync(manifest, 'utf8');
  const next = text.split(BAD).join(GOOD);
  if (next !== text) {
    fs.writeFileSync(manifest, next);
    console.log('下载清单里的文件名换好了');
  }
}
