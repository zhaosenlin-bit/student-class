/* What the 历史文物 course asks the network for. */
import fs from 'node:fs';

const t = fs.readFileSync('mirror/aifunengjiaoyu/courseware/196.html', 'utf8');
console.log('size', t.length);
const urls = [
  ...new Set([...t.matchAll(/[`'"]([A-Za-z0-9_./-]+\.(?:glb|gltf|png|jpg|webp|json|bin|mp4|mp3))[`'"]/g)].map((m) => m[1])),
];
console.log('named files:', urls);
console.log('glb mentions:', (t.match(/glb/g) || []).length);
const i = t.indexOf('.glb');
console.log('context:', t.slice(Math.max(0, i - 400), i + 200).replace(/\s+/g, ' '));
const j = t.indexOf('assetRoot');
console.log('assetRoot context:', t.slice(Math.max(0, j - 300), j + 400).replace(/\s+/g, ' '));
