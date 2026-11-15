/* List every file and URL a mirrored course body names. */
import fs from 'node:fs';

const file = process.argv[2];
const text = fs.readFileSync(file, 'utf8');
console.log('bytes', text.length);
const refs = new Set();
for (const m of text.matchAll(/["'`]([^"'`\s]+\.(?:js|mjs|css|png|jpe?g|gif|svg|webp|avif|glb|gltf|json|txt|mp3|mp4|wav|ogg|woff2?|ttf|otf|eot|wasm|bin))["'`]/g)) {
  refs.add(m[1]);
}
for (const m of text.matchAll(/https?:\/\/[^"'`)\s]+/g)) refs.add(m[0]);
for (const m of text.matchAll(/["'`](\/[^"'`\s]+)["'`]/g)) {
  if (/\.(?:js|mjs|css|png|jpe?g|gif|svg|webp|avif|glb|gltf|json|txt|mp3|mp4|wav|ogg|woff2?|ttf|otf|eot|wasm|bin)(\?|$)/i.test(m[1])) refs.add(m[1]);
}
console.log([...refs].sort().join('\n'));
