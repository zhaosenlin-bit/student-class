/*
 * 查新补的作品还缺哪些素材。
 *
 * 正文里点名的每个文件都要在本地；缺一个，课堂上演示就会有一处空白。
 * 这个工具重新开一次租约，把正文点名的文件和本地的文件对一遍，
 * 把缺的和多出来的都列出来。
 *
 *   node tools/check-afe-new-assets.mjs 1393 1400
 */
import fs from 'node:fs';
import path from 'node:path';
import { refsOf, assetRootOf } from './afe-crawl.mjs';

const ROOT = path.resolve('.');
const CW = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'courseware');
const ids = process.argv.slice(2).filter((a) => /^\d+$/.test(a));
if (!ids.length) {
  console.log('用法：node tools/check-afe-new-assets.mjs <作品号...>');
  process.exit(0);
}

for (const id of ids) {
  const file = path.join(CW, `${id}.html`);
  if (!fs.existsSync(file)) {
    console.log(`${id}: 本地没有正文`);
    continue;
  }
  const html = fs.readFileSync(file, 'utf8');
  const root = assetRootOf(html) || '';
  const refs = refsOf(html);
  const missing = [];
  const present = [];
  for (const ref of refs) {
    if (/^https?:\/\//i.test(ref)) {
      const local = path.join(CW, `${id}.assets`, '_ext', new URL(ref).host, new URL(ref).pathname);
      (fs.existsSync(local) ? present : missing).push(ref);
      continue;
    }
    let rel = ref;
    if (root && ref.startsWith(root)) rel = decodeURIComponent(ref.slice(root.length));
    else if (ref.startsWith('/api/program-assets/')) rel = ref.replace(/^\/+/, '');
    else rel = rel.replace(/^\/+/, '');
    const local = path.join(CW, `${id}.assets`, rel);
    (fs.existsSync(local) ? present : missing).push(ref);
  }
  console.log(`\n${id}  正文点名 ${refs.length} 个文件，在本地 ${present.length}，缺 ${missing.length}`);
  for (const m of missing) console.log(`   缺 ${m}`);
}
