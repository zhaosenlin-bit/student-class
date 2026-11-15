#!/usr/bin/env node
/* Probe the OSS bucket for the one model whose name 404s. */
const BUCKET = 'https://tuxiaoling-glb-2026.oss-cn-shenzhen.aliyuncs.com/';
const candidates = [
  'mammalian_cell_membranes.glb',
  'mammalian_cell_membrane.glb',
  'animal_cell_membranes.glb',
  'animal_cell_membrane.glb',
  'mammalian-cell-membranes.glb',
  'cell_membranes.glb',
  'mammalian_cell.glb',
];
for (const name of candidates) {
  try {
    const r = await fetch(BUCKET + name, { method: 'HEAD' });
    console.log(`${r.status} ${name}${r.ok ? '  <- ' + r.headers.get('content-length') + ' bytes' : ''}`);
  } catch (e) {
    console.log(`ERR ${name}: ${e.message}`);
  }
}
