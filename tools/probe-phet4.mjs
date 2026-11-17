import fs from 'node:fs';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';
const base = 'https://phet.colorado.edu';

const r = await fetch(base + '/_m/e0371510efe8341f06134d07f095eb2d1fc3e39a.js?meteor_js_resource=true', {
  headers: { 'user-agent': UA },
});
const js = await r.text();
fs.writeFileSync('recon/scratch/phet-bundle.js', js);

const i = js.indexOf('offline-access');
const ctx = js.slice(Math.max(0, i - 1500), i + 1200);

// catalogue page data often rides in a JSON blob on the page
const page = await (await fetch(base + '/en/simulations', { headers: { 'user-agent': UA } })).text();
const ids = [...new Set([...page.matchAll(/simulations\/([a-z0-9][a-z0-9-]{3,60})/g)].map((m) => m[1]))];

fs.writeFileSync(
  'recon/scratch/phet-offline-ctx.js',
  ctx.replace(/[^\x20-\x7e\n]/g, '.')
);
console.log('bundle bytes', js.length, 'page ids', ids.length);
console.log(ids.slice(0, 40).join('\n'));
