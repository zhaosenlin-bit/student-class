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

const nodes = [];
const matchBracket = (s, open) => {
  let depth = 0;
  for (let k = open; k < s.length; k++) {
    if (s[k] === '[') depth++;
    else if (s[k] === ']') {
      depth--;
      if (depth === 0) return s.slice(open, k + 1);
    }
  }
  return null;
};
let pos = 0;
for (;;) {
  const i = h.indexOf('"simulationIds":[', pos);
  if (i < 0) break;
  pos = i + 10;
  const simsJson = matchBracket(h, h.indexOf('[', i));
  const head = h.slice(Math.max(0, i - 400), i);
  const idm = [...head.matchAll(/"id":(\d+)/g)].pop();
  const namem = [...head.matchAll(/"name":"([a-z0-9\-]*)"/g)].pop();
  const parentm = [...head.matchAll(/"parent":(-?\d+)/g)].pop();
  const strIdx = h.indexOf('"strings":[', i);
  let strings = [];
  if (strIdx > 0 && strIdx - i < 200) {
    const sj = matchBracket(h, h.indexOf('[', strIdx));
    try {
      strings = JSON.parse(sj);
    } catch {
      strings = [];
    }
  }
  const pick = (loc) => {
    for (const s of strings) if (s[loc]) return s[loc];
    return '';
  };
  nodes.push({
    id: idm ? Number(idm[1]) : null,
    name: namem ? namem[1] : '',
    parent: parentm ? Number(parentm[1]) : null,
    sims: simsJson ? simsJson.slice(1, -1).split(',').filter(Boolean).map(Number) : [],
    en: pick('en'),
    zh: pick('zh_CN'),
  });
}
console.log('nodes', nodes.length);
for (const n of nodes.slice(0, 40)) {
  console.log(n.id, n.name, 'parent', n.parent, '|', n.en, '|', n.zh, '| sims', n.sims.length);
}
fs.writeFileSync('recon/scratch/phet-taxonomy.json', JSON.stringify(nodes, null, 2));

/* Other subject nodes are written in a different field order. */
for (const name of ['math', 'physics', 'chemistry', 'earth-and-space', 'general-science']) {
  const i = h.indexOf('"name":"' + name + '"');
  if (i < 0) {
    console.log('missing', name);
    continue;
  }
  console.log('---', name, h.slice(Math.max(0, i - 60), i + 220).replace(/\s+/g, ' '));
}
