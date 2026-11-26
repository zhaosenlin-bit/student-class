#!/usr/bin/env node
/*
 * Looks for the same bytes sitting in two places.
 *
 * Two files that hold the same bytes take up the room twice.  On a
 * disk that is given away, that room is worth something, and the
 * only honest way to find these is to read the files and compare
 * their contents: the names are not to be trusted, and neither is
 * the size.
 *
 *   node tools/audit-duplicates.mjs --roots mirror/studio/courseware mirror/leqixiang/courseware
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const roots = (arg('roots', '') || '')
  .split(',')
  .map((r) => r.trim())
  .filter(Boolean);
const OUT = arg('out', '');

const walk = (dir) => {
  const out = [];
  let items = [];
  try {
    items = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const it of items) {
    const full = path.join(dir, it.name);
    if (it.isDirectory()) out.push(...walk(full));
    else if (it.isFile()) out.push(full);
  }
  return out;
};

const hash = (file) =>
  new Promise((resolve, reject) => {
    const h = crypto.createHash('md5');
    const s = fs.createReadStream(file);
    s.on('data', (c) => h.update(c));
    s.on('end', () => resolve(h.digest('hex')));
    s.on('error', reject);
  });

if (roots.length < 2) {
  console.error('Give at least two folders: --roots a,b');
  process.exit(1);
}

const sets = [];
for (const root of roots) {
  const files = walk(root);
  const byHash = new Map();
  let bytes = 0;
  for (const file of files) {
    const size = fs.statSync(file).size;
    bytes += size;
    const digest = await hash(file);
    if (!byHash.has(digest)) byHash.set(digest, { size, files: [] });
    byHash.get(digest).files.push(file);
  }
  sets.push({ root, files, bytes, byHash });
  console.log(
    `${root}: ${files.length} 个文件, ${(bytes / 1024 / 1024).toFixed(1)} MB, ${byHash.size} 份不同的内容`
  );
}

/* How much of the later folders is already held by the earlier ones? */
const lines = [];
for (let i = 1; i < sets.length; i++) {
  const other = sets[i];
  let sameBytes = 0;
  let sameFiles = 0;
  const onlyHere = [];
  for (const [digest, entry] of other.byHash) {
    let found = false;
    for (let j = 0; j < i; j++) {
      if (sets[j].byHash.has(digest)) {
        found = true;
        break;
      }
    }
    if (found) {
      /*
       * Every copy of these bytes in this folder is one copy too many:
       * the same content is already on disk somewhere else.
       */
      sameBytes += entry.size * entry.files.length;
      sameFiles += entry.files.length;
    } else {
      onlyHere.push(entry);
    }
  }
  const uniqueBytes = onlyHere.reduce((sum, e) => sum + e.size * e.files.length, 0);
  lines.push({
    folder: other.root,
    files: other.files.length,
    bytes: other.bytes,
    duplicatedFiles: sameFiles,
    duplicatedBytes: sameBytes,
    uniqueFiles: other.files.length - sameFiles,
    uniqueBytes,
  });
  console.log(
    `\n${other.root}\n` +
      `  与前面相同的: ${sameFiles} 个文件, ${(sameBytes / 1024 / 1024).toFixed(1)} MB（这些只占一份磁盘就够）\n` +
      `  只此一份的:   ${other.files.length - sameFiles} 个文件, ${(uniqueBytes / 1024 / 1024).toFixed(1)} MB`
  );
}

if (OUT) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(
    OUT,
    JSON.stringify({ checkedAt: new Date().toISOString(), roots, sets: lines }, null, 2)
  );
  console.log('\n报告写入', OUT);
}
