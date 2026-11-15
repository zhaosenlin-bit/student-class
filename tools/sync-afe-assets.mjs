/*
 * Move assets that were pulled straight into the merged courseware folder
 * back into the 图灵智赋 mirror, so the builder always copies from one
 * source of truth.
 */
import fs from 'node:fs';
import path from 'node:path';

const AFE = 'mirror/aifunengjiaoyu/courseware';
const LQ = 'mirror/leqixiang/courseware';

const copyDir = (from, to) => {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(src, dst);
    else {
      fs.copyFileSync(src, dst);
    }
  }
};

let files = 0;
for (const entry of fs.readdirSync(LQ, { withFileTypes: true })) {
  if (!entry.isDirectory() || !entry.name.startsWith('afe-')) continue;
  const id = entry.name.replace('afe-', '');
  const from = path.join(LQ, entry.name);
  const to = path.join(AFE, `${id}.assets`);
  if (!fs.existsSync(to)) fs.mkdirSync(to, { recursive: true });
  for (const f of walk(from)) {
    const dst = path.join(to, path.relative(from, f));
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(f, dst);
    files++;
  }
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

console.log('synced files:', files);
