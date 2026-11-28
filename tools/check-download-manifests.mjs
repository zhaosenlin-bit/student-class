#!/usr/bin/env node
/*
 * 下载清单本身对不对。
 *
 * 线上取一遍文件，只能发现「现在取不到」。这一份在本地把每一门课件的
 * 下载清单从头到尾读一遍，找的是另外两种毛病——清单自己写错了：
 *
 *   - 路径里混进了反斜杠或者重复的斜杠。这种地址在浏览器里取不到，
 *     打包出来的课件就会少文件。
 *   - 清单里列了一个本地根本不存在的文件。这种地址同样取不到。
 *
 *   node tools/check-download-manifests.mjs --root dist
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
const OUT = arg('out', '');

const courseDir = path.join(SITE, 'courseware');
const ids = fs
  .readdirSync(courseDir, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

const problems = [];
let entries = 0;

for (const id of ids) {
  const manifestPath = path.join(courseDir, id, 'download.json');
  if (!fs.existsSync(manifestPath)) {
    problems.push({ id, why: 'no-manifest' });
    continue;
  }
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (e) {
    problems.push({ id, why: 'bad-json', err: String(e && e.message) });
    continue;
  }
  const list = manifest.entries || [];
  entries += list.length;

  for (const [name, rel] of list) {
    if (typeof rel !== 'string' || !rel) {
      problems.push({ id, why: 'empty-path', name });
      continue;
    }
    /* 地址里不该出现反斜杠，也不该出现重复的斜杠。 */
    if (rel.includes('\\')) {
      problems.push({ id, why: 'backslash', name, rel });
      continue;
    }
    if (rel.includes('//')) {
      problems.push({ id, why: 'double-slash', name, rel });
      continue;
    }
    /* 清单里的地址只能是相对地址，不能是站外的地址。 */
    if (/^[a-z]+:|^\/\//i.test(rel)) {
      problems.push({ id, why: 'absolute', name, rel });
      continue;
    }

    /* 对上本地：清单里的名字和地址要指向同一个文件。 */
    const local = path.resolve(courseDir, id, rel.split('/').join(path.sep));
    if (!local.startsWith(SITE)) {
      problems.push({ id, why: 'outside-site', name, rel });
      continue;
    }
    if (!fs.existsSync(local)) {
      problems.push({ id, why: 'missing-file', name, rel });
      continue;
    }
    /*
     * 名字和地址要对得上：清单给的是给人看的文件名。
     * 例外是入口页——打包时会把 index.html 改成课件自己的名字，这是
     * 有意为之，不是毛病。
     */
    const base = rel.split('/').pop();
    const entryPage = base === 'index.html';
    if (!entryPage && name && base && name !== base && !name.endsWith(base)) {
      problems.push({ id, why: 'name-mismatch', name, rel });
    }
  }
}

const byWhy = {};
for (const p of problems) byWhy[p.why] = (byWhy[p.why] || 0) + 1;

console.log(`课件 ${ids.length} 门 · 清单 ${entries} 条 · 有问题 ${problems.length}`);
for (const [why, n] of Object.entries(byWhy)) console.log(`  ${why}: ${n}`);
for (const p of problems.slice(0, 40)) console.log('  ', JSON.stringify(p));

if (OUT) {
  fs.mkdirSync(path.dirname(path.join(ROOT, OUT)), { recursive: true });
  fs.writeFileSync(
    path.join(ROOT, OUT),
    JSON.stringify(
      { checkedAt: new Date().toISOString(), courses: ids.length, entries, problems: problems.length, detail: problems },
      null,
      2
    )
  );
}
process.exit(problems.length ? 1 : 0);
