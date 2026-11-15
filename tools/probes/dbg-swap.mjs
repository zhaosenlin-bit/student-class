#!/usr/bin/env node
/* Why does the function swap not land? */
import fs from 'node:fs';

const js = fs.readFileSync('mirror/xbjiaoyu/assets/app.js', 'utf8');
const head = 'function downloadGalleryFilters(){';
const start = js.indexOf(head);
console.log('start', start);
const end = js.indexOf('\n}\n', start);
console.log('end', end);
console.log('around end:', JSON.stringify(js.slice(end - 60, end + 60)));
console.log('slice after end+3:', JSON.stringify(js.slice(end + 3, end + 80)));
