import fs from 'node:fs';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';
const base = 'https://phet-api.colorado.edu';

const cands = [
  '/simulations',
  '/simulations?locale=en',
  '/api/simulations',
  '/simulations.json',
  '/',
];
const out = [];
for (const c of cands) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 25000);
  try {
    const r = await fetch(base + c, { headers: { 'user-agent': UA }, signal: ctrl.signal });
    const body = await r.text();
    out.push({ c, status: r.status, len: body.length, head: body.slice(0, 300) });
  } catch (e) {
    out.push({ c, status: 0, err: String(e.message || e) });
  } finally {
    clearTimeout(t);
  }
}
fs.writeFileSync('recon/scratch/phet-api.json', JSON.stringify(out, null, 2));
console.log(out.map((o) => `${o.status} ${o.len || 0} ${o.c}\n${o.head || o.err || ''}`).join('\n---\n'));
