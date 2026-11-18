#!/usr/bin/env node
/*
 * 服务器在送出课件之前会改三处。这三处改的是"每一处都要一样"，所以
 * 先数一数：一门课里如果有一处不止一次，改起来就会改过头。
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOTS = ['mirror/leqixiang/courseware', 'mirror/3jcn/courseware', 'mirror/phet/courseware'];
const PATTERNS = [
  "change('waiting');",
  'function expired(){return !deadline||Date.now()>=deadline||clock()>=monotonicDeadline||Date.now()>=hardDeadline||clock()>=hardMonotonicDeadline;}',
  "if(win.parent===win){change('blocked');return;}",
  'event.origin!==settings.origin',
  'Math.max(1,Math.min(45000,deadline-Date.now(),monotonicDeadline-clock()))',
];

const counts = new Map(PATTERNS.map((p) => [p, []]));
let files = 0;
for (const root of ROOTS) {
  if (!fs.existsSync(root)) continue;
  for (const name of fs.readdirSync(root)) {
    if (!name.endsWith('.html')) continue;
    files++;
    const raw = fs.readFileSync(path.join(root, name), 'utf8');
    for (const pattern of PATTERNS) {
      const n = raw.split(pattern).length - 1;
      if (n) counts.get(pattern).push([name, n]);
    }
  }
}

console.log(`看了 ${files} 门课。`);
for (const pattern of PATTERNS) {
  const list = counts.get(pattern);
  const total = list.reduce((sum, [, n]) => sum + n, 0);
  const odd = list.filter(([, n]) => n !== 1);
  console.log(`\n${pattern}\n  共 ${total} 处，涉及 ${list.length} 个文件`);
  if (odd.length) {
    console.log('  不是正好一处的地方：');
    for (const [name, n] of odd.slice(0, 10)) console.log(`    ${name}  ${n} 处`);
  }
}
