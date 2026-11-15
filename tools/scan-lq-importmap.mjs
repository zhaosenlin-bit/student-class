/* Show the import map of a course body. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CW = path.join(ROOT, 'mirror', 'leqixiang', 'courseware');

for (const id of process.argv.slice(2)) {
  const file = path.join(CW, `${id}.html`);
  if (!fs.existsSync(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  const m = text.match(/<script[^>]*type=["']importmap["'][^>]*>([\s\S]*?)<\/script>/i);
  console.log(`\n${id}`);
  console.log(m ? m[1].trim().replace(/\s+/g, ' ') : '(no import map)');
}
