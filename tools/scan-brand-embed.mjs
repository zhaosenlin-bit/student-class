#!/usr/bin/env node
/*
 * 课件里嵌着的模块是一段 base64。文字替换看不见它，所以这里把每一段
 * base64 解开来看：里面若还留着别的名字，页面在浏览器里就会用那个
 * 名字说话，外壳听不见，课件就一直转圈。
 */
import fs from 'node:fs';
import path from 'node:path';

const roots = [
  'mirror/leqixiang/courseware',
  'mirror/3jcn/courseware',
  'mirror/phet/courseware',
];
const BRANDS = [
  'xiaobai:courseware-startup',
  'xiaobai:classroom-access',
];

const hits = [];
/* A long run of base64 characters is an embedded module. */
const b64re = /"([A-Za-z0-9+/]{4000,}={0,2})"/g;

for (const root of roots) {
  if (!fs.existsSync(root)) continue;
  for (const name of fs.readdirSync(root)) {
    if (!name.endsWith('.html')) continue;
    const file = path.join(root, name);
    const raw = fs.readFileSync(file, 'utf8');
    const plain = BRANDS.filter((b) => raw.includes(b));
    /* A leftover name that is not part of a handshake. */
    const loose = [...new Set(raw.match(/xiaobai(?!:)/g) || [])];
    const embedded = [];
    for (const m of raw.matchAll(b64re)) {
      let text;
      try {
        text = Buffer.from(m[1], 'base64').toString('utf8');
      } catch {
        continue;
      }
      for (const b of BRANDS) if (text.includes(b)) embedded.push(b);
    }
    if (plain.length || embedded.length || loose.length)
      hits.push({ file, plain, embedded, loose });
  }
}

console.log(`还在用旧协议的文件：${hits.length}`);
for (const h of hits) {
  console.log(`  ${h.file}  正文 ${JSON.stringify(h.plain)}  内嵌 ${JSON.stringify(h.embedded)}`);
}
console.log('\n正文里剩下的旧名字：');
for (const h of hits) {
  if (!h.loose || !h.loose.length) continue;
  const raw = fs.readFileSync(h.file, 'utf8');
  const around = [];
  for (const m of raw.matchAll(/.{0,40}xiaobai(?!:).{0,40}/g)) around.push(m[0]);
  console.log(`  ${h.file}  ${h.loose.length} 处  例：${around[0] || ''}`);
}
