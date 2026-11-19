#!/usr/bin/env node
/*
 * Where else does another house's name sit in the pages?
 *
 * The brand check looks at what a reader sees.  This looks at the
 * metadata around it: the description, the keywords, the author.  A
 * learner never sees those, but they are in the source of every page
 * and they travel with a copy of the page.
 *
 *   node tools/audit-lq-brand-meta.mjs
 *   node tools/audit-lq-brand-meta.mjs --apply
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APPLY = process.argv.includes('--apply');

/* The names that have no business being in our pages. */
const NAMES = /3JCN|new3jcn|PhET|Aviary|Phy\.Aviary|xbjiaoyu|aifunengjiaoyu/gi;

const DIRS = [
  path.join(ROOT, 'mirror', 'leqixiang', 'courseware'),
  path.join(ROOT, 'mirror', '3jcn', 'courseware'),
  path.join(ROOT, 'mirror', 'aviary', 'courseware'),
  path.join(ROOT, 'mirror', 'phet', 'courseware'),
  path.join(ROOT, 'mirror', 'labsims', 'courseware'),
  path.join(ROOT, 'mirror', 'tongjiang', 'courseware'),
  path.join(ROOT, 'mirror', 'openlab', 'courseware'),
  path.join(ROOT, 'mirror', 'xbjiaoyu', 'courseware'),
];

/*
 * Only the writing is touched: a description, a set of keywords, an
 * author, a title.  An address is left alone — the paths in these
 * pages are rewritten when the library is built, and rewriting them
 * here would break them.
 */
const META = /<meta\b([^>]*)\bcontent\s*=\s*(["'])([^"']*)\2/gi;
const WRITING = /^\s*(?:name|property)\s*=\s*["'](?:description|keywords|author|og:description|og:site_name|application-name|og:application_name|twitter:title|twitter:description)["']/i;
const ADDRESS = /^\s*(?:\/|https?:)/i;

const hits = [];
const jobs = [];
for (const dir of DIRS) {
  if (!fs.existsSync(dir)) continue;
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.html')) continue;
    const file = path.join(dir, name);
    const before = fs.readFileSync(file, 'utf8');
    const after = before.replace(META, (m, attrs, quote, mid) => {
      if (!WRITING.test(attrs) || ADDRESS.test(mid)) return m;
      if (!NAMES.test(mid)) {
        NAMES.lastIndex = 0;
        return m;
      }
      NAMES.lastIndex = 0;
      const cleaned = mid.replace(NAMES, '乐启享');
      hits.push({ file: path.relative(ROOT, file), was: mid, now: cleaned });
      return `<meta${attrs}content=${quote}${cleaned}${quote}`;
    });
    if (after !== before) jobs.push({ file, before, after });
  }
}

console.log(`元数据里带别家名字的地方：${hits.length} 处，涉及 ${jobs.length} 个文件。`);
for (const hit of hits.slice(0, 20)) {
  console.log(`  ${hit.file}\n    ${hit.was.slice(0, 120)}\n    → ${hit.now.slice(0, 120)}`);
}
if (hits.length > 20) console.log(`  …还有 ${hits.length - 20} 处`);

if (!APPLY) {
  console.log('（检查模式，没有写入）');
  process.exit(0);
}
for (const job of jobs) {
  fs.writeFileSync(job.file, job.after);
  console.log(`改好了 ${path.relative(ROOT, job.file)}`);
}
