/*
 * Every programme the platform knows about, from the guest list and from the
 * account's own list. The works tab on the site shows only part of it.
 */
import fs from 'node:fs';

const ORIGIN = 'https://aifunengjiaoyu.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const token = fs.readFileSync('recon/scratch/afe-token.txt', 'utf8').trim();

const api = async (route) => {
  const r = await fetch(ORIGIN + route, {
    headers: { 'User-Agent': UA, Referer: `${ORIGIN}/`, Authorization: `Bearer ${token}` },
  });
  const text = await r.text();
  try {
    return { status: r.status, json: JSON.parse(text) };
  } catch {
    return { status: r.status, json: null, text };
  }
};

const guest = await api('/api/programs');
const all = await api('/api/programs?all=true');
const cat = await api('/api/premium/catalogue');

const list = (j) => j?.programs || [];
const g = list(guest.json);
const a = list(all.json);
const c = cat.json?.courses || [];

console.log('guest /api/programs   ->', guest.status, g.length);
console.log('account /api/programs?all=true ->', all.status, a.length);
console.log('premium catalogue     ->', cat.status, c.length);

const fields = new Set();
for (const p of [...g, ...a]) Object.keys(p).forEach((k) => fields.add(k));
console.log('program fields:', [...fields].join(', '));

console.log('\nguest sample:', JSON.stringify(g.slice(0, 3), null, 1));

const ids = new Map();
for (const p of [...g, ...a]) ids.set(p.id, { title: p.title, source: p.source || p.origin || '' });
console.log('\nunion of program ids:', ids.size);

/* How many of them can this account actually open? */
const sample = [...ids.keys()].slice(0, 400);
let ok = 0;
const noAccess = [];
for (const id of sample) {
  const r = await api(`/api/programs/${id}/access-token`);
  if (r.json?.success && r.json.token) ok++;
  else noAccess.push(id);
  await new Promise((x) => setTimeout(x, 60));
}
console.log(`sampled ${sample.length}: ${ok} openable, ${noAccess.length} refused`);
fs.writeFileSync(
  'recon/scratch/afe-programs-union.json',
  JSON.stringify([...ids.entries()].map(([id, v]) => ({ id, ...v })), null, 1)
);
