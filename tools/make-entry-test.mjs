/* Lays the package folder out flat so its entry document can be opened
   straight from disk. */
import fs from 'node:fs';
import path from 'node:path';

const src = process.argv[2] || 'mirror/leqixiang/courseware/afe-754.assets';
const dst = process.argv[3] || 'recon/scratch/dl-entry';
fs.rmSync(dst, { recursive: true, force: true });

const walk = (d) =>
  fs
    .readdirSync(d, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));

for (const file of walk(src)) {
  const out = path.join(dst, path.relative(src, file));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.copyFileSync(file, out);
}

const entry = path.join(dst, 'index.html');
let html = fs.readFileSync(entry, 'utf8');
if (!html.includes('<base')) html = html.replace('<head>', '<head><base href="./">');
fs.writeFileSync(entry, html);
console.log('prepared', dst);
