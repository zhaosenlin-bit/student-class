/* Look at one mirrored program and say what it still asks for. */
import fs from 'node:fs';

const file = process.argv[2] || 'GraduatedCylinder';
const text = fs.readFileSync(`mirror/aviary/courseware/${file}.html`, 'utf8');
console.log('bytes', text.length);

const imgs = [...text.matchAll(/<img[^>]*\ssrc="([^"]+)"/gi)].map((m) => m[1]);
console.log('img tags:', imgs.length);
for (const src of imgs) {
  if (src.startsWith('data:')) {
    console.log('  data-uri', src.length);
    continue;
  }
  console.log('  ', src);
}

const externals = [...text.matchAll(/https?:\/\/[^"'\s)]+/g)].map((m) => m[0]);
console.log('external addresses:', [...new Set(externals)].slice(0, 10));

for (const name of [
  'Initialize',
  'function initialize',
  'document.addEventListener',
  'onload',
]) {
  console.log(name, '->', (text.match(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length);
}

const scripts = [...text.matchAll(/<script[^>]*>([\s\S]{0,120})/gi)].map((m) => m[1].trim().slice(0, 90));
console.log('script heads:');
for (const s of scripts.slice(0, 20)) console.log('  ', s.replace(/\s+/g, ' '));
