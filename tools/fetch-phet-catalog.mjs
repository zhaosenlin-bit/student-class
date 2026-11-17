import fs from 'node:fs';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';

const url = 'https://phet.colorado.edu/services/metadata/1.3/simulations?format=json&type=html&summary';
const r = await fetch(url, { headers: { 'user-agent': UA } });
const body = await r.text();
fs.writeFileSync('recon/scratch/phet-metadata.json', body);
let data;
try {
  data = JSON.parse(body);
} catch (e) {
  console.log('not json, first 400:', body.slice(0, 400));
  process.exit(1);
}
console.log('status', r.status, 'bytes', body.length, 'keys', Object.keys(data));
// 上游把平铺的 simulations 列表改成了 projects[].simulations[]。
const list =
  data.sims ||
  data.simulations ||
  (Array.isArray(data.projects)
    ? data.projects.flatMap((project) =>
        (project.simulations || []).map((sim) => ({ ...sim, project: project.name })))
    : []);
console.log('entries', list.length);
console.log(JSON.stringify(list[0] || {}, null, 2).slice(0, 3000));

// 中文本地化是这批课件能不能直接用的关键，单独数一遍。
const zh = list.filter((sim) => (sim.localizedSimulations || {}).zh_CN);
console.log('有中文本地化：', zh.length, '/', list.length);
