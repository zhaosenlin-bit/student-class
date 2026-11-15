#!/usr/bin/env node
/*
 * 最后一层品牌清理：课件素材里还留着上游站点的中文字样（页面标题、Logo 文字、
 * 积分说明等）。这里把它们换成乐启享的说法，URL 路径与内部协议名不动，
 * 所以不会影响任何资源的引用关系。
 *
 *   node tools\rebrand-lq-text.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const WORDS = [
  ['图灵智赋', '乐启享'],
  ['——AI赋能教育教学', '——从乐高启蒙 到 AI 创造'],
  ['图小灵', '乐启享助手'],
];

const ROOTS = [
  path.join(ROOT, 'mirror', 'leqixiang', 'courseware'),
  path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'courseware'),
];

const TEXT = /\.(html|js|css|json|svg|txt|md)$/i;

let touched = 0;
for (const root of ROOTS) {
  if (!fs.existsSync(root)) continue;
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '_ext') continue;
        walk(full);
        continue;
      }
      if (!TEXT.test(entry.name)) continue;
      const before = fs.readFileSync(full, 'utf8');
      let after = before;
      for (const [from, to] of WORDS) after = after.split(from).join(to);
      if (after === before) continue;
      fs.writeFileSync(full, after, 'utf8');
      touched++;
      console.log(`  ${path.relative(ROOT, full)}`);
    }
  };
  walk(root);
}

/* 目录里的作者名也一并统一。 */
const catalogPath = path.join(ROOT, 'mirror', 'leqixiang', 'catalog.json');
if (fs.existsSync(catalogPath)) {
  const before = fs.readFileSync(catalogPath, 'utf8');
  const after = before.split('"author":"图灵智赋"').join('"author":"乐启享机器人"');
  if (after !== before) {
    fs.writeFileSync(catalogPath, after, 'utf8');
    console.log('  mirror/leqixiang/catalog.json (author)');
    touched++;
  }
}

console.log(`\n品牌文案已统一，更新了 ${touched} 个文件。`);
