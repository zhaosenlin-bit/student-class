#!/usr/bin/env node
/* Evaluate the template literal the build script uses for the new filter. */
import fs from 'node:fs';

const src = fs.readFileSync('tools/build-leqixiang.mjs', 'utf8');
const start = src.indexOf('`function downloadGalleryFilters(){');
const end = src.indexOf('\n}`', start);
const literal = src.slice(start, end + 2);
console.log('literal length', literal.length);
const value = eval(literal);
console.log('---- evaluated ----');
console.log(value.slice(0, 900));
console.log('...');
console.log(value.slice(-400));
