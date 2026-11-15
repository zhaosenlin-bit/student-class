import fs from 'node:fs';

const id = process.argv[2] || '823';
const h = fs.readFileSync(`mirror/aifunengjiaoyu/courseware/${id}.html`, 'utf8');
console.log('len', h.length);
const refs = new Set();
for (const m of h.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)) refs.add(m[1]);
console.log('refs:');
for (const r of refs) console.log('  ', r.slice(0, 160));
console.log('--- head ---');
console.log(h.slice(0, 900));
const dir = `mirror/aifunengjiaoyu/courseware/${id}.assets`;
if (fs.existsSync(dir)) {
  const walk = (d) =>
    fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]
    );
  console.log('assets:', walk(dir).length);
} else {
  console.log('assets: none');
}
