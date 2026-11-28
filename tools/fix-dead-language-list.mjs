#!/usr/bin/env node
/*
 * 去掉那段取不到的语言列表。
 *
 * 有 51 门课在开始的时候要一份「有哪些语言可选」的名单。当初抓的时候，
 * 那台服务器报错了，抓回来的是一段报错文字，还被塞进页面里当名单用。
 *
 * 名单塞进去以后还有第二个毛病：那段地址是 data: 形式的，浏览器会在
 * 后面接上 ?ProgramID=… ，data: 地址带查询串是不合法的，请求直接报错。
 *
 * 这个下拉框在样式里是 display:none，本来就没有人看得见它。所以这里
 * 把这段取不到的东西整个去掉：页面不再发出那个注定失败的请求，也不
 * 会把一段报错文字显示出来。
 *
 *   node tools/fix-dead-language-list.mjs --root dist
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const ROOT = path.resolve(arg('root', path.join(HERE, '..', 'dist')));

const CALL = /\$\.get\(\s*'data:application\/octet-stream;base64,[A-Za-z0-9+/=]+'\s*,\s*\{ProgramID:[^}]*\}\s*,\s*function\s*\(\s*response\s*\)\s*\{\s*\$\(\s*'#LanguageDropDown'\s*\)\.html\(\s*response\s*\)\s*;\s*\}\s*\)\s*;/g;

let fixed = 0;
let leftovers = 0;
for (const id of fs.readdirSync(path.join(ROOT, 'courseware'))) {
  const file = path.join(ROOT, 'courseware', id, 'index.html');
  if (!fs.existsSync(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes('base64,')) continue;
  const after = text.replace(
    CALL,
    '/* 语言名单没有取到，这个下拉框本来也不显示，就不去要它了。 */'
  );
  if (after === text) {
    if (/base64,[A-Za-z0-9+/=]+'\s*,\s*\{ProgramID/.test(text)) leftovers++;
    continue;
  }
  fs.writeFileSync(file, after);
  fixed++;
}

console.log(`去掉取不到的语言名单：${fixed} 门`);
if (leftovers) console.log(`还有 ${leftovers} 门写法不一样，没动`);
