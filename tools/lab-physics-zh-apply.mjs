/*
 * Give an English simulation its Chinese wording.
 *
 * A simulation keeps its wording in one table.  The table is read, the
 * Chinese wording is put in beside the English, and the page is told
 * to speak Chinese.  Nothing else in the file is touched.
 *
 *   node tools/lab-physics-zh-apply.mjs [--dry]
 */
import fs from 'node:fs';
import path from 'node:path';
import { readStrings } from './lab-physics-strings.mjs';
import { checkScripts } from './lq-script-check.mjs';

const args = process.argv.slice(2);
const DRY = args.includes('--dry');

const CW = path.resolve('mirror/lab-physics/courseware');
/* The glossary travels with the project; a fresh copy is optional. */
const glossaryFile = fs.existsSync('tools/lab-physics-glossary.json')
  ? 'tools/lab-physics-glossary.json'
  : 'work/lab-physics-glossary.json';
const glossary = fs.existsSync(glossaryFile)
  ? JSON.parse(fs.readFileSync(glossaryFile, 'utf8'))
  : {};
const overrides = fs.existsSync('tools/lab-physics-zh-overrides.json')
  ? JSON.parse(fs.readFileSync('tools/lab-physics-zh-overrides.json', 'utf8'))
  : {};
const byValue = fs.existsSync('tools/lq-dictionary.json')
  ? JSON.parse(fs.readFileSync('tools/lq-dictionary.json', 'utf8'))
  : {};
/* The wording a reader actually sees, worked out from the rendered page. */
const visible = fs.existsSync('tools/lab-physics-zh-visible.json')
  ? JSON.parse(fs.readFileSync('tools/lab-physics-zh-visible.json', 'utf8'))
  : {};

const LRE = '\u202a';
const PDF = '\u202c';

const unwrap = (s) => s.replace(/^[\u202a\u202b]/, '').replace(/[\u202c]$/, '');
const wrap = (s) => `${LRE}${s}${PDF}`;

/* The key that holds the wording, and the wording itself. */
const keyOverrides = overrides.keys || {};
const valueOverrides = overrides.values || {};

let touched = 0;
let translated = 0;
let left = 0;
let kept = 0;

for (const f of fs.readdirSync(CW)) {
  if (!f.endsWith('.html')) continue;
  const file = path.join(CW, f);
  const r = readStrings(file);
  if (!r || !r.table || !r.table.en || r.table.zh_CN) continue;

  const en = r.table.en;
  const zh = {};
  for (const [key, raw] of Object.entries(en)) {
    const value = unwrap(String(raw));
    let out = null;
    if (keyOverrides[key]) {
      out = keyOverrides[key];
    } else if (glossary[key]) {
      out = glossary[key];
    } else if (visible[value]) {
      out = visible[value];
    } else if (valueOverrides[value]) {
      out = valueOverrides[value];
    } else if (byValue[value]) {
      out = byValue[value];
    } else if (/[\u3400-\u9fff]/.test(value)) {
      out = value;
    }
    if (out === null) {
      left++;
      zh[key] = value;
    } else {
      translated++;
      zh[key] = wrap(out);
    }
  }

  /* The English stays as the fallback, the Chinese becomes the language. */
  const table = { zh_CN: zh, en };
  const statement = `window.phet.chipper.strings = ${JSON.stringify(table)};`;

  const text = fs.readFileSync(file, 'utf8');
  const at = text.indexOf('window.phet.chipper.strings = ');
  if (at < 0) continue;
  /* The statement runs to the semicolon that ends it. */
  let i = at + 'window.phet.chipper.strings = '.length;
  let depth = 0;
  let inStr = null;
  for (; i < text.length; i++) {
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
    else if (c === ';' && depth === 0) break;
  }

  let after =
    text.slice(0, at) +
    statement +
    text.slice(i);
  after = after.replace(
    /(window\.phet\.chipper\.locale\s*=\s*)'[^']*'/,
    "$1'zh_CN'"
  );
  after = after.replace(/<html lang="[^"]*"/i, '<html lang="zh"');

  if (after === text) continue;
  /*
   * A simulation whose scripts no longer read well is not written out.
   * The wording is better left in English than the simulation is left
   * broken.
   */
  const sound = checkScripts(after);
  if (!sound.ok) {
    kept++;
    console.log(`kept ${f}: ${sound.error}`);
    continue;
  }
  touched++;
  console.log(`${f.replace(/\.html$/, '')}: ${Object.keys(zh).length} keys, ${translated} written`);
  if (!DRY) fs.writeFileSync(file, after);
  translated = 0;
  left = 0;
}

console.log(`\n${DRY ? 'would touch' : 'touched'} ${touched} simulations`);
if (kept) console.log(`kept ${kept} simulations as they were`);
