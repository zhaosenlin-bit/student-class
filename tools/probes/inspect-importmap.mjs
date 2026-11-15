/* Show the import map and the asset paths a course body asks for. */
import fs from 'node:fs';

for (const id of process.argv.slice(2)) {
  const t = fs.readFileSync(`mirror/aifunengjiaoyu/courseware/${id}.html`, 'utf8');
  const m = t.match(/<script[^>]*type=["']importmap["'][^>]*>([\s\S]*?)<\/script>/i);
  console.log('=====', id, 'len', t.length);
  console.log(m ? m[1].slice(0, 800) : 'no importmap');
  const p = [...new Set([...t.matchAll(/\/api\/program-assets\/[^"')\s]+/g)].map((x) => x[0]))];
  console.log('program-assets refs:', p.slice(0, 6));
  const a = [...new Set([...t.matchAll(/["'](\/assets\/[^"']+)["']/g)].map((x) => x[1]))];
  console.log('assets refs:', a.slice(0, 8));
}
