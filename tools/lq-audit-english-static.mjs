/*
 * How much English does a reader still see, judged without a browser?
 *
 * We pull the visible text straight out of the HTML and compare the
 * amount of Latin letters with the amount of Chinese characters. The
 * threshold is deliberately forgiving: a page only counts as English
 * when the letters clearly outnumber the characters.
 */
import fs from 'node:fs';
import path from 'node:path';

const roots = [
  'mirror/leqixiang/courseware',
  'mirror/lab-course/courseware',
  'mirror/lab-virtual/courseware',
  'mirror/lab-reaction/courseware',
  'mirror/lab-explore/courseware',
  'mirror/lab-physics/courseware',
  'mirror/game-block/courseware',
  'mirror/lab-process/courseware'
];

/*
 * Pages carry tracking pixels and other off-screen filler. A reader
 * never sees them, so they must not count as English either.
 */
const HIDDEN = /display\s*:\s*none|visibility\s*:\s*hidden|left\s*:\s*-\d{3,}|opacity\s*:\s*0(?:\.0+)?\b|clip\s*:\s*rect|position\s*:\s*absolute/i;

const VOID = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link',
  'meta', 'param', 'source', 'track', 'wbr',
]);

/*
 * Take the hidden boxes out of the page, content and all.
 *
 * A hidden box is usually a tracking pixel parked far off the left
 * edge of the screen.  It has to go together with what is inside it,
 * or its filler text counts as something the reader sees.  Pairing an
 * opening tag with the next closing tag of the same name is not
 * enough: the page's own wrapper swallows every hidden box inside
 * it, so they never get their turn.  The tags are therefore walked
 * with a stack, and a box is cut out together with everything it
 * holds, however deep it sits.
 */
const removeHidden = (html) => {
  const tag = /<(\/?)([a-z][a-z0-9]*)\b([^>]*)>/gi;
  let out = '';
  let last = 0;
  let m;
  while ((m = tag.exec(html))) {
    const closing = m[1] === '/';
    const name = m[2].toLowerCase();
    const empty = m[0].endsWith('/>') || VOID.has(name);
    if (closing || empty) continue;
    if (!HIDDEN.test(m[3])) continue;

    /* Find the close that belongs to this box. */
    const inner = /<(\/?)([a-z][a-z0-9]*)\b([^>]*)>/gi;
    inner.lastIndex = tag.lastIndex;
    let depth = 1;
    let end = html.length;
    let s;
    while ((s = inner.exec(html))) {
      const innerName = s[2].toLowerCase();
      if (s[1] === '/') {
        if (innerName !== name) continue;
        if (--depth === 0) {
          end = inner.lastIndex;
          break;
        }
        continue;
      }
      if (
        innerName === name &&
        !s[0].endsWith('/>') &&
        !VOID.has(innerName)
      ) {
        depth++;
      }
    }

    out += html.slice(last, m.index);
    last = end;
    tag.lastIndex = end;
  }
  return out + html.slice(last);
};

const strip = (html) => {
  const s = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    /*
     * A template is packed away and never drawn, but it can hold a
     * whole course as one long string of encoded pictures.  None of
     * it is on the glass, so none of it counts.
     */
    .replace(/<template[\s\S]*?<\/template>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');
  return removeHidden(s).replace(/<[^>]+>/g, ' ');
};

const cat = JSON.parse(
  fs.readFileSync('catalog/catalog.json', 'utf8')
);
const wanted = new Set(
  cat.products.filter((p) => p.localInstalled).map((p) => p.id)
);

const rows = [];

for (const root of roots) {
  if (!fs.existsSync(root)) continue;
  for (const name of fs.readdirSync(root)) {
    if (!name.endsWith('.html')) continue;
    const id = path.basename(name, '.html');
    if (!wanted.has(id)) continue;
    const file = path.join(root, name);
    const html = fs.readFileSync(file, 'utf8');
    const text = strip(html)
      .replace(/&[a-z]+;|&#\d+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const latin = (text.match(/[A-Za-z]/g) || []).length;
    const cjk = (text.match(/[\u3400-\u9fff]/g) || []).length;
    const letters = text.match(/[A-Za-z]{2,}/g) || [];

    rows.push({
      id,
      family: id.split('-')[0],
      latin,
      cjk,
      words: letters.length,
      sample: text.slice(0, 400)
    });
  }
}

const english = rows.filter(
  (r) => r.words >= 12 && r.latin > r.cjk * 2 && r.latin > 60
);
const mixed = rows.filter(
  (r) =>
    !english.includes(r) &&
    r.words >= 12 &&
    r.latin > r.cjk &&
    r.cjk > 0
);

const byFamily = {};
for (const r of english) byFamily[r.family] = (byFamily[r.family] || 0) + 1;
const totalFamily = {};
for (const r of rows) totalFamily[r.family] = (totalFamily[r.family] || 0) + 1;

console.log(`scanned ${rows.length} catalog courses`);
console.log(`english-dominant ${english.length}, mixed ${mixed.length}`);
for (const f of Object.keys(totalFamily).sort()) {
  console.log(
    `  ${f.padEnd(14)} english ${String(byFamily[f] || 0).padStart(4)} / ${totalFamily[f]}`
  );
}

fs.writeFileSync(
  'work/lq-english-static.json',
  JSON.stringify({ english, mixed }, null, 1)
);

for (const r of english.slice(0, 40)) {
  console.log(`  ${r.family}/${r.id}  latin=${r.latin} cjk=${r.cjk}`);
  console.log(`     ${r.sample.slice(0, 160)}`);
}
