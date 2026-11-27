#!/usr/bin/env node
/*
 * 把课件里带加号的路径收拾干净。
 *
 * 有一份公共组件包在发布时用的是「+esm」这个名字。放在网页上没问题，
 * 可是一旦这份文件要靠地址去取，加号就会被当成空格：
 *
 *   - 对象存储按普通地址解读请求行，把加号读成空格，于是找不到文件；
 *   - 浏览器还嫌它不是正经的脚本类型，不肯把它当模块来用。
 *
 * 所以给它换个名字：改成 vision_bundle.mjs。加号没有了，类型也对了，
 * 课件自己写的那几处地址也跟着改。
 *
 * 这个名字是发布方自己就在用的另一个名字，所以改过之后和原版一模一样。
 *
 *   node tools/lq-plus-paths.mjs            # 收拾 dist
 *   node tools/lq-plus-paths.mjs --root 目录
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const OLD_NAME = '+esm';
export const NEW_NAME = 'vision_bundle.mjs';

/* 只有地址末尾的加号才算数：包在引号里，或者后面就是逗号、括号。 */
const OLD_IN_TEXT = /\/(\+esm)(?=["'\s,\]\}\)])/g;

export function fixText(text) {
  let count = 0;
  const out = text.replace(OLD_IN_TEXT, (all, name) => {
    count++;
    return `/${NEW_NAME}`;
  });
  return { text: out, count };
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const isText = (f) => /\.(json|js|mjs|html|css|txt|md|svg)$/i.test(f);

/**
 * 收拾一个目录：文件改名，文字里的地址跟着改。
 */
export function fixRoot(root) {
  const files = walk(root);
  const renamed = [];
  const removed = [];
  const edited = [];

  /* 先改文件本身 */
  for (const file of files) {
    const dir = path.dirname(file);
    const base = path.basename(file);
    if (!base.endsWith(OLD_NAME)) continue;
    const next = base.slice(0, base.length - OLD_NAME.length) + NEW_NAME;
    const target = path.join(dir, next);
    if (fs.existsSync(target)) {
      /* 同一个东西已经有一份了，内容一样就只留一份。 */
      const same = fs.readFileSync(target).equals(fs.readFileSync(file));
      if (!same) {
        throw new Error(`两个名字不同的文件撞在一起了：${file} 和 ${target}`);
      }
      fs.rmSync(file);
      removed.push(file);
    } else {
      fs.renameSync(file, target);
      renamed.push({ from: file, to: target });
    }
  }

  /* 再改文字里的地址 */
  for (const file of walk(root)) {
    if (!isText(file)) continue;
    let text;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const { text: next, count } = fixText(text);
    if (count) {
      fs.writeFileSync(file, next);
      edited.push({ file, count });
    }
  }

  return { renamed, removed, edited };
}

/* ------------------------------------------------------------ 用起来 --- */

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf('--root');
  const root = path.resolve(i >= 0 ? process.argv[i + 1] : 'dist');
  if (!fs.existsSync(root)) {
    console.error(`找不到目录：${root}`);
    process.exit(1);
  }
  const r = fixRoot(root);
  console.log(`目录 ${root}`);
  console.log(`  改名的文件 ${r.renamed.length} 个`);
  for (const x of r.renamed) console.log(`    ${path.relative(root, x.from)} -> ${path.basename(x.to)}`);
  console.log(`  删掉重复的文件 ${r.removed.length} 个`);
  for (const x of r.removed) console.log(`    ${path.relative(root, x)}`);
  console.log(`  改过地址的文件 ${r.edited.length} 个，共 ${r.edited.reduce((s, x) => s + x.count, 0)} 处`);
  for (const x of r.edited) console.log(`    ${path.relative(root, x.file)}  ${x.count} 处`);
}
