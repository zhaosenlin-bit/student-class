#!/usr/bin/env node
/* What does a 精品课 body actually reference? */
import fs from 'node:fs';
import path from 'node:path';
import { refsOf, assetRootOf, configOf } from './afe-crawl.mjs';

const CW = 'mirror/aifunengjiaoyu/courseware';
const cat = JSON.parse(fs.readFileSync('mirror/aifunengjiaoyu/premium/catalogue.json', 'utf8'));
const free = cat.courses.filter((c) => c.freeSample);

for (const c of free) {
  const id = c.programId;
  const html = fs.readFileSync(path.join(CW, `${id}.html`), 'utf8');
  const root = assetRootOf(html);
  const refs = [...refsOf(html)];
  const dir = path.join(CW, `${id}.assets`);
  const onDisk = fs.existsSync(dir)
    ? fs.readdirSync(dir, { recursive: true }).filter((f) => fs.statSync(path.join(dir, f)).isFile())
    : [];
  const cfg = configOf(html);
  console.log(
    String(id).padStart(5),
    'html=' + String(Math.round(html.length / 1024)).padStart(4) + 'KB',
    'refs=' + String(refs.length).padStart(3),
    'entries=' + String(cfg?.entries?.length ?? 0).padStart(3),
    'onDisk=' + String(onDisk.length).padStart(3),
    '| ' + String(c.title).slice(0, 16)
  );
  if (process.env.VERBOSE) {
    console.log('    root:', root);
    console.log('    refs:', refs.slice(0, 12).join(' | '));
    console.log('    disk:', onDisk.slice(0, 12).join(' | '));
  }
}
