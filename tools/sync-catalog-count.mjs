#!/usr/bin/env node
/*
 * 目录数据改过以后，成品里的那份也要跟着改。
 *
 * 成品里的目录不是照抄目录数据，而是把里面的图片地址改成了相对
 * 目录自己的写法（`/images/…` 变成 `./images/…`），所以不能直接
 * 覆盖过去，要把同样的改写再做一遍。
 *
 *   node tools/sync-catalog-count.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

const SRC = path.join(ROOT, 'catalog', 'catalog.json');
const OUT = path.join(ROOT, 'dist', 'catalog.json');

const CATALOG_PREFIXES = ['/brand/', '/images/', '/prod/uploads/', '/covers/'];

const rewriteValue = (value) => {
  if (typeof value === 'string') {
    if (value === '/license.html') return './license.html';
    for (const prefix of CATALOG_PREFIXES) {
      if (value.startsWith(prefix)) return './' + value.slice(1);
    }
    const launch = /^\/api\/launch\/([A-Za-z0-9_-]+)$/.exec(value);
    if (launch) return `courseware/${launch[1]}/index.html`;
    return value;
  }
  if (Array.isArray(value)) return value.map(rewriteValue);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = rewriteValue(v);
    return out;
  }
  return value;
};

const catalog = JSON.parse(fs.readFileSync(SRC, 'utf8'));
fs.writeFileSync(OUT, JSON.stringify(rewriteValue(catalog)));

console.log(`成品里的目录已更新（${(catalog.products || []).length} 门）`);
