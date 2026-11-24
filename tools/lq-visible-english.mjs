#!/usr/bin/env node
/*
 * Find the English a reader actually sees, and say where it lives.
 *
 * The lesson is opened in a real browser and the text on the glass is
 * read.  Every piece of that text that is still English is looked up
 * in the file, so the wording can be changed where it is written.
 *
 *   node tools/lq-visible-english.mjs --collect --ids a,b,c
 */
import fs from 'node:fs';
import path from 'node:path';
import { connect, sleep } from './cdpx.mjs';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const has = (name) => args.includes(`--${name}`);

const CDP = Number(arg('cdp', 9226));
const LQ = Number(arg('lq', 4173));
const WAIT = Number(arg('wait', 4200));
const OUT = arg('out', 'work/lq-visible-english.json');
const CONC = Number(arg('conc', 4));

const BUILD = path.resolve('mirror/leqixiang/courseware');

const SOURCE_DIRS = [
  'mirror/lab-course/courseware',
  'mirror/lab-reaction/courseware',
  'mirror/lab-virtual/courseware',
  'mirror/lab-physics/courseware',
  'mirror/lab-explore/courseware',
  'mirror/lab-process/courseware',
  'mirror/studio/courseware'
];

const PREFIXES = [
  'lab-reaction-',
  'lab-virtual-',
  'lab-physics-',
  'lab-explore-',
  'lab-process-',
  'game-block-',
  'lab-course-',
  'lq-'
];

/* The source file that a lesson in the library was made from. */
export function sourceOf(id) {
  let name = id;
  for (const p of PREFIXES) {
    if (name.startsWith(p)) {
      name = name.slice(p.length);
      break;
    }
  }
  if (id.startsWith('lq-')) name = id.slice(4);
  for (const dir of SOURCE_DIRS) {
    const f = path.join(dir, `${name}.html`);
    if (fs.existsSync(f)) return f;
  }
  return null;
}

const CJK = /[\u3000-\u303f\u3400-\u9fff\uff00-\uffef]/;

const isEnglish = (s) => {
  if (!s) return false;
  if (CJK.test(s)) return false;
  const letters = (s.match(/[A-Za-z]/g) || []).length;
  if (letters < 3) return false;
  const core = s.replace(/\s+/g, '');
  return letters / Math.max(1, core.length) > 0.5;
};

const READ_TEXT = `(() => {
  const out = [];
  const walk = (doc) => {
    if (!doc) return;
    const body = doc.body;
    if (!body) return;
    const seen = new Set();
    const nodes = doc.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = nodes.nextNode())) {
      const el = n.parentElement;
      if (!el) continue;
      const tag = el.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') continue;
      const style = getComputedStyle(el);
      if (!style || style.display === 'none' || style.visibility === 'hidden') continue;
      if (el.closest('[hidden], [aria-hidden="true"]')) continue;
      const t = (n.nodeValue || '').replace(/\\s+/g, ' ').trim();
      if (!t) continue;
      if (seen.has(t)) continue;
      seen.add(t);
      out.push(t);
    }
  };
  walk(document);
  for (const f of document.querySelectorAll('iframe')) {
    try { walk(f.contentDocument); } catch (e) {}
  }
  return JSON.stringify(out);
})()`;

/* Marks that say the word is a name, not something a reader reads. */
const NOT_TEXT = [
  /id\s*=\s*["']/,
  /class\s*=\s*["']/,
  /data-[\w-]+\s*=\s*["']/,
  /for\s*=\s*["']/,
  /(?:src|href)\s*=\s*["']/
];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* Look the wording up in the file, with the white space loose. */
function findInFile(text, phrase) {
  if (text.includes(phrase)) {
    const at = text.indexOf(phrase);
    const before = text.slice(Math.max(0, at - 40), at);
    if (NOT_TEXT.some((re) => re.test(before))) return null;
    return phrase;
  }
  const loose = phrase.split(/\s+/).map(escapeRe).join('\\s+');
  const m = new RegExp(loose).exec(text);
  if (!m) return null;
  const before = text.slice(Math.max(0, m.index - 40), m.index);
  if (NOT_TEXT.some((r) => r.test(before))) return null;
  return m[0];
}

const catalog = JSON.parse(
  fs.readFileSync('mirror/leqixiang/catalog.json', 'utf8')
);
let ids = catalog.products.filter((p) => p.localInstalled).map((p) => p.id);

if (arg('ids', '')) {
  ids = arg('ids', '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

const only = arg('only', '');
if (only) ids = ids.filter((id) => id.includes(only));

async function collect() {
const found = [];
let done = 0;
const queue = ids.slice();

const worker = async () => {
  const page = await connect(CDP);
  while (queue.length) {
    const id = queue.shift();
    const file = path.join(BUILD, `${id}.html`);
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    try {
      await page.goto(`http://127.0.0.1:${LQ}/courseware/${id}.html`);
      await sleep(WAIT);
      const raw = await page.evaluate(READ_TEXT);
      const seen = new Set();
      for (const piece of JSON.parse(raw)) {
        if (!isEnglish(piece)) continue;
        if (seen.has(piece)) continue;
        seen.add(piece);
        const hit = findInFile(text, piece);
        if (!hit) continue;
        found.push({ id, source: hit });
      }
    } catch (e) {
      console.error(`${id}: ${e.message}`);
    }
    done++;
    if (done % 50 === 0) console.log(`  ${done} lessons read`);
  }
  await page.close();
};

await Promise.all(Array.from({ length: CONC }, worker));

const words = new Map();
for (const f of found) {
  if (!words.has(f.source)) words.set(f.source, []);
  words.get(f.source).push(f.id);
}

const out = {
  lessons: done,
  pieces: found.length,
  distinct: words.size,
  words: [...words.entries()].map(([source, ids]) => ({ source, ids }))
};
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(`\n${done} lessons read, ${found.length} pieces of English, ${words.size} distinct`);
console.log(`written to ${OUT}`);
}

/* The file is also used for the one thing it knows about the lessons:
   where a lesson in the library was made from. */
if (process.argv[1] && process.argv[1].endsWith('lq-visible-english.mjs')) {
  await collect();
}
