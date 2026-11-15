import fs from 'node:fs';

const dir = 'mirror/leqixiang/courseware';
const files = fs.readdirSync(dir).filter((f) => f.startsWith('afe-') && f.endsWith('.html'));
const hostRx = /https?:\/\/([a-zA-Z0-9.-]+)/g;
for (const f of files) {
  const id = f.replace('.html', '');
  const t = fs.readFileSync(`${dir}/${f}`, 'utf8');
  const hosts = [...new Set([...t.matchAll(hostRx)].map((m) => m[1]))];
  const assetsDir = `${dir}/${id}.assets`;
  const local = [];
  const walk = (d, base = '') => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = `${d}/${e.name}`;
      if (e.isDirectory()) walk(p, base + e.name + '/');
      else local.push(base + e.name);
    }
  };
  walk(assetsDir);
  console.log(`\n== ${id}  hosts: ${hosts.join(', ')}`);
  console.log(`   local assets: ${local.length}`);
  for (const a of local.slice(0, 8)) console.log('     ', a);
  if (local.length > 8) console.log(`      ... +${local.length - 8}`);
}
