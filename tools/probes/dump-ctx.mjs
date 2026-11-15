import fs from 'node:fs';

const file = process.argv[2];
const needle = process.argv[3];
const t = fs.readFileSync(file, 'utf8');
let i = -1;
let n = 0;
while ((i = t.indexOf(needle, i + 1)) >= 0 && n < 3) {
  console.log(`@${i}: ${JSON.stringify(t.slice(Math.max(0, i - 60), i + 120))}`);
  n++;
}
if (!n) console.log('not found:', needle);
