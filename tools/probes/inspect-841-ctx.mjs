/* Show where the course bundle reaches for its missing pieces. */
import fs from 'node:fs';

const file = process.argv[2] || 'mirror/aifunengjiaoyu/courseware/841.assets/assets/index-Df_Pctd-.js';
const t = fs.readFileSync(file, 'utf8');

for (const needle of ['session-CafD1QSe.js', 'session-_JOdV8Ha.js', 'terrain.json', 'rivers.json', 'terrainMapB']) {
  let at = t.indexOf(needle);
  console.log(`\n=== ${needle} (first at ${at})`);
  while (at >= 0 && at < t.length) {
    console.log('   ...' + t.slice(Math.max(0, at - 160), at + 120).replace(/\s+/g, ' '));
    at = t.indexOf(needle, at + 1);
    if (at > 0 && at < t.length && t.slice(0, at).split(needle).length > 4) break;
  }
}
