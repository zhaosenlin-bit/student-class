/* Show the whole folder of one course. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CW = path.join(ROOT, 'mirror', 'leqixiang', 'courseware');

const dir = path.join(CW, `${process.argv[2]}.assets`);
const out = [];
const walk = (d, rel, depth) => {
  if (depth > 5) return;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) {
      out.push(`${r}/`);
      walk(f, r, depth + 1);
    } else out.push(`${r}  ${fs.statSync(f).size}`);
  }
};
if (fs.existsSync(dir)) walk(dir, '', 0);
console.log(out.slice(0, 80).join('\n'));
console.log('entries:', out.length);
