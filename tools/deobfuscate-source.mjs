#!/usr/bin/env node
/*
 * Rewrite the 图灵智赋 bundle with its string table resolved, then print the
 * source around a given search term so the real request flow can be read.
 */
import fs from 'node:fs';

const file = process.argv[2];
const needle = process.argv[3] || 'camera-launch';
const span = Number(process.argv[4] || 2500);
const out = process.argv[5] || 'recon/captures/afe-deobfuscated.js';
const text = fs.readFileSync(file, 'utf8');

/* --- locate the string array and the decoder ------------------------- */
const arrayMatch = /function\s+(_0x[0-9a-f]+)\(\)\s*\{const\s+(_0x[0-9a-f]+)\s*=\s*\[/.exec(text);
if (!arrayMatch) throw new Error('string array not found');
const arrayName = arrayMatch[1];

const bodyOf = (from) => {
  const start = text.indexOf('{', from);
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) return text.slice(from, i + 1);
    }
  }
  return '';
};

const arrayFnSource = bodyOf(text.indexOf(`function ${arrayName}(){`));
const decoderMatch = /function\s+(_0x[0-9a-f]+)\s*\(\s*_0x[0-9a-f]+\s*,\s*_0x[0-9a-f]+\s*\)\s*\{/.exec(text);
const decoderName = decoderMatch[1];
const decoderSource = bodyOf(text.indexOf(`function ${decoderName}(`));

let shufflerSource = '';
const shuffleAt = text.indexOf('while(!![]){try{');
if (shuffleAt >= 0) {
  const s = text.lastIndexOf('(function(', shuffleAt);
  let depth = 0;
  for (let j = text.indexOf('(', s); j < text.length; j++) {
    if (text[j] === '(') depth++;
    else if (text[j] === ')') {
      depth--;
      if (depth === 0) {
        shufflerSource = text.slice(s, j + 1);
        break;
      }
    }
  }
}

const decode = new Function(
  `${arrayFnSource}\n${shufflerSource}\n${decoderSource}\nreturn ${decoderName};`
)();

/* --- resolve every call to the decoder (and to its local aliases) ------ */
const aliases = new Set([decoderName]);
let grew = true;
while (grew) {
  grew = false;
  for (const m of text.matchAll(
    /(?:const|let|var)\s+(_0x[0-9a-f]+)\s*=\s*(_0x[0-9a-f]+)\s*[;,]/g
  )) {
    if (aliases.has(m[2]) && !aliases.has(m[1])) {
      aliases.add(m[1]);
      grew = true;
    }
  }
}
console.log('decoder aliases:', [...aliases].join(', '));

const callPattern = new RegExp(
  `\\b(${[...aliases].join('|')})\\((0x[0-9a-f]+|\\d+)\\)`,
  'g'
);
let replaced = 0;
const resolved = text.replace(callPattern, (match, _fn, hex) => {
  const value = decode(Number(hex));
  if (value === undefined) return match;
  replaced++;
  return JSON.stringify(value);
});

fs.writeFileSync(out, resolved);
console.log(`resolved ${replaced} strings -> ${out}`);

const at = resolved.indexOf(needle);
if (at < 0) {
  console.log(`not found: ${needle}`);
  process.exit(0);
}
console.log('\n==== ' + needle + ' ====');
console.log(resolved.slice(Math.max(0, at - 400), at + span));

