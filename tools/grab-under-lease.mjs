#!/usr/bin/env node
/*
 * Take the files a work is still missing using the lease its body already
 * carries. A lease lasts a few hours; the body of the work names the
 * files that live under it, so nothing has to be opened again.
 *
 *   node tools/grab-under-lease.mjs 563 wasm/vision_wasm_internal.wasm
 *   node tools/grab-under-lease.mjs 616 src/core/SceneManager.js vendor/three.module.js
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CW = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'courseware');
const ORIGIN = 'https://aifunengjiaoyu.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const TOKEN = fs.readFileSync(path.join(ROOT, 'recon', 'scratch', 'afe-token.txt'), 'utf8').trim();
const HEADERS = { Authorization: `Bearer ${TOKEN}`, 'User-Agent': UA, Referer: `${ORIGIN}/` };

const [id, ...rest] = process.argv.slice(2);
/* The list may arrive as one argument or as many. */
const rels = rest.flatMap((r) => r.split(/\s+/)).filter(Boolean);
const html = fs.readFileSync(path.join(CW, `${id}.html`), 'utf8');
const base = html.match(/<base[^>]*href="([^"]+)"/i)?.[1];
if (!base || !base.includes('/t/')) {
  console.log(`${id}: 正文里没有租约`);
  process.exit(1);
}
const outDir = path.join(CW, `${id}.assets`);

for (const rel of rels) {
  const clean = rel.split('?')[0];
  const target = path.join(outDir, clean);
  if (fs.existsSync(target) && fs.statSync(target).size > 0) {
    console.log(`  = ${rel} 已有`);
    continue;
  }
  let done = false;
  for (const b of [base, `/api/program-assets/${id}/`]) {
    if (done) break;
    const url = ORIGIN + b.replace(/\/$/, '') + '/' + clean.split('/').map(encodeURIComponent).join('/');
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) {
      console.log(`  . ${rel} ${res.status}`);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, buf);
    console.log(`  + ${rel}  (${(buf.length / 1024).toFixed(0)} KB)`);
    done = true;
  }
}
