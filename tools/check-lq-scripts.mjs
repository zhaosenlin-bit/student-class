#!/usr/bin/env node
/*
 * The syntax of every script a course carries.
 *
 * A courseware file is one big HTML page with the program inside it.
 * One broken character in that program is enough to stop the whole
 * course from starting, and a reader sees nothing but a blank frame --
 * so the programs are read here, one by one, with the same parser
 * the browser uses.
 *
 *   node tools/check-lq-scripts.mjs              # every course
 *   node tools/check-lq-scripts.mjs --only phet  # one family
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CW = path.join(ROOT, 'mirror', 'leqixiang', 'courseware');

const args = process.argv.slice(2);

/*
 * A module is read by the parser of a module, and that parser lives
 * behind a flag.  Rather than leave the module scripts unchecked, the
 * run is started again with the flag on.
 */
if (typeof vm.SourceTextModule !== 'function') {
  const again = spawnSync(
    process.execPath,
    ['--experimental-vm-modules', fileURLToPath(import.meta.url), ...args],
    { stdio: 'inherit' }
  );
  process.exit(again.status ?? 1);
}

const only = (() => {
  const i = args.indexOf('--only');
  return i >= 0 && args[i + 1] ? args[i + 1].trim() : '';
})();

if (!fs.existsSync(CW)) {
  console.error('课件目录还没有构建出来：mirror/leqixiang/courseware');
  process.exit(2);
}

/*
 * A script block is taken out of the page first.  The page is a
 * document, so the block may be a module, and a module is read with
 * the module goal; anything else is read as a plain script.
 */
const readScripts = (html) => {
  const out = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    const attrs = m[1] || '';
    const type = (/\btype\s*=\s*["']?([^"'\s>]+)/i.exec(attrs)?.[1] || '').toLowerCase();
    if (type && type !== 'module' && type !== 'text/javascript' && type !== 'application/javascript') {
      continue;
    }
    out.push({ code: m[2], module: type === 'module', index: out.length });
  }
  return out;
};

let files = 0;
let scripts = 0;
const broken = [];

/* The program of a course is sometimes kept in a file next to it. */
const externals = new Set();

for (const name of fs.readdirSync(CW)) {
  if (!name.endsWith('.html')) continue;
  if (only && !name.startsWith(only)) continue;
  const full = path.join(CW, name);
  const html = fs.readFileSync(full, 'utf8');
  files++;
  for (const s of readScripts(html)) {
    scripts++;
    try {
      if (s.module) {
        new vm.SourceTextModule(s.code, { identifier: `${name}#${s.index}` });
      } else {
        new vm.Script(s.code, { filename: `${name}#${s.index}` });
      }
    } catch (err) {
      broken.push({ file: name, index: s.index, message: String(err.message).slice(0, 200) });
    }
  }
  for (const m of html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)) {
    const src = m[1].split(/[?#]/)[0];
    if (!/^[^a-z]+:\/\//i.test(src) && !src.startsWith('//')) externals.add(src);
  }
}

let extra = 0;
for (const src of externals) {
  const full = path.join(CW, src.replace(/^\//, '').replace(/\.\./g, ''));
  if (!fs.existsSync(full) || !/\.(?:js|mjs)$/i.test(full)) continue;
  extra++;
  scripts++;
  try {
    new vm.Script(fs.readFileSync(full, 'utf8'), { filename: src });
  } catch (err) {
    broken.push({ file: src, index: 0, message: String(err.message).slice(0, 200) });
  }
}

console.log(`读了 ${files} 个课件，${scripts} 段脚本`);
if (!broken.length) {
  console.log('每一段脚本都读得懂');
  process.exit(0);
}
console.log(`读不懂的脚本：${broken.length} 段`);
for (const b of broken.slice(0, 40)) {
  console.log(`  ${b.file}  第 ${b.index + 1} 段  ${b.message}`);
}
process.exit(1);
