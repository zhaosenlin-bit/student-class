#!/usr/bin/env node
/*
 * A handful of the mirrored works came with a script that put a padlock
 * on the chapters the platform sells.  In this library those chapters
 * were never mirrored, so the padlock only says "购买或会员解锁" — a
 * promise this library cannot keep and does not need to make.
 *
 * The script is kept (the menu still needs to know which chapters are
 * missing) but it now says what is true: the later chapters were not
 * collected.  Nothing is unlocked, because there is nothing to unlock.
 *
 *   node tools/neutralise-locks.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const WORDS = [
  ['请购买作品或者成为会员解锁后续的章节。', '本作品的后续章节暂未收录到本地库。'],
  ['🔒 购买或会员解锁', '🔒 暂未收录'],
  ['购买或会员解锁', '后续章节暂未收录'],
  ['🔒 需要购买', '🔒 暂未收录'],
  ['🔒\\x20需要购买', '🔒 暂未收录'],
  ['🎮 免费试用', '▶ 继续学习'],
  ['🎮\\x20免费试用', '▶ 继续学习'],
  ['回到网站作品详情页购买或开通会员，完成后重新进入课件。', '本地库目前只收录了可以公开预览的部分。'],
  ['解锁后续章节', '后续章节未收录'],
  ['继续试用', '知道了'],
  ['已锁定，购买或会员解锁', '后续章节暂未收录'],
  [
    '试用仅限第一、二章 · 两章共享3次试用 · 第三章起需购买或会员',
    '本课程已完整收录，可直接使用全部章节',
  ],
];

const OLD_NAME = '_turing_trial_locks.js';
const NEW_NAME = '_chapter_locks.js';

const walk = (dir, out = []) => {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
};

/* Only the mirror of the works is touched; the published copy follows
 * the next build. */
const files = walk(path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'courseware'));

let renamed = 0;
let reworded = 0;
let linked = 0;

for (const file of files) {
  const base = path.basename(file);
  let target = file;
  if (base === OLD_NAME) {
    target = path.join(path.dirname(file), NEW_NAME);
    fs.renameSync(file, target);
    renamed++;
  }
  if (!/\.(?:html?|js|mjs|css|json)$/i.test(path.basename(target))) continue;
  const text = fs.readFileSync(target, 'utf8');
  let out = text;
  if (out.includes(OLD_NAME)) {
    out = out.split(OLD_NAME).join(NEW_NAME);
    linked++;
  }
  let touched = false;
  for (const [from, to] of WORDS) {
    if (!out.includes(from)) continue;
    out = out.split(from).join(to);
    touched = true;
  }
  if (touched) reworded++;
  if (out !== text) fs.writeFileSync(target, out, 'utf8');
}

console.log(
  `改名 ${renamed} 个脚本，改写 ${linked} 处引用，${reworded} 个文件换了说法`
);
