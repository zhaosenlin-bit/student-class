#!/usr/bin/env node
/*
 * Drop the throwaway artefacts of the build: the decompressed package
 * tarballs in the download cache, the empty scratch directory, and the
 * helper script REA left in the capture folder.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'C:/kaifa/xiaobai-class';

const cache = path.join(ROOT, 'tools', '.cache');
if (fs.existsSync(cache)) {
  let freed = 0;
  let n = 0;
  for (const f of fs.readdirSync(cache)) {
    if (!f.endsWith('.tar')) continue;
    const p = path.join(cache, f);
    freed += fs.statSync(p).size;
    fs.unlinkSync(p);
    n++;
  }
  console.log(`cache: removed ${n} tarballs, ${(freed / 1048576).toFixed(0)} MB freed`);
}

for (const rel of ['recon/captures/.deobf-helper.mjs', 'site']) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) continue;
  const stat = fs.statSync(p);
  if (stat.isDirectory()) {
    if (fs.readdirSync(p).length) {
      console.log(`kept ${rel} (not empty)`);
      continue;
    }
    fs.rmdirSync(p);
  } else {
    fs.unlinkSync(p);
  }
  console.log(`removed ${rel}`);
}
