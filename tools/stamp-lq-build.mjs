/*
 * Stamp the build mark into the site.
 *
 * Every release of the library gets a mark of its own.  The mark goes
 * into the head of the page, and it is also used as the cache-buster on
 * the scripts the page pulls in, so a browser that is handed a new page
 * is also handed new scripts.
 *
 * Usage:
 *   node tools/stamp-lq-build.mjs            # a mark from the clock
 *   node tools/stamp-lq-build.mjs lq-202611202015
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = path.join(root, 'mirror', 'leqixiang', 'site');

const pad = (n) => String(n).padStart(2, '0');
const stamp = new Date();
const clock =
  `${stamp.getFullYear()}${pad(stamp.getMonth() + 1)}${pad(stamp.getDate())}` +
  `${pad(stamp.getHours())}${pad(stamp.getMinutes())}`;

const build = (process.argv[2] || `lq-${clock}`).trim();
if (!/^lq-[A-Za-z0-9-]+$/.test(build)) {
  console.error(`这个标记不合适: ${build}`);
  process.exit(1);
}

/* Every file that carries a cache-buster of the old build. */
const files = ['index.html', 'app.js', 'lq-preview.js', 'lq-folds.js'];
let stamped = 0;

for (const name of files) {
  const file = path.join(site, name);
  if (!fs.existsSync(file)) continue;
  const before = fs.readFileSync(file, 'utf8');
  let after = before.replace(/\?v=lq-[A-Za-z0-9-]+/g, `?v=${build}`);
  if (name === 'index.html') {
    if (/<meta\s+name="lq-build"/.test(after)) {
      after = after.replace(
        /(<meta\s+name="lq-build"\s+content=")[^"]*(")/,
        `$1${build}$2`,
      );
    } else {
      after = after.replace(
        /<meta\s+name="theme-color"\s+content="[^"]*">/,
        (m) => `${m}<meta name="lq-build" content="${build}">`,
      );
    }
  }
  if (after !== before) {
    fs.writeFileSync(file, after);
    stamped += 1;
    console.log(`改好了 ${name}`);
  }
}

console.log(`构建标记 ${build}，动了 ${stamped} 个文件。`);
