/*
 * The build step empties mirror/leqixiang/courseware and fills it again
 * from the two source mirrors.  The files that were pulled from the
 * outside — the mirrored CDNs, the web fonts — belong to the source of a
 * work, so they are copied back there to survive another build.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LQ = path.join(ROOT, 'mirror', 'leqixiang', 'courseware');
const AFE = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'courseware');
const XB = path.join(ROOT, 'mirror', 'xbjiaoyu', 'courseware');

const copy = (from, to) => {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
};

let files = 0;
let bytes = 0;

for (const name of fs.readdirSync(LQ)) {
  if (!name.endsWith('.assets')) continue;
  const ext = path.join(LQ, name, '_ext');
  if (!fs.existsSync(ext)) continue;

  const afe = name.startsWith('afe-');
  const target = afe ? path.join(AFE, `${name.slice(4)}.assets`) : path.join(XB, name);

  const walk = (dir, rel) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const f = path.join(dir, e.name);
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(f, r);
      else {
        const to = path.join(target, '_ext', r);
        const size = fs.statSync(f).size;
        if (fs.existsSync(to) && fs.statSync(to).size === size) continue;
        copy(f, to);
        files++;
        bytes += size;
      }
    }
  };
  walk(ext, '');
}

console.log(`copied ${files} files (${(bytes / 1048576).toFixed(1)} MB) back to the source mirrors`);
