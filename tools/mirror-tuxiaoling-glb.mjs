#!/usr/bin/env node
/*
 * Mirror the 3D models the 图小灵 assistant's scene bar loads.
 *
 * They live in a public Aliyun OSS bucket and are referenced by absolute URL
 * from tuxiaoling/js/assets-data.js.  We keep them, but serve them from the
 * local mirror and rewrite the URLs to /tuxiaoling/models/<file>.glb.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'C:/kaifa/xiaobai-class';
const ASSETS = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'assets');
const DATA_FILE = path.join(ASSETS, 'tuxiaoling', 'js', 'assets-data.js');
const OUT_DIR = path.join(ASSETS, 'tuxiaoling', 'models');
const BUCKET = 'https://tuxiaoling-glb-2026.oss-cn-shenzhen.aliyuncs.com/';

fs.mkdirSync(OUT_DIR, { recursive: true });

const text = fs.readFileSync(DATA_FILE, 'utf8');
const urls = [...new Set(text.match(/https:\/\/tuxiaoling-glb-2026[^'"\s]+/g) || [])];
console.log(`${urls.length} models to mirror`);

let ok = 0;
for (const url of urls) {
  const name = url.split('/').pop();
  const dest = path.join(OUT_DIR, name);
  if (fs.existsSync(dest)) {
    ok++;
    continue;
  }
  try {
    const r = await fetch(url);
    if (!r.ok) {
      console.warn(`  skip ${name}: HTTP ${r.status}`);
      continue;
    }
    const buf = Buffer.from(await r.arrayBuffer());
    fs.writeFileSync(dest, buf);
    ok++;
    console.log(`  ${name}  ${(buf.length / 1048576).toFixed(2)} MB`);
  } catch (e) {
    console.warn(`  skip ${name}: ${e.message}`);
  }
}

// Point the data file at the local copies.
let patched = text;
for (const url of urls) {
  const name = url.split('/').pop();
  patched = patched.split(url).join(`/tuxiaoling/models/${name}`);
}
if (patched !== text) {
  fs.writeFileSync(DATA_FILE, patched, 'utf8');
  console.log('rewrote assets-data.js to local model paths');
}
console.log(`${ok}/${urls.length} models available locally`);
