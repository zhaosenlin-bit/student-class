/* List the files a course body asks for, and which of them are on disk. */
import fs from 'node:fs';
import path from 'node:path';

const body = process.argv[2];
const dir = process.argv[3] || path.join(path.dirname(body), path.basename(body).replace(/\.html$/, '.assets'));
const t = fs.readFileSync(body, 'utf8');

const refs = new Set();
for (const m of t.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)) refs.add(m[1]);
for (const m of t.matchAll(/["'`]\/api\/program-assets\/[^"'`\s]+["'`]/g)) refs.add(m[0].slice(1, -1));
for (const m of t.matchAll(/\bimport\s*(?:[^'"]*?\bfrom\s*)?["']([^"']+)["']/g)) refs.add(m[1]);

const base = t.match(/<base[^>]*href="([^"]+)"/i)?.[1] || '';
console.log('base:', base);
console.log('refs:');
for (const r of refs) {
  let rel = r;
  if (base && r.startsWith(base)) rel = r.slice(base.length);
  else if (r.startsWith('/api/program-assets/')) rel = r.replace(/^\/api\/program-assets\/[^/]+\/(?:t\/[^/]+\/)?/, '');
  if (!rel || /^https?:/i.test(rel) || rel.startsWith('data:')) {
    console.log(`   [ext] ${r.slice(0, 100)}`);
    continue;
  }
  const onDisk = fs.existsSync(path.join(dir, rel));
  console.log(`   ${onDisk ? 'have' : 'MISS'} ${rel}`);
}
