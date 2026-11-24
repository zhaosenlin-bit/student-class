#!/usr/bin/env node
/*
 * Put back the words of the program that were given a Chinese by
 * mistake.
 *
 * A lesson holds two kinds of English: the wording a reader sees, and
 * the names the program uses for its own parts.  The second kind has
 * to keep its name, or the lesson breaks.
 *
 * The place a word stands in tells the two apart.  A word that names
 * a part of the program goes back to English: a word behind `key:`,
 * `id:`, `world:`, `scene:` and the like, a word that is compared
 * with `===`, a word that is the name of a part of the program, a
 * word that is the name of a part of a style, and a word that is
 * handed to a call which looks a name up.  A word behind `text:`,
 * `title:`, `label:` and the like is wording and stays Chinese.
 *
 * The older lesson says what every word was, so a word that stands
 * in the place of a name, that the older lesson had in English and
 * the newer lesson has in Chinese, goes back to the English of the
 * older lesson.
 *
 *   node tools/lq-code-words.mjs --check --base <commit> --roots <dirs>
 *   node tools/lq-code-words.mjs --fix   --base <commit> --roots <dirs>
 *   node tools/lq-code-words.mjs --list  --base <commit> --roots <dirs>
 */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import * as acorn from './vendor/acorn.mjs';
import { stringsOf } from './lq-js-strings.mjs';
import { alignLiterals } from './lq-align.mjs';
import { skeletonOf } from './lq-skeleton.mjs';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf('--' + name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const has = (name) => args.includes('--' + name);

const BASE = arg('base', 'c597fb9d');
const ROOTS = arg('roots', 'mirror/leqixiang/courseware').split(',');

const CJK = /[\u3400-\u9fff]/;

/* The names the program gives to its own parts. */
const IDENT = new Set(
  (
    'key keys id ids name names world worlds scene scenes type types kind kinds ' +
    'mode modes group groups tag tags role roles state states target targets ' +
    'action actions class cls part parts variant variants view views panel ' +
    'panels step steps page pages tab tabs item items index code codes src ' +
    'href url path paths file files filename dir folder asset assets icon ' +
    'icons symbol symbols ref refs param params field fields dataset slug hash ' +
    'ext extension format mime bin module plugin node edge side axis tone ' +
    'pitch speed size weight color'
  ).split(/\s+/)
);

/* The words a style knows by name.  A style cannot speak Chinese. */
const CSS_VALUE = new Set(
  (
    'visible hidden block none flex grid inline inline-block absolute relative ' +
    'fixed static sticky auto inherit initial unset revert solid dashed dotted ' +
    'bold normal italic center left right top bottom middle baseline stretch ' +
    'wrap nowrap currentcolor transparent cover contain border-box ' +
    'content-box padding-box scroll pointer default always'
  ).split(/\s+/)
);

/* The names the events of a page have.  An event cannot speak Chinese. */
const EVENTS = new Set(
  (
    'click submit change input focus blur keydown keyup load error resize ' +
    'scroll mouseover mouseout mousemove touchstart touchend touchmove ' +
    'animationstart animationend transitionend contextmenu wheel ' +
    'keypress dblclick mousedown mouseup pointerdown pointerup focusin ' +
    'focusout dragenter dragover dragleave drop'
  ).split(/\s+/)
);

/* The marks a program carries at its head. */
const STRICT = 'use strict';

/* The parts of a style that are made of. */
const CSS_PROP = new Set(
  (
    'visibility display position top left right bottom width height margin ' +
    'padding color background backgroundColor opacity transform transition ' +
    'zIndex overflow flexDirection justifyContent alignItems fontSize ' +
    'fontWeight border borderRadius boxShadow cursor pointerEvents animation ' +
    'filter whiteSpace lineHeight textAlign flex grid gap float clear ' +
    'listStyle outline boxSizing minHeight minWidth maxHeight maxWidth ' +
    'borderBottom borderTop borderLeft borderRight marginTop marginBottom ' +
    'paddingTop paddingBottom scrollBehavior touchAction userSelect objectFit ' +
    'aspectRatio backdropFilter mixBlendMode willChange transformOrigin ' +
    'fill stroke strokeWidth fontFamily fontStyle textDecoration'
  ).split(/\s+/)
);

/* The parts of a page a style is made of. */
const ATTR = new Set(
  (
    'id class type name href src for role lang dir tabindex rel target ' +
    'download colspan rowspan charset content http-equiv srcset sizes method ' +
    'action form cite media scope start reversed open selected disabled ' +
    'hidden required readonly multiple muted loop controls autoplay ' +
    'playsinline novalidate formnovalidate autocomplete autofocus ' +
    'contenteditable draggable spellcheck translate wrap style'
  ).split(/\s+/)
);

/* The blocks of script a page holds. */
const scriptBlocks = (text) => {
  const out = [];
  const lower = text.toLowerCase();
  let i = 0;
  while (i < text.length) {
    const at = lower.indexOf('<script', i);
    if (at < 0) break;
    const open = text.indexOf('>', at);
    if (open < 0) break;
    const close = lower.indexOf('</script', open);
    const end = close < 0 ? text.length : close;
    out.push({ start: open + 1, end });
    i = close < 0 ? text.length : close + 8;
  }
  return out;
};

/* The name of the thing a call is made on. */
const nameOf = (node) => {
  if (!node) return null;
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'MemberExpression' && !node.computed) {
    const object = nameOf(node.object);
    const property = node.property && node.property.name;
    if (object && property) return object + '.' + property;
    return property || object || null;
  }
  return null;
};

