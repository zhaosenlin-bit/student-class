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
const idx = [...h.matchAll(/Biology/g)].map((m) => m.index);
console.log('Biology occurrences', idx.length);
for (const i of idx.slice(0, 6)) console.log('  ...', h.slice(Math.max(0, i - 160), i + 120).replace(/\s+/g, ' '));

// The rendered chips
const chips = [...h.matchAll(/class="[^"]*(?:chip|tag|filter)[^"]*"[^>]*>([^<]{1,40})</g)].map((m) => m[1].trim());
console.log('chips', [...new Set(chips)].slice(0, 20));

const links = [...new Set([...h.matchAll(/href="(\/en\/simulations\?[^"]{0,80})"/g)].map((m) => m[1]))];
console.log('filter links', links.slice(0, 10));
