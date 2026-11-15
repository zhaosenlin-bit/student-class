/* How many course bodies point their base at the platform's asset prefix? */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CW = path.join(ROOT, 'mirror', 'leqixiang', 'courseware');

const rows = [];
for (const name of fs.readdirSync(CW).filter((n) => n.endsWith('.html'))) {
  const text = fs.readFileSync(path.join(CW, name), 'utf8');
  const m = text.match(/<base href="\/api\/program-assets\/[^"]*">/g);
  if (m) rows.push([name.replace(/\.html$/, ''), m[0]]);
}
console.log('bodies with a program-assets base:', rows.length);
for (const [id, tag] of rows.slice(0, 60)) console.log(`  ${id.padEnd(12)} ${tag}`);