/*
 * The place every string stands in.
 *
 * The program is read with a reader that knows JavaScript, and every
 * string is told what it is: a name of a part of the program, a word
 * that is compared, a word that is handed to a call, a word behind a
 * name of a part.
 */
const rolesOfJs = (code, offset) => {
  const out = [];
  const used = new Set();
  let ast;
  try {
    ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'script' });
  } catch {
    try {
      ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module' });
    } catch {
      return null;
    }
  }

  const visit = (node, ctx) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item, ctx);
      return;
    }
    if (node.type === 'Identifier') {
      used.add(node.name.toLowerCase());
      return;
    }
    if (node.type === 'Literal' && typeof node.value === 'string') {
      out.push({
        start: node.start + offset,
        end: node.end + offset,
        value: node.value,
        role: ctx.role || 'value',
        field: ctx.field || null,
        compare: !!ctx.compare,
        call: ctx.call || null
      });
      return;
    }
    if (node.type === 'Property' || node.type === 'PropertyDefinition') {
      const key = node.key;
      const field =
        key && key.type === 'Identifier'
          ? key.name
          : key && key.type === 'Literal'
            ? String(key.value)
            : null;
      if (key && key.type === 'Literal' && typeof key.value === 'string') {
        visit(key, { ...ctx, role: 'key', field });
      }
      visit(node.value, { ...ctx, role: 'value', field: field || ctx.field });
      return;
    }
    if (node.type === 'BinaryExpression' && /^(===|!==|==|!=)$/.test(node.operator)) {
      visit(node.left, { ...ctx, role: 'value', compare: true });
      visit(node.right, { ...ctx, role: 'value', compare: true });
      return;
    }
    if (node.type === 'CallExpression' || node.type === 'NewExpression') {
      visit(node.callee, ctx);
      const call = nameOf(node.callee);
      for (const a of node.arguments) visit(a, { ...ctx, role: 'value', call });
      return;
    }
    if (node.type === 'MemberExpression') {
      visit(node.object, ctx);
      if (node.computed) {
        visit(node.property, { ...ctx, role: 'value', field: ctx.field });
      }
      return;
    }
    if (node.type === 'AssignmentExpression') {
      const left = node.left;
      const field =
        left && left.type === 'MemberExpression' && left.property
          ? left.property.name || null
          : null;
      visit(left, ctx);
      visit(node.right, { ...ctx, role: 'value', field: field || ctx.field });
      return;
    }
    for (const key of Object.keys(node)) {
      if (key === 'start' || key === 'end' || key === 'type') continue;
      const value = node[key];
      if (value && typeof value === 'object') visit(value, ctx);
    }
  };

  visit(ast, {});
  return { roles: out, used };
};

