#!/usr/bin/env node
/*
 * Decode the obfuscated string table in the 图灵智赋 shell bundle so the
 * real API contract can be read instead of guessed.
 */
import fs from 'node:fs';

const file = process.argv[2] || 'mirror/aifunengjiaoyu/assets/assets/app.17e3fb394175.min.js';
const text = fs.readFileSync(file, 'utf8');

/* The string array function looks like function NAME(){const A=[...];NAME=function(){return A};return NAME();} */
const arrayFn = /function\s+(_0x[0-9a-f]+)\(\)\s*\{const\s+(_0x[0-9a-f]+)\s*=\s*\[/;
const m = arrayFn.exec(text);
if (!m) throw new Error('string array function not found');
const arrayName = m[1];

/* Grab the whole function body by brace matching. */
const start = text.indexOf(`function ${arrayName}(){`);
let depth = 0;
let i = text.indexOf('{', start);
const bodyStart = i;
for (; i < text.length; i++) {
  if (text[i] === '{') depth++;
  else if (text[i] === '}') {
    depth--;
    if (depth === 0) break;
  }
}
const arrayFnSource = text.slice(start, i + 1);

/* The decoder is function DEC(a,b){...} that calls the array fn. */
const decoderMatch = new RegExp(
  `function\\s+(_0x[0-9a-f]+)\\s*\\(\\s*(_0x[0-9a-f]+)\\s*,\\s*(_0x[0-9a-f]+)\\s*\\)\\s*\\{`
).exec(text);
if (!decoderMatch) throw new Error('decoder function not found');
const decoderName = decoderMatch[1];
const decoderStart = text.indexOf(`function ${decoderName}(`);
depth = 0;
i = text.indexOf('{', decoderStart);
for (; i < text.length; i++) {
  if (text[i] === '{') depth++;
  else if (text[i] === '}') {
    depth--;
    if (depth === 0) break;
  }
}
const decoderSource = text.slice(decoderStart, i + 1);

/* Some bundles wrap the array in a self-invoking shuffler; include it too. */
const shuffler = text.includes('while(!![]){try{');
const shufflerSource = shuffler
  ? (() => {
      const idx = text.indexOf('while(!![]){try{');
      let s = text.lastIndexOf('(function(', idx);
      let d = 0;
      let j = text.indexOf('(', s);
      for (; j < text.length; j++) {
        if (text[j] === '(') d++;
        else if (text[j] === ')') {
          d--;
          if (d === 0) break;
        }
      }
      return text.slice(s, j + 1);
    })()
  : '';

const factory = new Function(
  `${arrayFnSource}\n${shufflerSource}\n${decoderSource}\nreturn ${decoderName};`
);
const decode = factory();

const strings = [];
const offsetMatch = /(_0x[0-9a-f]+)=(_0x[0-9a-f]+)-(0x[0-9a-f]+|\d+)/.exec(decoderSource);
const base = offsetMatch ? Number(offsetMatch[3]) : 0;
console.error(`index base = 0x${base.toString(16)}`);
for (let index = base; index < base + 4000; index++) {
  let value;
  try {
    value = decode(index);
  } catch {
    if (index === 0) {
      try {
        decode(0);
      } catch (error) {
        console.error('decode(0) failed:', error.message);
        console.error('array fn head:', arrayFnSource.slice(0, 160));
        console.error('decoder head:', decoderSource.slice(0, 320));
      }
    }
    break;
  }
  if (value === undefined) break;
  strings.push(value);
}

console.log(`decoded ${strings.length} strings`);
const needle = process.argv[3];
if (needle) {
  strings.forEach((s, i) => {
    if (String(s).includes(needle)) console.log(`  0x${i.toString(16)} = ${JSON.stringify(s)}`);
  });
} else {
  strings.forEach((s, i) => console.log(`0x${(base + i).toString(16)}\t${s}`));
}

