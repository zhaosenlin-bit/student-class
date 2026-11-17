import fs from 'node:fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';
const url = 'https://phet.colorado.edu/sims/html/forces-and-motion-basics/latest/forces-and-motion-basics_zh_CN.html';
const r = await fetch(url, { headers: { 'user-agent': UA } });
const html = await r.text();
fs.writeFileSync('recon/scratch/phet-one.html', html);

const marks = [
  'googletagmanager',
  'google-analytics',
  'gtag',
  'dataLayer',
  'yotta',
  'check-html-updates',
  'cloudflareinsights',
  'phet-io',
  'Brand',
];

for (const m of marks) {
  const hits = [];
  let i = html.indexOf(m);
  while (i >= 0 && hits.length < 3) {
    hits.push(html.slice(Math.max(0, i - 100), i + 140).replace(/\s+/g, ' '));
    i = html.indexOf(m, i + 1);
  }
  console.log('### ' + m + ' (' + hits.length + ')');
  for (const h of hits) console.log('   ' + h);
}

console.log('length', html.length);
console.log('title', (html.match(/<title>([^<]*)<\/title>/) || [])[1]);
console.log('base', (html.match(/<base[^>]*>/) || [])[0]);
console.log('script srcs', [...new Set([...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]))].join('\n  '));
