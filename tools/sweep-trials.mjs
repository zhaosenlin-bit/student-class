#!/usr/bin/env node
/* Sweep the trial counters of every 精品课 to see which ones ever had a trial. */
import fs from 'node:fs';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const AFE = 'https://aifunengjiaoyu.com';
const token = fs.readFileSync('recon/scratch/afe-token.txt', 'utf8').trim();
const catalogue = JSON.parse(
  fs.readFileSync('mirror/aifunengjiaoyu/premium/catalogue.json', 'utf8')
);
const courses = catalogue.courses.filter((c) => c.programId);
const out = [];
let last = 0;
for (const c of courses) {
  const wait = last + 220 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
  try {
    const r = await fetch(`${AFE}/api/trials?program_id=${c.programId}`, {
      headers: { 'User-Agent': UA, Referer: `${AFE}/`, Authorization: `Bearer ${token}` },
    });
    const j = await r.json();
    out.push({ id: c.id, programId: c.programId, title: c.title, freeSample: !!c.freeSample, used: j.used, total: j.total });
  } catch (e) {
    out.push({ id: c.id, programId: c.programId, title: c.title, freeSample: !!c.freeSample, err: e.message });
  }
}
fs.writeFileSync('recon/scratch/trial-sweep.json', JSON.stringify(out, null, 1));
const used = out.filter((x) => x.used > 0);
console.log('scanned', out.length, 'with trial history:', used.length);
for (const u of used) console.log(' ', u.programId, u.used + '/' + u.total, u.freeSample ? 'freeSample' : '', u.title);
const fs2 = out.filter((x) => x.freeSample && x.used === 0);
console.log('freeSample never opened:', fs2.length, fs2.slice(0, 10).map((x) => x.programId).join(','));
process.exit(0);
