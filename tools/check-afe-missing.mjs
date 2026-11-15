import fs from 'node:fs';

const dir = 'mirror/leqixiang/courseware';
const files = fs.readdirSync(dir).filter((f) => f.startsWith('afe-') && f.endsWith('.html'));
const EXT = [
  'https://cdnjs.cloudflare.com/',
  'https://cdn.jsdelivr.net/',
  'https://tuxiaoling-glb-2026.oss-cn-shenzhen.aliyuncs.com/',
  'https://unpkg.com/',
  'https://esm.sh/',
];

const urlRx = /https?:\/\/[^\s"'`)<>]+/g;
const attrRx = /(?:src|href)\s*=\s*["']([^"']+)["']/g;
const impRx = /["'](https?:\/\/[^"']+)["']/g;

for (const f of files) {
  const id = f.replace('.html', '');
  const t = fs.readFileSync(`${dir}/${f}`, 'utf8');
  const urls = new Set();
  for (const rx of [urlRx, attrRx, impRx]) {
    for (const m of t.matchAll(rx)) {
      const raw = m[1] ?? m[0];
      urls.add(String(raw).replace(/[),;]+$/, ''));
    }
  }

  const missing = [];
  const local = [];
  for (const raw of urls) {
    let u = raw;
    if (EXT.some((h) => u.startsWith(h))) {
      const host = EXT.find((h) => u.startsWith(h)).replace('https://', '').replace(/\/$/, '');
      const tail = u.slice(EXT.find((h) => u.startsWith(h)).length);
      const p = `${dir}/${id}.assets/_ext/${host}/${tail}`;
      if (fs.existsSync(p)) local.push(u);
      else missing.push(u);
      continue;
    }
    if (u.startsWith('https://static.aifunengjiaoyu.com/')) {
      missing.push(u + '  (prod/uploads)');
      continue;
    }
    if (u.startsWith('/api/program-assets/')) {
      const rest = u.slice('/api/program-assets/'.length);
      const cut = rest.indexOf('/');
      let tail = cut < 0 ? '' : rest.slice(cut + 1);
      if (tail.startsWith('t/')) {
        const after = tail.slice(2);
        const c2 = after.indexOf('/');
        tail = c2 < 0 ? '' : after.slice(c2 + 1);
      } else if (tail.startsWith('_ext/')) tail = tail.slice('_ext/'.length);
      const p = `${dir}/${id}.assets/${tail}`;
      if (fs.existsSync(p)) local.push(u);
      else missing.push(u);
      continue;
    }
    if (u.startsWith('http')) {
      missing.push(u);
      continue;
    }
  }
  console.log(`\n== ${id}: ${urls.size} urls | local ${local.length} | MISSING ${missing.length}`);
  for (const u of [...new Set(missing)].slice(0, 14)) console.log('   !', u.slice(0, 150));
}
