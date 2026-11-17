import fs from 'node:fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';
const unesc = (s) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

const r = await fetch('https://phet.colorado.edu/en/simulations/natural-selection', { headers: { 'user-agent': UA } });
const h = unesc(await r.text());
const i = h.indexOf('"strings":[');
let depth = 0;
let j = h.indexOf('[', i + 9);
const start = j;
for (; j < h.length; j++) {
  if (h[j] === '[') depth++;
  else if (h[j] === ']') {
    depth--;
    if (depth === 0) break;
  }
}
const arr = JSON.parse(h.slice(start, j + 1));
arr.forEach((e, idx) => {
  const keys = Object.keys(e);
  if (keys.length) console.log(idx + 1, '->', JSON.stringify({ en: e.en, zh_CN: e.zh_CN, n: keys.length }));
});
console.log('--- total', arr.length);
fs.writeFileSync('recon/scratch/phet-strings-ns.json', JSON.stringify(arr));
