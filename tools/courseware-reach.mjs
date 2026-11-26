#!/usr/bin/env node
/*
 * Which files inside a courseware folder are actually reached?
 *
 * A courseware folder is often larger than the lesson in it needs.
 * The rest is left over from the place the lesson came from: the
 * shop's own scripts, the back office, the invoice papers.  Those
 * files are never asked for, but they are still written down and
 * still handed to whoever downloads the lesson.
 *
 * This starts at index.html and follows every local address it can
 * find — in markup, in scripts, in style sheets — and then says
 * which files in the folder nobody ever asked for.
 *
 *   node tools/courseware-reach.mjs --dir dist/courseware/lq-596
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const DIR = path.resolve(arg('dir', ''));
const OUT = arg('out', '');
if (!DIR) {
  console.error('Give a folder: --dir dist/courseware/lq-596');
  process.exit(1);
}

const TEXT = new Set([
  '.html', '.htm', '.js', '.mjs', '.cjs', '.json', '.css', '.svg',
  '.txt', '.md', '.xml', '.wasm',
]);

const read = (file) => {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return '';
  }
};

/*
 * Every place a file can name another file.  The patterns are kept
 * simple on purpose: a name that is written down is a name that has
 * to be looked at, and a name that cannot be resolved is not a
 * reason to throw the file away.
 */
const PATTERNS = [
  /\b(?:src|href|data-src|poster)\s*=\s*["']([^"']+)["']/gi,
  /\bimport\s+(?:[^"']*?\bfrom\s+)?["']([^"']+)["']/gi,
  /\bimport\s*\(\s*["']([^"']+)["']\s*\)/gi,
  /\brequire\s*\(\s*["']([^"']+)["']\s*\)/gi,
  /\bfetch\s*\(\s*["']([^"']+)["']/gi,
  /\bnew\s+URL\s*\(\s*["']([^"']+)["']/gi,
  /\burl\(\s*["']?([^"')]+)["']?\s*\)/gi,
  /["']([^"']*\.(?:js|mjs|cjs|css|json|wasm|png|jpe?g|gif|webp|avif|svg|mp3|mp4|woff2?|ttf|glb|gltf|html))["']/gi,
];

const isExternal = (ref) =>
  !ref ||
  /^(?:[a-z][a-z0-9+.-]*:|\/\/|#|data:|blob:|mailto:|tel:|javascript:)/i.test(ref);

const clean = (ref) => ref.split('#')[0].split('?')[0].trim();

/*
 * A courseware page carries a small table that says: this address on
 * the network is kept next to the page as that address.  The page
 * rewrites every request that way, so the browser never leaves the
 * folder.  The table has to be applied here too, or the copies that
 * sit in the folder look as if nobody asked for them.
 */
const CDNS = [];
const CDN_RE = /\[\s*"(https?:\/\/[^"]+)"\s*,\s*"([^"]+)"\s*\]/g;

const loadCdnMap = () => {
  const page = path.join(DIR, 'index.html');
  const text = read(page);
  CDN_RE.lastIndex = 0;
  let m;
  while ((m = CDN_RE.exec(text))) CDNS.push([m[1], m[2]]);
};

const unmap = (ref) => {
  for (const [from, to] of CDNS) {
    if (ref.startsWith(from)) return to + ref.slice(from.length);
  }
  return ref;
};

const resolveRef = (fromFile, ref) => {
  let c = clean(ref);
  if (!c || isExternal(c)) return null;
  const local = unmap(c);
  if (local !== c) {
    c = local;
  } else if (isExternal(c)) {
    return null;
  }
  const abs = path.resolve(path.dirname(fromFile), c);
  // A name that climbs out of the folder belongs to something else.
  if (!abs.startsWith(DIR)) return null;
  return abs;
};

const seen = new Set();
const queue = [path.join(DIR, 'index.html')];
const edges = [];

loadCdnMap();
{
  const entry = path.join(DIR, 'index.html');
  if (fs.existsSync(entry)) {
    seen.add(entry);
  } else {
    console.error('这个文件夹里没有 index.html');
    process.exit(1);
  }
}

const push = (from, to) => {
  if (!to) return;
  if (!fs.existsSync(to)) return;
  edges.push([path.relative(DIR, from), path.relative(DIR, to)]);
  if (seen.has(to)) return;
  seen.add(to);
  queue.push(to);
};

while (queue.length) {
  const file = queue.shift();
  const ext = path.extname(file).toLowerCase();
  if (!TEXT.has(ext)) continue;
  const text = read(file);
  if (!text) continue;
  for (const re of PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) {
      push(file, resolveRef(file, m[1]));
    }
  }
}

const all = [];
const walk = (dir) => {
  let items = [];
  try {
    items = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const it of items) {
    const full = path.join(dir, it.name);
    if (it.isDirectory()) walk(full);
    else if (it.isFile()) all.push(full);
  }
};
walk(DIR);

const unreachable = all.filter((f) => !seen.has(f));
const mb = (n) => (n / 1024 / 1024).toFixed(2);
const bytes = (files) => files.reduce((n, f) => n + fs.statSync(f).size, 0);

console.log(DIR);
console.log(`  文件总数        ${all.length}`);
console.log(`  入口可达        ${seen.size}`);
console.log(`  没人引用        ${unreachable.length}（${mb(bytes(unreachable))} MB）`);
if (process.argv.includes('--list-reachable')) {
  console.log('');
  for (const f of [...seen].sort()) {
    console.log(`    可达  ${path.relative(DIR, f)}`);
  }
}
if (unreachable.length) {
  console.log('');
  for (const f of unreachable.sort()) {
    console.log(`    ${mb(fs.statSync(f).size).padStart(9)} MB  ${path.relative(DIR, f)}`);
  }
}

if (OUT) {
  fs.writeFileSync(
    OUT,
    JSON.stringify(
      {
        dir: DIR,
        total: all.length,
        reachable: [...seen].map((f) => path.relative(DIR, f)).sort(),
        unreachable: unreachable.map((f) => path.relative(DIR, f)).sort(),
        unreachableBytes: bytes(unreachable),
      },
      null,
      1
    )
  );
  console.log('');
  console.log('报告写入', OUT);
}
