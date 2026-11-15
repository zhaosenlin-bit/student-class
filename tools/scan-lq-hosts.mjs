/* Which course bodies talk to which outside service. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CW = path.join(ROOT, 'mirror', 'leqixiang', 'courseware');
const needle = process.argv[2] || 'metis-online';

for (const name of fs.readdirSync(CW).filter((n) => n.endsWith('.html'))) {
  const text = fs.readFileSync(path.join(CW, name), 'utf8');
  if (!text.includes(needle)) continue;
  const urls = [...new Set(text.match(/https?:\/\/[^"'<)\s]+/g) || [])].filter((u) =>
    u.includes(needle)
  );
  console.log(`\n${name}`);
  for (const u of urls) console.log('   ', u.slice(0, 160));
  const version = (text.match(/tasks-vision@[\d.]+/) || [])[0];
  if (version) console.log('    version:', version);
}
