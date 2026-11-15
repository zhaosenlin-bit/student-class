#!/usr/bin/env node
/*
 * Read the strings a courseware document hides.
 *
 * Several works build the address of their own pictures at run time from
 * an encoded table, so the address cannot be found by looking at the
 * text.  The table is decoded here, and the place where the address is
 * built can be pointed at the local copy instead.
 *
 *   node tools/decode-course-strings.mjs mirror/aifunengjiaoyu/courseware/501.html http
 */
import fs from 'node:fs';

const file = process.argv[2];
const needle = process.argv[3] || '';
const text = fs.readFileSync(file, 'utf8');

const arrayFn = /function\s+(_0x[0-9a-f]+)\(\)\s*\{const\s+(_0x[0-9a-f]+)\s*=\s*\[/;
const m = arrayFn.exec(text);
if (!m) throw new Error('string array function not found');
let arrayName = m[1];

const slice = (from, open) => {
  let depth = 0;
  let i = text.indexOf(open, from);
  for (; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  return text.slice(from, i + 1);
};

/*
 * A document can hold more than one table. The name of the decoder can be
 * given when the first one is not the one that matters.
 */
const wanted = process.argv[4] || '';
const decoderPattern = wanted
  ? new RegExp(
      `function\\s+${wanted}\\s*\\(\\s*(_0x[0-9a-f]+)\\s*,\\s*(_0x[0-9a-f]+)\\s*\\)\\s*\\{`
    )
  : /function\s+(_0x[0-9a-f]+)\s*\(\s*(_0x[0-9a-f]+)\s*,\s*(_0x[0-9a-f]+)\s*\)\s*\{/;
const decoderMatch = decoderPattern.exec(text);
if (!decoderMatch) throw new Error('decoder function not found');
const decoderName = decoderMatch[1];
const decoderSource = slice(text.indexOf(`function ${decoderName}(`), '{');

/* The table a decoder reads is named inside the decoder itself. */
const arrayInside = /const\s+(_0x[0-9a-f]+)\s*=\s*(_0x[0-9a-f]+)\(\)/.exec(decoderSource);
if (arrayInside) arrayName = arrayInside[2];

const arrayStart = text.indexOf(`function ${arrayName}(){`);
const arrayFnSource = slice(arrayStart, '{');

/* The decoder shifts its index before it looks the string up. */
const shiftMatch = /_0x[0-9a-f]+\s*=\s*_0x[0-9a-f]+\s*-\s*\(([^)]+)\)/.exec(decoderSource);
let base = 0;
if (shiftMatch) {
  try {
    base = Number(eval(shiftMatch[1]));
  } catch {
    base = 0;
  }
}

const shuffler = text.includes('while(!![]){try{')
  ? (() => {
      const idx = text.indexOf('while(!![]){try{');
      const s = text.lastIndexOf('(function(', idx);
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

const decode = new Function(
  `${arrayFnSource}\n${shuffler}\n${decoderSource}\nreturn ${decoderName};`
)();

console.error(`base = 0x${base.toString(16)}`);
let count = 0;
let misses = 0;
for (let index = base; index < base + 6000; index++) {
  let value;
  try {
    value = decode(index);
  } catch {
    /* One index can fail while the rest of the table is fine. */
    misses++;
    if (misses > 40) break;
    continue;
  }
  if (value === undefined) {
    misses++;
    if (misses > 40) break;
    continue;
  }
  misses = 0;
  count++;
  if (!needle || String(value).includes(needle)) {
    console.log(`0x${index.toString(16)}\t${value}`);
  }
}
console.error(`decoded ${count} strings`);
