#!/usr/bin/env node
/*
 * Compare what the catalogue promises with what is really on disk.
 *
 * A course that is marked as installed but has no files of its own
 * opens to an empty page.  A course that has files but is not marked
 * installed never shows up in the catalogue at all.  Both are wrong in
 * the same way, and both are found here.
 *
 *   node tools/check-installed-truth.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CW = path.join(ROOT, 'mirror', 'leqixiang', 'courseware');
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'mirror', 'leqixiang', 'catalog.json'), 'utf8'));

const installed = catalog.products.filter((p) => p.localInstalled);
const promised = [];
const present = [];

for (const p of installed) {
  const dir = path.join(CW, `${p.id}.assets`);
  const entry = path.join(CW, `${p.id}.html`);
  const hasDir = fs.existsSync(dir) && fs.readdirSync(dir).length > 0;
  const hasBody = fs.existsSync(entry) && fs.statSync(entry).size > 0;
  /* The two sites keep their files differently: the 图灵 courses own a
     folder of their own, the 小白 courses keep only their body here and
     share the rest of the tree. */
  const needsFolder = p.id.startsWith('afe-');
  const ok = needsFolder ? hasDir && hasBody : hasBody;
  if (!ok) {
    promised.push({ id: p.id, title: p.title, hasDir, hasBody });
  }
}

for (const name of fs.readdirSync(CW)) {
  if (!name.endsWith('.assets')) continue;
  const id = name.replace(/\.assets$/, '');
  const p = installed.find((x) => x.id === id);
  if (p && p.id.startsWith('afe-')) continue;
  if (!p) present.push({ id, files: fs.readdirSync(path.join(CW, name)).length });
}

console.log(`目录标为已安装：${installed.length} 门`);
console.log(`标了却打不开：${promised.length} 门`);
for (const p of promised) console.log(`   ${p.id}  ${p.title}  (目录=${p.hasDir} 正文=${p.hasBody})`);
console.log(`磁盘上有却没进目录：${present.length} 门`);
for (const p of present.slice(0, 20)) console.log(`   ${p.id}  ${p.files} 个文件`);

const claimed = catalog.localReplica?.installedCount;
if (claimed !== installed.length) {
  console.log(`\n目录自报 installedCount=${claimed}，实际 ${installed.length}`);
}
