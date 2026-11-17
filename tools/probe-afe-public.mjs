/* Ask the live player which programmes open as a public preview. */
import fs from 'node:fs';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const ORIGIN = 'https://aifunengjiaoyu.com';

const catalogue = JSON.parse(
  fs.readFileSync('mirror/aifunengjiaoyu/premium/catalogue.json', 'utf8')
);
const works = JSON.parse(
  fs.readFileSync('mirror/aifunengjiaoyu/programs-all.json', 'utf8')
);

const all = [...works.map((w) => ({ id: w.id, title: w.title }))];
for (const c of catalogue.courses || []) {
  if (c.programId) all.push({ id: c.programId, title: c.title, freeSample: c.freeSample });
}

const out = [];
let cursor = 0;
async function worker() {
  for (;;) {
    const i = cursor++;
    if (i >= all.length) return;
    const p = all[i];
    try {
      const res = await fetch(`${ORIGIN}/play/${p.id}`, { headers: { 'User-Agent': UA } });
      const text = await res.text();
      const flag = /var isReviewedPublic = (true|false)/.exec(text);
      out.push({
        id: p.id,
        title: p.title,
        reviewed: flag ? flag[1] === 'true' : null,
        status: res.status,
      });
    } catch (e) {
      out.push({ id: p.id, title: p.title, reviewed: null, err: e.message });
    }
  }
}
await Promise.all(Array.from({ length: 6 }, worker));

fs.writeFileSync('recon/scratch/afe-public-flags.json', JSON.stringify(out, null, 1));
const yes = out.filter((x) => x.reviewed);
console.log('probed', out.length, 'reviewed-public:', yes.length);
console.log(yes.map((x) => `${x.id} ${x.title}`).join('\n'));
