/* Small look at what a course folder holds and what it reaches for. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CW = path.join(ROOT, 'mirror', 'leqixiang', 'courseware');

const list = (dir) => {
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) walk(f);
      else out.push(f.replace(dir + path.sep, '') + ' ' + fs.statSync(f).size);
    }
  };
  if (fs.existsSync(dir)) walk(dir);
  return out;
};

for (const id of process.argv.slice(2)) {
  const body = path.join(CW, `${id}.html`);
  if (fs.existsSync(body)) {
    const text = fs.readFileSync(body, 'utf8');
    const urls = [...new Set(text.match(/https?:\/\/[^"'<)\s]+/g) || [])].filter((u) =>
      /storage\.googleapis|pinimg|gstatic/.test(u)
    );
    console.log(`\n${id} urls:`);
    for (const u of urls) console.log('   ', u.slice(0, 150));
  }
  console.log(`${id} gstatic:`);
  for (const f of list(path.join(CW, `${id}.assets`, '_ext', 'fonts.gstatic.com'))) console.log('   ', f);
}
