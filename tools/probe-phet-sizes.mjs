import fs from 'node:fs';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';
const base = 'https://phet.colorado.edu/sims/';
const picks = [
 'html/forces-and-motion-basics/latest/forces-and-motion-basics_zh_CN.html',
 'html/circuit-construction-kit-dc/latest/circuit-construction-kit-dc_zh_CN.html',
 'html/gas-properties/latest/gas-properties_zh_CN.html',
 'html/balancing-act/latest/balancing-act_zh_CN.html',
 'html/energy-forms-and-changes/latest/energy-forms-and-changes_zh_CN.html',
 'html/genetic-color-alleles/latest/genetic-color-alleles_zh_CN.html',
 'html/area-model-multiplication/latest/area-model-multiplication_zh_CN.html',
 'html/collision-lab/latest/collision-lab_zh_CN.html',
];
const out = [];
for (const p of picks) {
  const url = base + p;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 60000);
  try {
    const r = await fetch(url, { headers: { 'user-agent': UA }, signal: ctrl.signal });
    const b = await r.arrayBuffer();
    out.push({ p, status: r.status, mb: +(b.byteLength / 1048576).toFixed(2) });
  } catch (e) {
    out.push({ p, status: 0, err: String(e.message || e) });
  } finally {
    clearTimeout(t);
  }
  console.log(out[out.length - 1].status, out[out.length - 1].mb, p);
}
fs.writeFileSync('recon/scratch/phet-sizes.json', JSON.stringify(out, null, 2));
console.log('total MB', out.reduce((a, b) => a + (b.mb || 0), 0).toFixed(1));
