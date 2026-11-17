import fs from 'node:fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';

const unesc = (s) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

const page = async (id) => {
  const r = await fetch('https://phet.colorado.edu/en/simulations/' + id, { headers: { 'user-agent': UA } });
  return unesc(await r.text());
};

const h = await page('acid-base-solutions');
const i = h.indexOf('"strings":[');
// find the matching close bracket
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
console.log('strings entries', arr.length);
for (const idx of [12, 18, 13, 19]) {
  const e = arr[idx];
  console.log(idx, e ? JSON.stringify({ en: e.en, zh_CN: e.zh_CN }) : 'none');
}
const ids = [...h.matchAll(/"subjects":\[([0-9,]+)\]/g)].map((m) => m[1]);
console.log('subjects in page', ids);
console.log('topicIds', [...h.matchAll(/"topicIds":\[([0-9,]+)\]/g)].map((m) => m[1]));
fs.writeFileSync('recon/scratch/phet-strings.json', JSON.stringify(arr));
