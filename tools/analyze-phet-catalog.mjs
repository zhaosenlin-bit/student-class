import fs from 'node:fs';

const d = JSON.parse(fs.readFileSync('recon/scratch/phet-metadata.json', 'utf8'));
const sims = [];
for (const p of d.projects) {
  for (const s of p.simulations) {
    const loc = s.localizedSimulations || {};
    sims.push({
      project: p.name,
      sim: s.name,
      id: s.id,
      zh: loc.zh_CN ? loc.zh_CN.title : null,
      en: loc.en ? loc.en.title : null,
      locales: Object.keys(loc).length,
      topics: s.topics || [],
      featured: !!s.featured,
      device: s.deviceTypes || [],
      high: s.highGradeLevel,
      low: s.lowGradeLevel,
      runs: s.runs || [],
      description: (s.description || '').replace(/\s+/g, ' ').trim(),
      credits: (s.credits || '').replace(/\s+/g, ' ').trim(),
    });
  }
}
fs.writeFileSync('recon/scratch/phet-sims.json', JSON.stringify(sims, null, 2));
const zh = sims.filter((s) => s.zh);
console.log('projects', d.projects.length, 'sims', sims.length, 'with zh_CN', zh.length);
const topics = {};
for (const s of sims) for (const t of s.topics) topics[t] = (topics[t] || 0) + 1;
console.log('topics', JSON.stringify(topics));
console.log('--- first 25 zh sims ---');
for (const s of zh.slice(0, 25))
  console.log(`${s.project.replace('html/', '')} | ${s.zh} | topics=${s.topics.join(',')} | runs=${s.runs.join(',')}`);
