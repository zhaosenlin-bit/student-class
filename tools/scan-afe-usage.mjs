import fs from 'node:fs';

const id = process.argv[2];
const needles = process.argv.slice(3);
const t = fs.readFileSync(`mirror/leqixiang/courseware/${id}.html`, 'utf8');
for (const n of needles) {
  let i = -1;
  let count = 0;
  while ((i = t.indexOf(n, i + 1)) >= 0 && count < 3) {
    console.log(`\n--- ${n} @${i}`);
    console.log(t.slice(Math.max(0, i - 300), i + 300).replace(/\s+/g, ' '));
    count++;
  }
}
