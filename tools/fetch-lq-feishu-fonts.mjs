#!/usr/bin/env node
/*
 * The Chinese web fonts of the two hosted courseware pages.
 *
 * Those pages ask a font service for Noto Sans SC and Noto Serif SC,
 * and the font service hands out a hundred small files per family.
 * A lesson that is opened on a machine without a network shows nothing
 * at all, and one that is opened with a network reaches out to a house
 * that has nothing to do with this library.
 *
 * So the stylesheet and every font file it names are kept here, and
 * the stylesheet is rewritten to point at the local copy.
 *
 *   node tools/fetch-lq-feishu-fonts.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXT = path.join(ROOT, 'mirror', 'leqixiang', '_shared-ext');
const CSS_DIR = path.join(EXT, 'miaoda.feishu.cn', 'fonts');
const FONT_ROOT = path.join(EXT, 'sf3-scmcdn-cn.feishucdn.com');
const CSS_FILE = path.join(CSS_DIR, 'css2');

const FAMILIES = [
  'Noto+Sans+SC:wght@300;400;500;700;900',
  'Noto+Serif+SC:wght@400;600;700;900',
];

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const get = async (url) => {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
};

const blocks = [];
const seen = new Set();

for (const family of FAMILIES) {
  const url = `https://miaoda.feishu.cn/fonts/css2?family=${family}&display=swap`;
  process.stdout.write(`取 ${family} … `);
  const css = (await get(url)).toString('utf8');
  let n = 0;
  for (const block of css.split(/(?=@font-face\s*\{)/)) {
    if (!block.includes('@font-face')) continue;
    if (seen.has(block)) continue;
    seen.add(block);
    blocks.push(block);
    n++;
  }
  console.log(`${n} 段`);
}

/*
 * The font files are addressed by the service that gave them out.
 * Here they are addressed by the library that keeps them, so a lesson
 * never asks a stranger for a letter.
 */
const merged = blocks
  .join('')
  .replace(
    /https:\/\/sf3-scmcdn-cn\.feishucdn\.com\//g,
    '/_shared/sf3-scmcdn-cn.feishucdn.com/'
  );

fs.mkdirSync(CSS_DIR, { recursive: true });
fs.writeFileSync(CSS_FILE, merged, 'utf8');
console.log(`样式表：${CSS_FILE}（${blocks.length} 段，${(merged.length / 1024).toFixed(0)} KB）`);

const urls = [
  ...new Set(
    [...merged.matchAll(/\/_shared\/sf3-scmcdn-cn\.feishucdn\.com\/[^)"'\s]+/g)].map(
      (m) => m[0]
    )
  ),
];

let done = 0;
let bytes = 0;
for (const local of urls) {
  const rel = local.replace('/_shared/', '');
  const target = path.join(EXT, rel.replace(/\//g, path.sep));
  if (fs.existsSync(target)) {
    done++;
    continue;
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const data = await get('https://sf3-scmcdn-cn.feishucdn.com/' + rel.split('/').slice(1).join('/'));
  fs.writeFileSync(target, data);
  bytes += data.length;
  done++;
  if (done % 20 === 0) console.log(`  ${done}/${urls.length}`);
}
console.log(`字体文件：${done} 个，新增 ${(bytes / 1024 / 1024).toFixed(1)} MB`);
