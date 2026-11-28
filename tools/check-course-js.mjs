#!/usr/bin/env node
/*
 * 改过课件里的脚本之后，语法要是坏的，页面就白屏。
 * 这里把每门课的主页面里的内联脚本抽出来，用 Node 的语法检查一遍。
 *
 *   node tools/check-course-js.mjs --root dist
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};

const ROOT = path.resolve(arg('root', path.join(HERE, '..', 'dist')));
const COURSES = path.join(ROOT, 'courseware');

/* 页面里写的类型是 module 的，交给 Node 单独看 */
const SCRIPT = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;

let checked = 0;
const broken = [];

/*
 * 有一种脚本是模块（type="module"）。模块里可以用 import，
 * 用普通脚本的办法去读会说「import 只能在模块里用」，那是检查工具
 * 自己看错了，不是页面坏了。模块要用模块的办法看。
 */
const canModule = typeof vm.SourceTextModule === 'function';

/*
 * 看模块要 Node 开一个开关。不开的话，这里看到的每一段模块脚本都会
 * 被误报成「import 只能在模块里用」。与其让人记着要加参数，不如
 * 自己重新起一次，把开关带上。
 */
if (!canModule && !args.includes('--no-module-check')) {
  const again = spawnSync(
    process.execPath,
    ['--experimental-vm-modules', fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    { stdio: 'inherit' },
  );
  process.exit(again.status === null ? 1 : again.status);
}

for (const id of fs.readdirSync(COURSES)) {
  const file = path.join(COURSES, id, 'index.html');
  if (!fs.existsSync(file)) continue;

  const text = fs.readFileSync(file, 'utf8');
  let m;
  SCRIPT.lastIndex = 0;
  while ((m = SCRIPT.exec(text))) {
    const attrs = m[1] || '';
    const code = m[2] || '';
    if (!code.trim()) continue;
    const isModule = /type\s*=\s*["']module["']/i.test(attrs);
    if (!isModule && /type\s*=\s*["'](?!text\/javascript|application\/javascript)/i.test(attrs)) {
      continue;
    }
    checked++;
    try {
      if (isModule && canModule) {
        new vm.SourceTextModule(code, { identifier: `${id}#inline${SCRIPT.lastIndex}` });
      } else {
        new vm.Script(code, { filename: `${id}#inline${SCRIPT.lastIndex}` });
      }
    } catch (err) {
      broken.push({ id, why: String(err.message).split('\n')[0] });
    }
  }
}

for (const b of broken) {
  console.log(`语法有问题：${b.id} —— ${b.why}`);
}
console.log(`\n检查了 ${checked} 段脚本，${broken.length} 段有问题。`);
process.exit(broken.length ? 1 : 0);
