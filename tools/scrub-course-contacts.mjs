#!/usr/bin/env node
/*
 * 把课件正文里的联系办法去掉。
 *
 * 有些课件把外面某个开放课网页整页存了进来，那一页上留着原作者的
 * 邮箱 —— 有的是学术作者自己写的联系地址，有的是站点的反馈信箱。
 * 这些是别人家的联系渠道，摆在乐启享的课件里不合适；按许可要留的
 * 署名（作者名字、机构）照旧留着，去掉的只是"怎么找到他"。
 *
 *   node tools/scrub-course-contacts.mjs          # 报告
 *   node tools/scrub-course-contacts.mjs --fix    # 改文件
 */
import fs from 'node:fs';
import path from 'node:path';

const FIX = process.argv.includes('--fix');
const ROOTS = ['mirror/leqixiang/courseware'];

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const MAILTO = /mailto:[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/gi;

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

/* 看不见的地方不管：注释和脚本里的邮箱不会显示在读者眼前。 */
function visibleOnly(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ');
}

const isChinese = (text) => /[一-鿿]/.test(text);

const findings = [];
const files = ROOTS.flatMap((r) => walk(r));

for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8');
  const shown = visibleOnly(raw);
  const hits = [...new Set(shown.match(EMAIL) || [])];
  if (!hits.length) continue;

  const rel = file.replace(/\\/g, '/');
  findings.push({ rel, hits });

  if (!FIX) continue;

  const cn = isChinese(shown);
  const blank = cn ? '（联系方式已移除）' : '(contact details removed)';

  let out = raw;
  /* 先把带地址的链接整个换掉，免得留下半个地址。 */
  out = out.replace(
    /<a\b[^>]*href\s*=\s*["']mailto:[^"']*["'][^>]*>[\s\S]{0,200}?<\/a>/gi,
    blank
  );
  /* 再把光秃秃的地址换掉。 */
  out = out.replace(EMAIL, blank);
  /* 剩下的 mailto 目标（正文里没有显示文字的那种）也去掉。 */
  out = out.replace(MAILTO, '#');
  /* 电话号码同理，只改地址，不动显示的文字。 */
  out = out.replace(/href\s*=\s*["']tel:[^"']*["']/gi, 'href="#"');

  if (out !== raw) {
    fs.writeFileSync(file, out, 'utf8');
    console.log(`+ ${rel}  去掉 ${hits.length} 处`);
  }
}

if (!findings.length) {
  console.log(`看过 ${files.length} 个课件页面，没有露出联系方式。`);
} else {
  console.log(`看过 ${files.length} 个课件页面，${findings.length} 个文件里有联系方式：`);
  for (const f of findings) console.log(`  ${f.rel}  ${f.hits.join(' ')}`);
  if (!FIX) {
    console.log('\n加 --fix 可以把它们去掉。');
    process.exitCode = 1;
  }
}
