#!/usr/bin/env node
/*
 * Remove the leftovers that a capture of a running session leaves inside
 * a chapter document.
 *
 * A chapter page is saved as it was on the screen at that moment.  When
 * the capture happened during a slow save, the page keeps the state of
 * that moment: the body says the adapter timed out, and the error banner
 * of the runtime is written into the markup as a fixed piece of text.
 * The runtime adds its own banner when something really goes wrong, so
 * the copy in the file only shows a course that is fine.
 *
 *   node tools/clean-course-artifacts.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CW = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'courseware');

/* The three messages the runtime uses when a save does not go through. */
const MESSAGES = [
  '保存结果尚未确认',
  '进度未能保存',
  '课件连接或加载中断',
];

/* The banner of the runtime: a fixed aside with the message in it. */
const ASIDE = /<aside\b[^>]*\bdata-i18n-ignore=""[^>]*>[\s\S]*?<\/aside>/gi;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

let changed = 0;
let banners = 0;

if (!fs.existsSync(CW)) {
  console.error('courseware 目录不存在');
  process.exit(1);
}

for (const dir of fs.readdirSync(CW)) {
  if (!dir.endsWith('.assets')) continue;
  const root = path.join(CW, dir);
  for (const file of walk(root)) {
    if (!/\.html?$/i.test(file)) continue;
    const before = fs.readFileSync(file, 'utf8');
    if (!before.includes('data-course-adapter-state')) continue;

    let after = before.replace(ASIDE, (block) => {
      /* Only the banner of the runtime goes; any other aside stays. */
      if (!MESSAGES.some((m) => block.includes(m))) return block;
      banners += 1;
      return '';
    });

    /* The state of that moment goes with it: the runtime sets it again. */
    after = after.replace(
      /data-course-adapter-state="[^"]*"/g,
      'data-course-adapter-state="initializing"'
    );

    if (after !== before) {
      fs.writeFileSync(file, after);
      changed += 1;
      console.log(
        `${path.relative(ROOT, file)}: 状态残留已清理` +
          (banners ? '' : '')
      );
    }
  }
}

console.log(`\n清理了 ${changed} 份文档，其中 ${banners} 处错误提示条`);
