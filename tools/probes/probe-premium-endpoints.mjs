#!/usr/bin/env node
/* List every API path the 精品课 client bundle talks to. */
import fs from 'node:fs';

const file = process.argv[2] || 'recon/scratch/premium-catalogue_client.mjs';
const src = fs.readFileSync(file, 'utf8');
const found = new Set();
for (const m of src.matchAll(/[/'"\x60]api\/[a-zA-Z0-9_\-/{}$.:]+/g)) {
  found.add(m[0].replace(/^[/'"`]/, ''));
}
console.log([...found].sort().join('\n'));
