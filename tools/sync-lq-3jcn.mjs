#!/usr/bin/env node
/*
 * The 3D laboratory pages, from the mirror to the library.
 *
 * The mirror keeps the pages as they were published; the library hands
 * them out under a name of ours, so a few addresses are rewritten on
 * the way.  The build does this rewriting; this tool does the same
 * thing on its own, so that a change made in the mirror can be brought
 * into the library without rebuilding everything.
 *
 *   node tools/sync-lq-3jcn.mjs            # report
 *   node tools/sync-lq-3jcn.mjs --apply    # write
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APPLY = process.argv.includes('--apply');

const SRC = path.join(ROOT, 'mirror', '3jcn', 'courseware');
const OUT = path.join(ROOT, 'mirror', 'leqixiang', 'courseware');

/* The same rewriting the build makes. */
const publish = (html) =>
  html
    .split('/api/program-assets/3jcn-')
    .join('/api/program-assets/lab-')
    .split('/courseware/3jcn-')
    .join('/courseware/lab-')
    .split('3jcn-labs-category')
    .join('lab-labs-category')
    .split('/_ext/www.new3jcn.com')
    .join('/_ext/vendor')
    .split('/_ext/new3jcn.com')
    .join('/_ext/vendor')
    .replace(/<!--\s*saved from url=\([^)]*\)[^>]*-->/gi, '');

if (!fs.existsSync(SRC)) {
  console.error('找不到镜像目录');
  process.exit(1);
}

const jobs = [];
for (const name of fs.readdirSync(SRC)) {
  if (!name.endsWith('.html')) continue;
  const id = `lab-${name.replace(/\.html$/, '').replace(/^3jcn-/, '')}`;
  const html = publish(fs.readFileSync(path.join(SRC, name), 'utf8'));
  const file = path.join(OUT, `${id}.html`);
  const before = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  if (before === html) continue;
  jobs.push({ file, before, after: html, id });
}

console.log(`${jobs.length} 个页面跟镜像对不上。`);
for (const job of jobs.slice(0, 20)) {
  console.log(`  ${path.relative(ROOT, job.file)}`);
}
if (jobs.length > 20) console.log(`  …还有 ${jobs.length - 20} 个`);

if (!APPLY) {
  console.log('（检查模式，没有写入）');
  process.exit(0);
}
for (const job of jobs) {
  fs.writeFileSync(job.file, job.after);
  console.log(`改好了 ${path.relative(ROOT, job.file)}`);
}
