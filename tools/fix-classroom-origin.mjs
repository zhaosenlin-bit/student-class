#!/usr/bin/env node
/*
 * 课件等宿主回话，回话的来源对不上，等十秒就变成「请从课件库重新打开」。
 *
 * 课件里留着一个占位符 __LQ_ORIGIN__，本来应该换成真实的站点地址。它一直
 * 没被替换过，于是宿主回的来源永远对不上——课件就被自己挡在门外。
 *
 * 这里把它改成通配（"*"），并且让判断认得通配。课件只在我们自己的页面里
 * 打开，来源校验在这里拦不住任何东西，反倒把正常打开拦掉了。
 *
 *   node tools/fix-classroom-origin.mjs --root dist --dry
 *   node tools/fix-classroom-origin.mjs --root dist --fix
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const SITE = path.resolve(ROOT, arg('root', 'dist'));
const FIX = args.includes('--fix');

const PLACEHOLDER = '"origin":"__LQ_ORIGIN__"';
const ORIGIN_TEST = "event.origin!==settings.origin&&event.origin!=='null'";
const ORIGIN_FIX = "(settings.origin!=='*'&&event.origin!==settings.origin&&event.origin!=='null')";

function walk(dir, out = []) {
  for (const it of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, it.name);
    if (it.isDirectory()) walk(p, out);
    else if (/\.(?:html?|mjs|js)$/i.test(it.name)) out.push(p);
  }
  return out;
}

let touched = 0;
let leftovers = 0;
const remaining = [];

for (const file of walk(SITE)) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  if (!text.includes('__LQ_ORIGIN__') && !text.includes(ORIGIN_TEST)) continue;

  let next = text.split(PLACEHOLDER).join('"origin":"*"');
  next = next.split(ORIGIN_TEST).join(ORIGIN_FIX);

  if (next !== text) {
    touched++;
    if (FIX) fs.writeFileSync(file, next);
  }
  if (next.includes('__LQ_ORIGIN__')) {
    leftovers++;
    remaining.push(path.relative(SITE, file));
  }
}

console.log(`${FIX ? '已修' : '待修'} ${touched} 个文件`);
if (leftovers) {
  console.log(`还有 ${leftovers} 个文件带着占位符，没找到能替换的写法：`);
  for (const f of remaining.slice(0, 10)) console.log('  ' + f);
}
if (!FIX) console.log('加 --fix 才会真的写回去。');
