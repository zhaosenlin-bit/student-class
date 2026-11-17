import fs from 'node:fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';
const unesc = (s) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

for (const id of ['forces-and-motion-basics', 'area-model-multiplication', 'natural-selection']) {
  const r = await fetch('https://phet.colorado.edu/en/simulations/' + id, { headers: { 'user-agent': UA } });
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
  const subs = [...h.matchAll(/"subjects":\[([0-9,]+)\]/g)].map((m) => m[1]);
  console.log('==', id, 'subjects', subs.join('|'), 'strings', arr.length);
  for (const s of subs.join(',').split(',')) {
    const e = arr[Number(s) - 1];
    console.log('   id', s, '->', e ? JSON.stringify({ en: e.en, zh_CN: e.zh_CN }) : 'none');
  }
  const links = [...new Set([...h.matchAll(/subjects?=\d+/g)].map((m) => m[0]))];
  console.log('   subject links', links.slice(0, 6).join(' '));
}
