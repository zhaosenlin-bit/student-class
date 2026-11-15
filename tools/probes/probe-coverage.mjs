import { readFileSync } from 'node:fs';
const c = JSON.parse(readFileSync('mirror/leqixiang/catalog.json', 'utf8'));
const arr = c.products;
console.log('products', arr.length, 'keys:', Object.keys(arr[0]).join(','));
const by = {};
for (const p of arr) {
  const k = `${p.source || p.origin || '?'} / ${p.mode || '?'}`;
  by[k] = by[k] || { n: 0, local: 0 };
  by[k].n++;
  if (p.localInstalled) by[k].local++;
}
for (const [k, v] of Object.entries(by)) console.log(k.padEnd(34), `n=${v.n}`.padEnd(10), `local=${v.local}`);
console.log('localReplica:', JSON.stringify(c.localReplica, null, 1));
const notLocal = arr.filter(p => !p.localInstalled);
console.log('not local sample:', JSON.stringify(notLocal.slice(0, 3), null, 1).slice(0, 1500));

const reasons = {};
for (const p of notLocal) {
  const k = `${p.source}|${p.downloadReason}|${p.edition}|${p.retired ? 'retired' : ''}`;
  reasons[k] = (reasons[k] || 0) + 1;
}
console.log('\nnot-local reasons:');
for (const [k, v] of Object.entries(reasons).sort((a, b) => b[1] - a[1])) console.log('  ', k, v);

const pre = JSON.parse(
  readFileSync('mirror/aifunengjiaoyu/premium/catalogue.json', 'utf8')
);
const free = pre.courses.filter((x) => x.freeSample);
console.log('\npremium courses', pre.courses.length, 'freeSample', free.length);
console.log('freeSample ids:', free.map((x) => x.programId).join(','));

const xb = JSON.parse(readFileSync('mirror/xbjiaoyu/catalog.json', 'utf8'));
const xp = xb.products || [];
console.log('\nxb products', xp.length, 'keys:', Object.keys(xp[0]).join(','));
const xm = {};
for (const p of xp) {
  const k = `${p.mode}|${p.price}|${p.downloadable}|${p.owned}|${p.purchased}|${p.free ? 'freeflag' : ''}`;
  xm[k] = (xm[k] || 0) + 1;
}
console.log('xb mode/price mix:');
for (const [k, v] of Object.entries(xm).sort((a, b) => b[1] - a[1])) console.log('  ', k, v);

const man = JSON.parse(readFileSync('mirror/xbjiaoyu/manifest.json', 'utf8'));
const okIds = Object.entries(man.courses || {}).filter(([, v]) => v.status === 'ok').map(([k]) => k);
console.log('\nxb manifest ok count', okIds.length, okIds.slice(0, 60).join(','));
