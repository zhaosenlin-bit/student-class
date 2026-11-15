#!/usr/bin/env node
/*
 * Which of the 图灵智赋 works are still missing a local copy?
 *
 * The platform knows every work; the local mirror only has the ones whose
 * body could be pulled.  The difference is what the paywall is holding.
 */
import fs from 'node:fs';

const ORIGIN = 'https://aifunengjiaoyu.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

let token = '';
try {
  token = fs.readFileSync('recon/scratch/afe-token.txt', 'utf8').trim();
} catch {}

const res = await fetch(`${ORIGIN}/api/programs`, {
  headers: {
    'User-Agent': UA,
    Referer: `${ORIGIN}/`,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  },
});
const live = (await res.json()).programs || [];
const have = new Set();
for (const dir of ['mirror/aifunengjiaoyu/courseware', 'mirror/leqixiang/courseware']) {
  for (const f of fs.readdirSync(dir)) {
    const m = f.match(/^(?:afe-)?(\d+)\.html$/);
    if (m) have.add(m[1]);
  }
}
const missing = live.filter((p) => !have.has(String(p.id)));
console.log(`线上作品 ${live.length} 个，本地已有 ${live.length - missing.length} 个，缺 ${missing.length} 个`);
for (const m of missing) {
  console.log(`  ${String(m.id).padEnd(6)} ${m.title}  （¥${m.price}）`);
}
