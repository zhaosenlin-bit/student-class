#!/usr/bin/env node
/* What shapes do the 精品课 cover addresses have? */
import fs from 'node:fs';

const cat = JSON.parse(
  fs.readFileSync('mirror/aifunengjiaoyu/premium/catalogue.json', 'utf8')
);
const shapes = new Map();
for (const c of cat.courses || []) {
  const url = c.coverUrl || '';
  const shape = url.replace(/\/[^/]+$/, (m) => (m.includes('.') ? '/<file>' : m));
  const key = url.startsWith('/premium-catalogue/covers/')
    ? 'premium-catalogue/covers/<hash>.jpg'
    : url.startsWith('/uploads/public/users/')
      ? 'uploads/public/users/<id>/upload-<h>/<file>'
      : url.slice(0, 60);
  shapes.set(key, (shapes.get(key) || 0) + 1);
}
for (const [k, v] of [...shapes].sort((a, b) => b[1] - a[1])) console.log(v, k);

/* The upload path is the platform's own file tree; it is mirrored under
   /prod/uploads, so the local server can serve it from there. */
const uploads = cat.courses.filter((c) => (c.coverUrl || '').startsWith('/uploads/public/users/'));
console.log('uploads-shaped covers:', uploads.length);
console.log('sample:', uploads.slice(0, 3).map((c) => c.coverUrl).join('\n         '));
