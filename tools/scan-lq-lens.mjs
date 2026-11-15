/* Look at one course folder in the merged tree. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CW = path.join(ROOT, 'mirror', 'leqixiang', 'courseware');

for (const id of process.argv.slice(2)) {
  const dir = path.join(CW, `${id}.assets`);
  const out = [];
  const walk = (d, rel) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(f, r);
      else out.push(`${r} ${fs.statSync(f).size}`);
    }
  };
  if (fs.existsSync(dir)) walk(dir, '');
  console.log(`${id}.assets ->`, out.join(' | ') || '(empty)');
  const body = path.join(CW, `${id}.html`);
  if (fs.existsSync(body)) {
    const text = fs.readFileSync(body, 'utf8');
    const refs = [...new Set(text.match(/\/api\/program-assets\/[^"'<)\s]+/g) || [])];
    console.log('  refs:', refs.join('\n         ') || '(none)');
  }
}
