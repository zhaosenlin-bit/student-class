#!/usr/bin/env node
/*
 * The Chinese of a simulation, told to the program.
 *
 * A simulation keeps its wording in a table, and the table may hold
 * a Chinese beside the English.  For the program to speak that
 * Chinese, the list of languages must know it as well, and the page
 * must be told which language it is in.
 *
 * Without that, the simulation stops at the first thing it says:
 * the language of the table is not in the list of languages.
 *
 *   node tools/lab-physics-zh-locale.mjs [--dry]
 */
import fs from 'node:fs';
import path from 'node:path';
import { checkScripts } from './lq-script-check.mjs';

const args = process.argv.slice(2);
const DRY = args.includes('--dry');

/* The languages a simulation may be in. */
const CHINESE = {
  locale3: 'zho',
  englishName: 'Chinese (Simplified)',
  localizedName: '中文 (中国)',
  direction: 'ltr',
  bcp47: 'zh'
};

const ROOTS = ['mirror/lab-physics/courseware', 'mirror/leqixiang/courseware'];

/* The place where the statement ends. */
const endOfStatement = (text, from) => {
  let depth = 0;
  let inStr = null;
  for (let i = from; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      inStr = c;
      continue;
    }
    if (c === '(' || c === '{' || c === '[') depth++;
    else if (c === ')' || c === '}' || c === ']') depth--;
    else if (c === ';' && depth === 0) return i;
  }
  return -1;
};

/* The object of a statement, and where it ends. */
const objectOf = (text, head) => {
  const at = text.indexOf(head);
  if (at < 0) return null;
  const from = at + head.length;
  const brace = text.indexOf('{', from);
  if (brace < 0) return null;
  let depth = 0;
  let inStr = null;
  for (let i = brace; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'") {
      inStr = c;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return { at, brace, close: i };
    }
  }
  return null;
};

let touched = 0;
const skipped = [];

for (const root of ROOTS) {
  if (!fs.existsSync(root)) continue;
  for (const name of fs.readdirSync(root)) {
    if (!name.endsWith('.html')) continue;
    const file = path.join(root, name);
    const text = fs.readFileSync(file, 'utf8');
    if (!text.includes('window.phet.chipper.strings')) continue;

    const table = objectOf(text, 'window.phet.chipper.strings = ');
    if (!table) continue;
    const locales = JSON.parse(text.slice(table.brace, table.close + 1));
    if (!locales.zh_CN) continue;

    const data = objectOf(text, 'window.phet.chipper.localeData = ');
    if (!data) continue;
    const known = JSON.parse(text.slice(data.brace, data.close + 1));
    if (known.zh_CN) continue;

    /* The language is written into the list of languages. */
    let out =
      text.slice(0, data.close) +
      ',' +
      JSON.stringify('zh_CN') +
      ':' +
      JSON.stringify(CHINESE) +
      text.slice(data.close);

    /* And the page is told to speak it. */
    out = out.replace(/(window\.phet\.chipper\.locale\s*=\s*)'[^']*'/, "$1'zh_CN'");
    out = out.replace(/<html lang="[^"]*"/i, '<html lang="zh"');

    const sound = checkScripts(out);
    if (!sound.ok) {
      skipped.push(`${file}  (${sound.error})`);
      continue;
    }
    touched++;
    console.log(`${file}: the language zh_CN is now known`);
    if (!DRY) fs.writeFileSync(file, out, 'utf8');
  }
}

console.log(`\n${DRY ? 'would touch' : 'touched'} ${touched} simulations`);
for (const s of skipped) console.log('kept as it was:', s);
