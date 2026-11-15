#!/usr/bin/env node
/* List the 3D models the 图小灵 assistant's scene bar loads. */
import fs from 'node:fs';

const file =
  process.argv[2] ||
  'mirror/aifunengjiaoyu/assets/tuxiaoling/js/assets-data.js';
const text = fs.readFileSync(file, 'utf8');
const glb = [...new Set(text.match(/https:\/\/tuxiaoling-glb-2026[^'"\s]+/g) || [])];
console.log(`${glb.length} models referenced in ${file}`);
for (const g of glb) console.log(`  ${g.split('/').pop()}`);
