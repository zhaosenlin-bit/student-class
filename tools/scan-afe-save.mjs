import fs from 'node:fs';

const id = process.argv[2] || 'afe-754';
const t = fs.readFileSync(`mirror/leqixiang/courseware/${id}.html`, 'utf8');
const key = process.argv[3] || 'function connect(';
const i = t.indexOf(key);
console.log(`### ${id} :: ${key} @${i}`);
if (i >= 0) console.log(t.slice(i, i + 2600));
console.log('\n--- nonce ---');
const j = t.indexOf('nonce');
console.log(t.slice(Math.max(0, j - 600), j + 400));
