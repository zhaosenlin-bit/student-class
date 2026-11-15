/* Where does the 历史文物 course look for its model? */
import fs from 'node:fs';

const t = fs.readFileSync('mirror/aifunengjiaoyu/courseware/196.html', 'utf8');
for (const m of t.matchAll(/.{120}\.glb.{160}/g)) {
  console.log('...', m[0].replace(/\s+/g, ' '), '\n');
}
const uploads = [...new Set([...t.matchAll(/https:\/\/static\.aifunengjiaoyu\.com[^"'`\s)]*/g)].map((m) => m[0]))];
console.log('static urls:', uploads.slice(0, 20));
const anyUpload = [...new Set([...t.matchAll(/[^"'`\s)]*uploads[^"'`\s)]*/g)].map((m) => m[0]))];
console.log('upload paths:', anyUpload.slice(0, 20));
