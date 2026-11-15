#!/usr/bin/env node
/* Which images does a 精品课 body reference? */
import fs from 'node:fs';

const id = process.argv[2] || '846';
const html = fs.readFileSync('mirror/aifunengjiaoyu/courseware/' + id + '.html', 'utf8');
const imgs = [...html.matchAll(/<img[^>]*>/gi)].map((m) => m[0]);
console.log('img tags:', imgs.length);
for (const i of imgs) console.log('  ' + i.slice(0, 200));
const urls = [...new Set([...html.matchAll(/https?:\/\/[^"' )]+/g)].map((m) => m[0]))];
console.log('--- absolute urls ---');
console.log(urls.slice(0, 20).join('\n'));
