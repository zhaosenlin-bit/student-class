#!/usr/bin/env node
/*
 * 修一修老页面里的一种写法。
 *
 * 很早以前的网页把"背景颜色"写在 background 里：background="white"。
 * 那时候浏览器认这个写法，后来它只认背景图片，于是浏览器就跑去取一
 * 张叫 white 的图片 —— 取不到，页面上就留下一个裂开的叉。
 *
 * 这里把颜色挪回 bgcolor（那才是写颜色该用的地方），把已经取不到的
 * 背景图片整个去掉。页面的样子本来就没有变，因为那些颜色是照着
 *  bgcolor 画出来的。
 *
 *   node tools/fix-legacy-background.mjs          # 报告
 *   node tools/fix-legacy-background.mjs --fix   # 改文件
 */
import fs from 'node:fs';
import path from 'node:path';

const FIX = process.argv.includes('--fix');
const ROOTS = ['mirror/leqixiang/courseware', 'mirror/leqixiang/_shared-ext'];

/* 能当颜色写的那些名字。 */
const COLORS = new Set([
  'white', 'black', 'red', 'green', 'blue', 'yellow', 'cyan', 'magenta',
  'gray', 'grey', 'silver', 'maroon', 'olive', 'lime', 'aqua', 'teal',
  'navy', 'fuchsia', 'purple', 'orange', 'pink', 'brown', 'beige', 'ivory',
  'khaki', 'gold', 'tan', 'indigo', 'violet', 'coral', 'salmon', 'crimson',
  'lavender', 'plum', 'orchid', 'turquoise', 'wheat', 'azure', 'linen'
]);

const BACKGROUND = /<(\w+)\b([^>]*?)\sbackground\s*=\s*["']([^"']*)["']([^>]*)>/gi;

function walk(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/\.html?$/i.test(e.name)) out.push(full);
  }
  return out;
}

const files = ROOTS.flatMap((r) => walk(r));
const touched = [];

for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8');
  let n = 0;
  const out = raw.replace(BACKGROUND, (all, tag, before, value, after) => {
    const v = value.trim();
    /* A colour: it goes where a colour belongs. */
    if (COLORS.has(v.toLowerCase())) {
      n++;
      return `<${tag}${before} bgcolor="${v}"${after}>`;
    }
    /* A picture that is not here any more: the colour behind it shows. */
    if (/\.(?:gif|png|jpe?g|svg|webp)$/i.test(v)) {
      n++;
      return `<${tag}${before}${after}>`;
    }
    return all;
  });
  if (out !== raw) {
    touched.push({ rel: file.replace(/\\/g, '/'), n });
    if (FIX) {
      fs.writeFileSync(file, out, 'utf8');
      console.log(`+ ${file.replace(/\\/g, '/')}  改了 ${n} 处`);
    }
  }
}

console.log(`看过 ${files.length} 个镜像页面，background 写错了的 ${touched.length} 个：`);
for (const t of touched.slice(0, 30)) console.log(`  ${t.rel}  ×${t.n}`);
if (touched.length > 30) console.log(`  …… 还有 ${touched.length - 30} 个`);
if (!FIX && touched.length) {
  console.log('\n加 --fix 可以把它们改过来。');
  process.exitCode = 1;
}
