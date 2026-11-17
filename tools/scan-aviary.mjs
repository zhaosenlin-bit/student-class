/* Read every mirrored program and say which of them ask for a function
   they do not have, and which of them draw on a canvas at all. */
import fs from 'node:fs';

const dir = 'mirror/aviary/courseware';
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.html'));

const missing = [];
const noCanvas = [];
const BUILTIN = new Set([
  'Array', 'Date', 'Object', 'Image', 'Math', 'JSON', 'String', 'Number',
  'Boolean', 'RegExp', 'Error', 'TypeError', 'Map', 'Set', 'Promise', 'Symbol',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURIComponent',
  'decodeURIComponent', 'setTimeout', 'setInterval', 'clearTimeout',
  'clearInterval', 'requestAnimationFrame', 'alert', 'confirm', 'prompt',
  'fetch', 'require', 'structuredClone', 'Text', 'Audio', 'FileReader',
  'Float32Array', 'Float64Array', 'Uint8Array', 'Int32Array', 'Uint32Array',
  'Intl', 'Proxy', 'Reflect', 'WeakMap', 'WeakSet', 'ArrayBuffer',
]);
for (const file of files) {
  const text = fs.readFileSync(`${dir}/${file}`, 'utf8');
  const calls = new Set(
    [...text.matchAll(/\b([A-Z][A-Za-z0-9_]{2,})\s*\(\s*\)/g)].map((m) => m[1])
  );
  const undef = [];
  for (const name of calls) {
    if (BUILTIN.has(name)) continue;
    const defined =
      new RegExp(`function\\s+${name}\\s*\\(`).test(text) ||
      new RegExp(`(?:var|let|const)\\s+${name}\\s*=`).test(text) ||
      new RegExp(`${name}\\s*=\\s*function`).test(text) ||
      new RegExp(`window\\.${name}\\s*=`).test(text);
    if (!defined) undef.push(name);
  }
  if (undef.length) missing.push({ file, undef });
  if (!/<canvas/i.test(text)) noCanvas.push(file);
}

console.log('programs:', files.length);
console.log('\ncalls a function it does not define:');
for (const m of missing) console.log(' ', m.file, '->', m.undef.join(', '));
console.log('\nno canvas at all:', noCanvas.length);
console.log(noCanvas.join(' '));
