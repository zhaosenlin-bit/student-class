#!/usr/bin/env node
/*
 * Report every external URL referenced by the mirrored courseware so we know
 * which lessons still depend on the network.
 */
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2];
const rows = [];
for (const name of fs.readdirSync(dir).sort()) {
  if (!name.endsWith('.html')) continue;
  const text = fs.readFileSync(path.join(dir, name), 'utf8');
  const urls = new Set();
  for (const m of text.matchAll(/https?:\/\/[^\s"'`)<>\\]+/g)) urls.add(m[0]);
  const external = [...urls].filter(
    (u) => !u.includes('xbjiaoyu.com') && !u.includes('localhost')
  );
  rows.push({ name, bytes: text.length, external });
}

let clean = 0;
for (const row of rows) {
  if (row.external.length === 0) clean++;
  else {
    console.log(`${row.name}  (${row.external.length})`);
    for (const u of row.external.slice(0, 8)) console.log(`    ${u.slice(0, 130)}`);
  }
}
console.log(`\n${clean}/${rows.length} courseware files have no external URL references`);
