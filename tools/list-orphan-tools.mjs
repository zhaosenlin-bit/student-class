/*
 * Which tools does nothing else use?
 *
 * A tool that no other tool calls and that the README does not mention
 * was written to answer one question once.  The list is what the cleanup
 * works from.
 */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const files = execFileSync('git', ['-c', 'core.quotepath=false', 'ls-files', 'tools'], {
  encoding: 'utf8',
})
  .split('\n')
  .filter(Boolean);

const named = new Set(files.map((f) => f.replace(/^tools\//, '')));
const used = new Set();

const importPattern = /(?:import|from)\s*\(?\s*['"]\.\/([a-z0-9._-]+\.mjs)['"]/gi;
const pathPattern = /tools[\\/]+([a-z0-9._-]+\.mjs)/gi;

for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  for (const m of text.matchAll(importPattern)) used.add(m[1]);
  for (const m of text.matchAll(pathPattern)) used.add(m[1]);
}

const readme = fs.readFileSync('README.md', 'utf8');
for (const m of readme.matchAll(pathPattern)) used.add(m[1]);

const orphans = files.filter((f) => !used.has(f.replace(/^tools\//, '')));
fs.writeFileSync('recon/scratch/orphan-tools.txt', orphans.join('\n'));
console.log(`工具总数 ${files.length}`);
console.log(`有人在用 ${files.length - orphans.length}`);
console.log(`没人用 ${orphans.length}`);
console.log(orphans.map((f) => f.replace('tools/', '')).join(' '));
