/* Does a camera-launch body carry the same config blob the other bodies do? */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const text = fs.readFileSync(path.resolve(ROOT, process.argv[2]), 'utf8');
const at = text.indexOf('})({"protocol"');
console.log('config marker at', at);
if (at >= 0) {
  const slice = text.slice(at + 3, at + 900);
  console.log(slice.replace(/\s+/g, ' '));
}
const assets = text.indexOf('assetRoot');
console.log('\nassetRoot at', assets);
if (assets >= 0) console.log(text.slice(assets - 120, assets + 500).replace(/\s+/g, ' '));
