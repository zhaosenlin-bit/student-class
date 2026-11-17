/* Ask the upstream site where a function is defined. */
const cases = [
  ['CornerKick', 'Labs', 'ControlArea'],
  ['ColorMixing', 'Tools', 'Initialize'],
  ['AtwoodLab', 'Labs', 'RawData'],
  ['HighSchoolTossLevel1', 'Games', 'DropBall'],
  ['GravitationalPELab', 'Labs', 'Reset'],
  ['DrawingGraphs', 'Labs', 'Deferred'],
  ['EnergyOnFrictionlessIncline', 'APPrograms', 'ShowGraph'],
  ['MillisecondChallenge', 'Games', 'Deferred'],
];

const SITEWIDE = [
  '/Physics/sitewide/standardjavascript.js',
  '/Physics/sitewide/labequipmentdrawings.js',
  '/Physics/sitewide/graphingcomponents.js',
  '/Physics/sitewide/dynamicscart.js',
  '/Physics/sitewide/tablewords.json',
];

const get = async (u) => {
  const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  return r.status === 200 ? await r.text() : '';
};

const shared = new Map();
for (const s of SITEWIDE) shared.set(s, await get('https://thephysicsaviary.com' + s));

for (const [slug, list, fn] of cases) {
  const base = `https://thephysicsaviary.com/Physics/Programs/${list}/${slug}/`;
  const page = await get(base);
  const srcs = [...page.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
  const found = [];
  for (const src of srcs) {
    let abs;
    try {
      abs = new URL(src, base).href;
    } catch {
      continue;
    }
    const body = await get(abs);
    if (new RegExp(`function\\s+${fn}\\b`).test(body)) found.push(src);
  }
  for (const [s, body] of shared) {
    if (body && new RegExp(`function\\s+${fn}\\b`).test(body)) found.push(s);
  }
  console.log(`${slug}.${fn}: ${found.length ? found.join(' , ') : 'NOT DEFINED ANYWHERE'}`);
}