/* The place every string of a lesson stands in. */
const rolesOf = (text, kind) => {
  const out = [];
  const used = new Set();
  if (kind === 'js') {
    const got = rolesOfJs(text, 0);
    if (!got) return null;
    out.push(...got.roles);
    for (const w of got.used) used.add(w);
  } else {
    for (const block of scriptBlocks(text)) {
      const got = rolesOfJs(text.slice(block.start, block.end), block.start);
      if (!got) continue;
      out.push(...got.roles);
      for (const w of got.used) used.add(w);
    }
    for (const s of stringsOf(text, 'html')) {
      if (!s.inTag) continue;
      const head = text.slice(0, s.start);
      const attr = (/<([A-Za-z-]+)\s*=\s*["'][^"']*$/.exec(head) || [])[1];
      out.push({
        start: s.start,
        end: s.end,
        value: s.value,
        role: 'attr',
        field: attr ? attr.toLowerCase() : null,
        compare: false,
        call: null
      });
    }
  }
  out.sort((a, b) => a.start - b.start);
  return { roles: out, used };
};

/* The program of a lesson with its wording taken out. */
const codeOf = (text, kind) => {
  const mark = /\u00a4/g;
  if (kind === 'js') {
    try {
      return skeletonOf(text, 'js').shape.replace(mark, ' ');
    } catch {
      return '';
    }
  }
  const parts = [];
  for (const block of scriptBlocks(text)) {
    try {
      parts.push(skeletonOf(text.slice(block.start, block.end), 'js').shape.replace(mark, ' '));
    } catch {
      /* a program that does not read well holds nothing to look at */
    }
  }
  return parts.join('\n');
};

/* Whether the program still speaks of a word by name. */
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const saysWord = (code, word) => {
  if (!code) return false;
  const re = new RegExp(
    '(^|[^A-Za-z0-9_$])' + escapeRe(word) + '([^A-Za-z0-9_$]|$)',
    'i'
  );
  return re.test(code);
};

/*
 * Whether a word has to go back to the English of the older lesson.
 *
 * A word that the program still names is a name of a part of the
 * program, and a name of a part of the program cannot be given a
 * Chinese.  A word that a style knows by name cannot be given a
 * Chinese either, and neither can the name of an event, nor the mark
 * that says a program is strict.
 */
const shouldGoBack = (from, code) => {
  const word = String(from).trim();
  if (!word) return false;
  if (word === STRICT) return true;
  const low = word.toLowerCase();
  if (CSS_VALUE.has(low)) return true;
  if (EVENTS.has(low)) return true;
  if (/^[A-Za-z_$][\w$]*$/.test(word) && saysWord(code, word)) return true;
  return false;
};

const files = execFileSync(
  'git',
  ['diff', '--name-only', BASE, '--', ...ROOTS],
  { encoding: 'utf8', maxBuffer: 1 << 28 }
)
  .split(/\r?\n/)
  .filter(Boolean);

let fixed = 0;
let changedFiles = 0;
const rows = [];
const skipped = [];

for (const file of files) {
  let oldText;
  try {
    oldText = execFileSync('git', ['show', `${BASE}:${file}`], {
      encoding: 'utf8',
      maxBuffer: 1 << 28,
      stdio: ['ignore', 'pipe', 'ignore']
    });
  } catch {
    continue;
  }
  const newText = fs.readFileSync(file, 'utf8');
  const kind = file.endsWith('.js') ? 'js' : 'html';

  const pairs = alignLiterals(oldText, newText, kind);
  if (!pairs) {
    skipped.push(file);
    continue;
  }
  const got = rolesOf(newText, kind);
  if (!got) {
    skipped.push(file);
    continue;
  }
  const code = codeOf(newText, kind);

  /* The strings of the newer lesson, each with its place. */
  const byStart = new Map();
  for (const r of got.roles) byStart.set(r.start, r);

  const mends = [];
  for (const pair of pairs) {
    const from = pair.old.value.trim();
    const to = pair.now.value.trim();
    if (from === to) continue;
    if (CJK.test(from)) continue;
    if (!CJK.test(to)) continue;
    const role = byStart.get(pair.now.start);
    if (!role) continue;
    if (!shouldGoBack(from, code)) continue;
    mends.push({ at: pair.now.start, end: pair.now.end, raw: pair.old.raw, from, to, role });
  }
  if (!mends.length) continue;

  rows.push({ file, mends });
  if (!has('fix')) {
    console.log(`${file}  ${mends.length}`);
    continue;
  }
  let out = newText;
  for (const m of mends.sort((a, b) => b.at - a.at)) {
    out = out.slice(0, m.at) + m.raw + out.slice(m.end);
  }
  fs.writeFileSync(file, out, 'utf8');
  fixed += mends.length;
  changedFiles++;
}

console.log(
  `${has('fix') ? 'put back' : 'would put back'} ${fixed} words in ${changedFiles} files`
);
if (skipped.length) {
  console.log(`${skipped.length} files left alone (the strings do not line up)`);
}
if (has('list')) {
  for (const r of rows) {
    for (const m of r.mends) {
      console.log(`  ${r.file}  ${m.from} -> ${m.to}  role=${m.role.role} field=${m.role.field}`);
    }
  }
}
