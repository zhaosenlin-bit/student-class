#!/usr/bin/env node
/* Show the surroundings of every "premium/" mention in the captured bundles. */
import fs from 'node:fs';

const files = process.argv.slice(2);
for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  console.log(`\n===== ${file} =====`);
  const seen = new Set();
  for (const m of src.matchAll(/premium\/[a-zA-Z0-9_\-/{}$.:]*"/g)) {
    const at = m.index;
    const key = m[0];
    if (seen.has(key)) continue;
    seen.add(key);
    console.log(`--- ${key}`);
    console.log(src.slice(Math.max(0, at - 160), at + 160).replace(/\s+/g, ' '));
  }
}
