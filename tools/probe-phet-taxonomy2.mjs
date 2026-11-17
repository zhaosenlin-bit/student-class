import fs from 'node:fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';
const unesc = (s) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

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

const nodesOf = (h) => {
  const out = [];
  let pos = 0;
  for (;;) {
    const i = h.indexOf('"simulationIds":[', pos);
    if (i < 0) break;
    pos = i + 10;
    const head = h.slice(Math.max(0, i - 500), i);
    const simsJson = matchBracket(h, h.indexOf('[', i));
    const idm = [...head.matchAll(/"id":(\d+)/g)].pop();
    const namem = [...head.matchAll(/"name":"([a-z0-9\-]*)"/g)].pop();
    const strIdx = h.indexOf('"strings":[', i);
    let strings = [];
    if (strIdx > 0 && strIdx - i < 200) {
      try {
        strings = JSON.parse(matchBracket(h, h.indexOf('[', strIdx)));
      } catch {
        strings = [];
      }
    }
    const pick = (loc) => {
      for (const s of strings) if (s[loc]) return s[loc];
      return '';
    };
    out.push({
      id: idm ? Number(idm[1]) : null,
      name: namem ? namem[1] : '',
      sims: simsJson ? simsJson.slice(1, -1).split(',').filter(Boolean).map(Number) : [],
      en: pick('en'),
      zh: pick('zh_CN'),
    });
  }
  return out;
};

const reps = [
  'natural-selection',
  'acid-base-solutions',
  'forces-and-motion-basics',
  'area-model-multiplication',
  'color-mix',
  'energy-forms-and-changes',
  'geometric-optics',
  'gas-properties',
  'build-an-atom',
  'sorting-and-classifying',
];

const map = new Map();
for (const id of reps) {
  try {
    const r = await fetch('https://phet.colorado.edu/en/simulations/' + id, { headers: { 'user-agent': UA } });
    const h = unesc(await r.text());
    for (const n of nodesOf(h)) {
      if (n.id && !map.has(n.id)) map.set(n.id, n);
    }
  } catch (e) {
    console.log('fail', id, e.message);
  }
}
for (const n of [...map.values()].sort((a, b) => a.id - b.id)) {
  console.log(n.id, n.name, '|', n.en, '|', n.zh, '| sims', n.sims.length);
}
fs.writeFileSync('recon/scratch/phet-taxonomy-map.json', JSON.stringify([...map.values()], null, 2));
