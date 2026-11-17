import fs from 'node:fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';
const r = await fetch('https://phet.colorado.edu/en/simulations/acid-base-solutions', { headers: { 'user-agent': UA } });
let h = await r.text();
h = h.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

const start = h.indexOf('"subjects"');
console.log('--- raw around subjects ---');
console.log(h.slice(Math.max(0, start - 3000), start + 200).slice(-1200));

const m = h.match(/"strings":\s*\[(.{0,4000})/s);
console.log('\n--- strings head ---');
console.log((m ? m[1] : '').slice(0, 600));

const t = h.match(/"topics":\[(.{0,600})/s) || h.match(/"topicIds":\[(.{0,300})/s);
console.log('\n--- topics ---');
console.log(t ? t[0].slice(0, 500) : 'none');
