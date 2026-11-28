#!/usr/bin/env node
/*
 * 课件的页面里留着一段话：打开开发者工具时，屏幕上会飘出一行
 * 「版权声明」，说未经授权复制或分发要承担法律责任。
 *
 * 这段话不是页面的一部分，是当初放进去的一个小钩子。成品里不需要它，
 * 去掉之后页面该有的样子一点不变。
 *
 * 有些课件是拼出来的一段字符串，里面的换行写成两个字符（反斜杠加 n）。
 * 两种写法都要照顾到，所以这里按「逻辑行」来拆：不管换行是真的还是
 * 写出来的，都当成一行来看。
 *
 *   node tools/clean-console-notices.mjs --root dist
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};

const ROOT = path.resolve(arg('root', path.join(HERE, '..', 'dist')));
const DRY = args.includes('--dry');

const TEXT = new Set(['.html', '.htm', '.js', '.mjs', '.cjs']);

/*
 * 拆行：真的换行，以及写出来的换行（反斜杠加 n）。
 * 分隔符原样留着，放回去的时候一个字节都不会变。
 */
const SPLIT = /(\\n|\r\n|\n|\r)/;

const splitLines = (text) => {
  const out = [];
  let rest = text;
  while (rest) {
    const m = SPLIT.exec(rest);
    if (!m) {
      out.push({ text: rest, sep: '' });
      break;
    }
    out.push({ text: rest.slice(0, m.index), sep: m[0] });
    rest = rest.slice(m.index + m[0].length);
  }
  return out;
};

/* 那些行长什么样 */
const isNoticeComment = (s) => /^\s*\/\/\s*控制台版权声明\s*$/.test(s);
const isNoticeTimerStart = (s) => /^\s*setTimeout\(function\(\)\s*\{\s*$/.test(s);
const isNoticeBig = (s) => /^\s*console\.log\('%c.*版权声明/.test(s);
const isNoticeSmall = (s) => /^\s*console\.log\('%c.*本内容受版权保护/.test(s);
const isTimerEnd = (s) => /^\s*\}\s*,\s*\d+\s*\);\s*$/.test(s);

const isTrapComment = (s) => /^\s*\/\/\s*DevTools\s*检测/.test(s);
const isTrapVar = (s) => /^\s*var\s+_cdt\s*=\s*function\(\)\s*\{\s*$/.test(s);
const isTrapT0 = (s) => /^\s*var\s+t0\s*=\s*performance\.now\(\)\s*;\s*$/.test(s);
const isTrapCall = (s) => /^\s*\(function\(\)\{\}\)\.constructor\('debugger'\)\(\)\s*;\s*$/.test(s);
const isTrapIf = (s) => /^\s*if\s*\(performance\.now\(\)\s*-\s*t0\s*>\s*100\)\s*\{\s*$/.test(s);
const isTrapLp = (s) => /^\s*\(function lp\(\)\s*\{\s*$/.test(s);
const isTrapLpCall = (s) => /^\s*setTimeout\(lp\s*,\s*50\)\s*;\s*$/.test(s);
const isTrapClose = (s) => /^\s*\}\)\(\)\s*;\s*$/.test(s);
const isTrapBrace = (s) => /^\s*\};?\s*$/.test(s);
const isTrapBraceSemi = (s) => /^\s*\};\s*$/.test(s);
const isTrapStart = (s) => /^\s*setTimeout\(_cdt\s*,\s*1000\)\s*;\s*$/.test(s);
const isTrapRepeat = (s) => /^\s*setInterval\(_cdt\s*,\s*3000\)\s*;\s*$/.test(s);

/* 版权声明：注释行 + 定时器 + 两行字 + 收尾，一共五行 */
const NOTICE = [isNoticeComment, isNoticeTimerStart, isNoticeBig, isNoticeSmall, isTimerEnd];

/* 开发者工具检测：注释行起头，一共十三行 */
const TRAP = [
  isTrapComment, isTrapVar, isTrapT0, isTrapCall, isTrapIf, isTrapLp,
  isTrapCall, isTrapLpCall, isTrapClose, isTrapBrace, isTrapBraceSemi,
  isTrapStart, isTrapRepeat,
];

const walk = (dir, out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (TEXT.has(path.extname(entry.name).toLowerCase())) out.push(full);
  }
  return out;
};

let touched = 0;
let removed = 0;

for (const file of walk(ROOT)) {
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes('版权声明') && !text.includes("constructor('debugger')")) continue;

  const lines = splitLines(text);
  const kept = [];
  let hit = 0;

  for (let i = 0; i < lines.length; i++) {
    const at = (n) => (lines[i + n] ? lines[i + n].text : null);

    if (NOTICE.every((test, k) => test(at(k) ?? ''))) {
      hit++;
      i += NOTICE.length - 1;
      continue;
    }

    if (TRAP.every((test, k) => test(at(k) ?? ''))) {
      hit++;
      i += TRAP.length - 1;
      continue;
    }

    kept.push(lines[i]);
  }

  if (!hit) continue;

  const cleaned = kept.map((l) => l.text + l.sep).join('');
  touched++;
  removed += hit;
  if (!DRY) fs.writeFileSync(file, cleaned);
  console.log(`${path.relative(ROOT, file)}：去掉 ${hit} 处`);
}

console.log(`\n共 ${touched} 个文件，去掉 ${removed} 处。${DRY ? '（只试算，没写）' : ''}`);
