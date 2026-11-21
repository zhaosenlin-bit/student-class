/*
 * 看看作品表里哪些门本地还没有正文。
 *
 *   node tools/afe-local-gap.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('.');
const CW = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'courseware');
const works = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'programs-all.json'), 'utf8')
);

const onDisk = new Set(
  fs
    .readdirSync(CW)
    .filter((f) => f.endsWith('.html'))
    .map((f) => f.replace('.html', ''))
);

const missing = works.filter((p) => !onDisk.has(String(p.id)));
const extra = [...onDisk].filter(
  (id) => !works.some((p) => String(p.id) === id)
);

console.log('作品表', works.length, '门；本地正文', onDisk.size, '个');
console.log('缺正文', missing.length, '门：');
for (const p of missing) {
  console.log(
    `  ${String(p.id).padStart(4)} ${p.subject || '?'}/${p.type || '?'} ` +
      `${p.runtime_mode || '?'} zip=${p.is_zip} ${String(p.title).slice(0, 40)}`
  );
}
console.log('\n本地多出来的（非作品表里的）', extra.length, '个：', extra.slice(0, 20).join(','));
