import fs from 'node:fs';
import path from 'node:path';

const dir = 'mirror/leqixiang/courseware';
const files = fs.readdirSync(dir).filter((f) => f.startsWith('afe-') && f.endsWith('.html'));
console.log('afe bodies:', files.length, files.map((f) => f.replace('.html', '')).join(' '));
for (const f of files) {
  const t = fs.readFileSync(path.join(dir, f), 'utf8');
  const msgs = [...t.matchAll(/postMessage\(([^)]{0,140})/g)].map((m) => m[1].replace(/\s+/g, ' ').slice(0, 110));
  const types = [...t.matchAll(/['"`]([a-zA-Z0-9:_-]{6,60})['"`]/g)].map((m) => m[1]);
  const interesting = [...new Set(types)].filter((x) => /turing|save|ready|connect|host|xiaobai|classroom/i.test(x));
  console.log(`\n== ${f}  ${(t.length / 1024).toFixed(0)}KB`);
  console.log('  msgtypes:', interesting.join(' | '));
  console.log('  postMessage calls:', msgs.length);
  msgs.slice(0, 6).forEach((m) => console.log('    -', m));
  const im = t.match(/<script[^>]*type=["']importmap["'][^>]*>([\s\S]*?)<\/script>/i);
  if (im) console.log('  importmap:', im[1].replace(/\s+/g, ' ').slice(0, 400));
  const base = t.match(/<base[^>]*href=["']([^"']+)["']/i);
  if (base) console.log('  base:', base[1]);
}
