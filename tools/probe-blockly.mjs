/* Look at one Blockly game and list the files it really needs. */
import fs from 'node:fs';

const UA = 'Mozilla/5.0';
const HOST = 'https://blockly.games';

const files = [
  'maze/generated/compressed.js',
  'bird/generated/compressed.js',
  'pond/duck/generated/compressed.js',
  'common/boot.js',
];

for (const f of files) {
  const res = await fetch(`${HOST}/${f}`, { headers: { 'User-Agent': UA } });
  const text = await res.text();
  const hits = new Set();
  const re1 = /["']([^"'\s]+\.(?:png|jpe?g|svg|gif|wav|mp3|ogg|m4a|json|xml))["']/gi;
  for (const m of text.matchAll(re1)) hits.add(m[1]);
  const re2 = /["']([A-Za-z0-9_\-]+\/[A-Za-z0-9_\-./]+)["']/g;
  for (const m of text.matchAll(re2)) hits.add(m[1]);
  console.log(`\n=== ${f} (${text.length} bytes) -> ${hits.size} refs`);
  console.log([...hits].sort().slice(0, 40).join('\n'));
}
