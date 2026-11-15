/* Look at the course bundle: what it imports and what it expects. */
import fs from 'node:fs';

const file = process.argv[2] || 'mirror/aifunengjiaoyu/courseware/841.assets/assets/index-Df_Pctd-.js';
const t = fs.readFileSync(file, 'utf8');
console.log('size', t.length);

const imports = new Set();
for (const m of t.matchAll(/import\(\s*[`'"]([^`'"]+)[`'"]/g)) imports.add(m[1]);
for (const m of t.matchAll(/from\s*[`'"]([^`'"]+)[`'"]/g)) imports.add(m[1]);
console.log('imports:', [...imports]);

console.log('terrainMapB refs:', (t.match(/terrainMapB/g) || []).length);
const modes = [...t.matchAll(/mode\s*:\s*[`'"]([a-z-]+)[`'"]/g)].map((m) => m[1]);
console.log('modes:', [...new Set(modes)].slice(0, 12));
for (const word of ['persistent', 'sessionStorage', 'localStorage', 'fr1789', 'course.navigation']) {
  console.log(word, (t.match(new RegExp(word, 'g')) || []).length);
}
const urls = [...new Set([...t.matchAll(/["'`]([A-Za-z0-9_./-]+\.(?:glb|png|jpg|webp|json|mp3|wav|bin))["'`]/g)].map((m) => m[1]))];
console.log('asset names:', urls.slice(0, 30));
