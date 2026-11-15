#!/usr/bin/env node
/* What did the 精品课 pull actually leave on disk? */
import fs from 'node:fs';
import path from 'node:path';

const CW = 'mirror/aifunengjiaoyu/courseware';
const cat = JSON.parse(fs.readFileSync('mirror/aifunengjiaoyu/premium/catalogue.json', 'utf8'));
const free = cat.courses.filter((c) => c.freeSample);

function walk(dir) {
  let files = 0;
  let bytes = 0;
  if (!fs.existsSync(dir)) return { files, bytes };
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = walk(full);
      files += sub.files;
      bytes += sub.bytes;
    } else {
      files++;
      bytes += fs.statSync(full).size;
    }
  }
  return { files, bytes };
}

let total = 0;
for (const c of free) {
  const id = c.programId;
  const html = fs.readFileSync(path.join(CW, `${id}.html`), 'utf8');
  const base = (html.match(/<base[^>]*href="([^"]+)"/i) || [])[1] || '(none)';
  const { files, bytes } = walk(path.join(CW, `${id}.assets`));
  total += bytes;
  console.log(
    String(id).padStart(5),
    String(files).padStart(4),
    'files',
    String(Math.round(bytes / 1024)).padStart(7) + 'KB',
    base.slice(0, 52).padEnd(54),
    String(c.title).slice(0, 20)
  );
}
console.log('premium assets total:', Math.round(total / 1024 / 1024), 'MB');

/* The works use the same folder layout; compare for reference. */
const works = JSON.parse(fs.readFileSync('mirror/aifunengjiaoyu/programs-all.json', 'utf8'));
let worksTotal = 0;
let worksFiles = 0;
for (const w of works) {
  const { files, bytes } = walk(path.join(CW, `${w.id}.assets`));
  worksTotal += bytes;
  worksFiles += files;
}
console.log('works assets total:', Math.round(worksTotal / 1024 / 1024), 'MB /', worksFiles, 'files');
