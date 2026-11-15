/* Which files does a course ask for at run time, relative to its base? */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CW = path.join(ROOT, 'mirror', 'leqixiang', 'courseware');

for (const id of process.argv.slice(2)) {
  const file = path.join(CW, `${id}.html`);
  if (!fs.existsSync(file)) {
    console.log(`${id}: no body`);
    continue;
  }
  const text = fs.readFileSync(file, 'utf8');
  const base = (text.match(/<base href="([^"]*)">/) || [])[1] || '(none)';
  const wanted = new Set();
  for (const m of text.matchAll(/["'`](\.\/)?([A-Za-z0-9_\-][^"'`\s]*\.[A-Za-z0-9]{2,5})["'`]/g)) {
    if (/^https?:/.test(m[2])) continue;
    wanted.add(m[2]);
  }
  for (const m of text.matchAll(/fetch\(\s*[`"']([^`"']+)[`"']/g)) {
    if (!/^https?:|^\//.test(m[1])) wanted.add(m[1]);
  }
  console.log(`\n${id}`);
  console.log('  base:', base);
  console.log('  wants:', [...wanted].join(', ') || '(nothing relative)');
}
