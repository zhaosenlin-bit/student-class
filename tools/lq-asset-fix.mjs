#!/usr/bin/env node
/*
 * Give the English in the course materials a Chinese wording.
 *
 * A lesson is not always one file.  The questions, the names and
 * the wording of a lesson often live in a folder of its own, next
 * to the page:  <id>.assets/*.js
 *
 * The wording that the browser read but could not be found in the
 * page is looked for in that folder.  A piece of wording is only
 * given a Chinese when it stands there as a whole string, so that
 * the name of a part of the program is never touched.
 *
 *   node tools/lq-asset-fix.mjs --translate
 *   node tools/lq-asset-fix.mjs --apply
 */
import fs from 'node:fs';
import path from 'node:path';
import { chat } from './lq-relay.mjs';
import { checkProgram } from './lq-script-check.mjs';
import { worthWording } from './lq-english-filter.mjs';
import { sourceOf } from './lq-sources.mjs';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const has = (name) => args.includes(`--${name}`);

const LIB = 'mirror/leqixiang/courseware';
const MISSING = arg('missing', 'work/lq-missing-all.json');
const CACHE = arg('cache', 'work/lq-visible-zh.json');
const CONC = Number(arg('conc', 6));
const MODEL = arg('model', 'gpt-5.6');
const MODEL_BATCH = 15;

/* Only these are read; the libraries of a lesson are left alone. */
const TEXT_EXT = /\.(js|mjs|cjs|json|css|html|txt|svg)$/i;
const SKIP_FILE = /(\.min\.js$|^vendor\/|^shared\/|cdnjs|jsdelivr|unpkg|three\.|\.map$)/i;

const CJK = /[\u3000-\u303f\u3400-\u9fff\uff00-\uffef]/;

const tidy = (zh) =>
  String(zh)
    .replace(/&nbsp;/gi, ' ')
    .replace(/PEP\s*ENGLISH/gi, '英语')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

/* ------------------------------------------------------------------ */
/*  The folders of a lesson                                            */
/* ------------------------------------------------------------------ */

function filesUnder(dir) {
  const out = [];
  const walk = (d) => {
    let list;
    try {
      list = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of list) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && TEXT_EXT.test(e.name)) out.push(full);
    }
  };
  walk(dir);
  return out;
}

/*
 * The materials of a lesson: the folder that stands beside it, and
 * the files that bear its own name.  The other lessons of the same
 * family are left alone.
 */
function filesOf(id) {
  const out = [];
  const seen = new Set();
  const push = (file) => {
    if (seen.has(file)) return;
    seen.add(file);
    out.push(file);
  };
  const pushAll = (dir) => {
    for (const f of filesUnder(dir)) push(f);
  };
  pushAll(path.join(LIB, `${id}.assets`));
  const src = sourceOf(id);
  if (src) {
    const dir = path.dirname(src);
    const stem = path.basename(src).replace(/\.html?$/i, '');
    pushAll(path.join(dir, `${stem}.assets`));
    /* The files that stand beside the page under its own name. */
    for (const f of filesUnder(dir)) {
      const name = path.basename(f).replace(/\.[^.]+$/, '');
      if (name === stem) push(f);
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Finding a piece of wording in a file                              */
/* ------------------------------------------------------------------ */

/*
 * The wording a reader saw may have been written in the file with
 * a sign in it, or without.  Each shape is looked for.
 */
const shapes = (s) => {
  const out = new Set([s]);
  const nb = '\u00a0';
  if (s.includes(nb)) {
    out.add(s.split(nb).join('&nbsp;'));
    out.add(s.split(nb).join(' '));
  }
  if (s.includes(' ')) out.add(s.split(' ').join('&nbsp;'));
  return [...out];
};

/*
 * A piece of wording stands in a file as a whole string, between two
 * quotes.  A word inside a longer string is part of that string and
 * is not touched.
 */
function literalCount(text, phrase) {
  let n = 0;
  for (const q of ['"', "'"]) {
    const needle = q + phrase + q;
    let at = text.indexOf(needle);
    while (at >= 0) {
      n++;
      at = text.indexOf(needle, at + needle.length);
    }
  }
  return n;
}

const escapeFor = (s, q) =>
  q === '"' ? s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') : s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

/* ------------------------------------------------------------------ */
/*  The wording that is still in English                              */
/* ------------------------------------------------------------------ */

if (has('plan')) {
  const missing = loadMissing();
  const byId = new Map();
  for (const m of missing) {
    if (!m || !m.source) continue;
    if (!byId.has(m.id)) byId.set(m.id, new Set());
    byId.get(m.id).add(m.source);
  }
  let found = 0;
  let notFound = 0;
  for (const [id, list] of byId) {
    for (const phrase of list) {
      const hits = planFor(id, phrase);
      if (hits.length) {
        found++;
        console.log(
          `+ ${id}  ${phrase}  ->  ${hits
            .map((h) => `${path.basename(h.file)}×${h.count}`)
            .join(', ')}`
        );
      } else {
        notFound++;
        console.log(`- ${id}  ${phrase}`);
      }
    }
  }
  console.log(`\nfound ${found}, not found ${notFound}`);
  process.exit(0);
}

function loadMissing() {
  if (fs.existsSync(MISSING)) {
    return JSON.parse(fs.readFileSync(MISSING, 'utf8'));
  }
  const dir = 'work/collect';
  const out = [];
  for (const file of fs.readdirSync(dir).sort()) {
    if (!/^chunk-\d+-missing\.json$/.test(file)) continue;
    out.push(...JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')));
  }
  return out;
}

/*
 * Every place in the materials of a lesson where a piece of English
 * stands as a whole string.  The wording of the page itself is not
 * looked at here; that has been done already.
 */
function planFor(id, phrase) {
  const hits = [];
  for (const file of filesOf(id)) {
    const rel = path.basename(file);
    if (SKIP_FILE.test(rel)) continue;
    let text;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    if (text.length > 24 * 1024 * 1024) continue;
    for (const shape of shapes(phrase)) {
      const n = literalCount(text, shape);
      if (n) hits.push({ file, shape, count: n });
    }
  }
  return hits;
}

/* The words that are only ever a bridge between two others. */
const STOP = new Set([
  'about', 'above', 'after', 'again', 'against', 'along', 'already',
  'always', 'another', 'because', 'become', 'before', 'behind', 'below',
  'between', 'both', 'bring', 'came', 'cannot', 'could', 'course', 'down',
  'each', 'either', 'enough', 'every', 'first', 'found', 'from', 'give',
  'going', 'have', 'here', 'however', 'inside', 'instead', 'into', 'itself',
  'just', 'keep', 'know', 'last', 'later', 'least', 'left', 'less', 'like',
  'long', 'made', 'make', 'many', 'might', 'more', 'most', 'much', 'must',
  'need', 'never', 'next', 'night', 'only', 'other', 'over', 'own', 'part',
  'place', 'point', 'right', 'same', 'seem', 'shall', 'should', 'since',
  'some', 'still', 'such', 'sure', 'take', 'tell', 'than', 'that', 'their',
  'them', 'then', 'there', 'these', 'they', 'thing', 'think', 'this',
  'those', 'through', 'time', 'under', 'until', 'upon', 'very', 'want',
  'well', 'were', 'what', 'when', 'where', 'which', 'while', 'white',
  'whole', 'will', 'with', 'within', 'word', 'work', 'world', 'would',
  'write', 'wrong', 'year', 'your', 'young'
]);

/*
 * The wording of a lesson, and the parts it is made of.
 *
 * A number in front of the wording ("07 / TERRAIN") is put there by
 * the program, and the wording behind it stands on its own in the
 * file.  A single word is only looked for when it is a word with
 * meaning of its own, so that a word like "WHAT" is never taken
 * out of a sentence and given a Chinese of its own.
 */
function candidates(phrase) {
  const out = [phrase];
  const plain = phrase.replace(/&nbsp;/gi, ' ');
  const stripped = plain.replace(/^\s*\d+\s*[/·|\\-–—]\s*/, '').trim();
  if (stripped && stripped !== plain && !out.includes(stripped)) out.push(stripped);
  const words = phrase
    .replace(/&nbsp;/gi, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 6 && worthWording(w) && !STOP.has(w.toLowerCase()))
    .sort((a, b) => b.length - a.length);
  for (const w of words) if (!out.includes(w)) out.push(w);
  return out;
}

/* ------------------------------------------------------------------ */
/*  Translate                                                          */
/* ------------------------------------------------------------------ */

if (has('translate')) {
  const cache = fs.existsSync(CACHE)
    ? JSON.parse(fs.readFileSync(CACHE, 'utf8'))
    : {};
  const OVERRIDES = 'tools/lq-visible-overrides.json';
  if (fs.existsSync(OVERRIDES)) {
    const hand = JSON.parse(fs.readFileSync(OVERRIDES, 'utf8'));
    for (const [k, v] of Object.entries(hand)) cache[k] = v;
  }
  const missing = loadMissing();
  const seen = new Set();
  const todo = [];
  /* The wording that is written in the file, and the parts of it that
     stand on their own there.  Only these are worth a Chinese. */
  const wanted = new Set();
  for (const m of missing) {
    if (!m || !m.source || seen.has(m.source)) continue;
    seen.add(m.source);
    if (!worthWording(m.source)) continue;
    for (const cand of candidates(m.source)) {
      if (!worthWording(cand)) continue;
      if (!planFor(m.id, cand).length) continue;
      wanted.add(cand);
    }
  }
  for (const w of wanted) if (!cache[w]) todo.push(w);
  console.log(`to translate ${todo.length}, wording known ${Object.keys(cache).length}`);

  const queue = todo.slice();
  let done = 0;
  let failed = 0;
  const worker = async () => {
    while (queue.length) {
      const batch = queue.splice(0, MODEL_BATCH);
      const payload = batch
        .map((s, i) => `${i}\t${s.replace(/\r?\n/g, ' ')}`)
        .join('\n');
      let out = '';
      try {
        out = await chat(
          [
            {
              role: 'system',
              content:
                '你是互动课件的中文译者。下面每一行是课件里读者会看到的英文文本，' +
                '行首的数字是编号。请逐行翻译成简体中文，术语准确、简洁自然，' +
                '保留数字、单位、公式、上下标符号，人名音译为常见中文名，' +
                '不要添加解释，不要合并或拆分行。严格按 "<编号>\\t<译文>" 的格式输出，' +
                '一条一行，条数必须与输入一致。'
            },
            { role: 'user', content: payload }
          ],
          MODEL,
          0.1
        );
      } catch (e) {
        failed += batch.length;
        console.error(`  a batch failed: ${e.message.slice(0, 90)}`);
        continue;
      }
      const got = new Map();
      for (const line of String(out).split(/\r?\n/)) {
        const m = /^\s*(\d+)\s*[\t:]\s*(.*)$/.exec(line);
        if (!m) continue;
        const i = Number(m[1]);
        if (!(i >= 0 && i < batch.length)) continue;
        got.set(i, m[2].trim());
      }
      for (const [i, zh] of got) {
        if (!zh || !CJK.test(zh)) continue;
        cache[batch[i]] = tidy(zh);
        done++;
      }
      failed += batch.length - got.size;
      if (done % 100 < MODEL_BATCH) {
        fs.writeFileSync(CACHE, JSON.stringify(cache, null, 1));
        console.log(`  ${done} done, ${queue.length} waiting`);
      }
    }
  };
  await Promise.all(Array.from({ length: CONC }, worker));
  for (const k of Object.keys(cache)) cache[k] = tidy(cache[k]);
  fs.writeFileSync(CACHE, JSON.stringify(cache, null, 1));
  console.log(`\ntranslated ${done}, failed ${failed}, wording known ${Object.keys(cache).length}`);
}

/* ------------------------------------------------------------------ */
/*  Apply                                                              */
/* ------------------------------------------------------------------ */

if (has('apply')) {
  const cache = fs.existsSync(CACHE)
    ? JSON.parse(fs.readFileSync(CACHE, 'utf8'))
    : {};
  const OVERRIDES = 'tools/lq-visible-overrides.json';
  if (fs.existsSync(OVERRIDES)) {
    const hand = JSON.parse(fs.readFileSync(OVERRIDES, 'utf8'));
    for (const [k, v] of Object.entries(hand)) cache[k] = v;
  }
  for (const k of Object.keys(cache)) cache[k] = tidy(cache[k]);

  const missing = loadMissing();
  const byId = new Map();
  for (const m of missing) {
    if (!m || !m.source) continue;
    if (!byId.has(m.id)) byId.set(m.id, []);
    byId.get(m.id).push(m.source);
  }

  /* The plan is worked out once, and every file is read only once. */
  const work = new Map();
  let noChinese = 0;
  for (const [id, list] of byId) {
    for (const phrase of list) {
      if (!worthWording(phrase)) continue;
      /* The wording as it was read, or the part of it that stands on
         its own in the file. */
      let zh = null;
      let hits = [];
      for (const cand of candidates(phrase)) {
        if (!cache[cand]) continue;
        const found = planFor(id, cand);
        if (!found.length) continue;
        zh = cache[cand];
        hits = found;
        break;
      }
      if (!zh) {
        noChinese++;
        continue;
      }
      if (!hits.length) continue;
      for (const h of hits) {
        if (!work.has(h.file)) work.set(h.file, []);
        work.get(h.file).push({ shape: h.shape, zh });
      }
    }
  }

  let files = 0;
  let words = 0;
  let kept = 0;
  for (const [file, list] of work) {
    let text = fs.readFileSync(file, 'utf8');
    const before = text;
    /* The longer wording first, so that a shorter one inside it does
       not spoil it. */
    list.sort((a, b) => b.shape.length - a.shape.length);
    for (const { shape, zh } of list) {
      for (const q of ['"', "'"]) {
        const needle = q + shape + q;
        let at = text.indexOf(needle);
        while (at >= 0) {
          text =
            text.slice(0, at) +
            q +
            escapeFor(zh, q) +
            q +
            text.slice(at + needle.length);
          words++;
          at = text.indexOf(needle, at + zh.length + 2);
        }
      }
    }
    if (text === before) continue;
    if (/\.(js|mjs|cjs)$/i.test(file)) {
      const sound = checkProgram(text);
      const was = checkProgram(before);
      if (!sound.ok && (was.ok || was.error !== sound.error)) {
        kept++;
        console.log(`kept ${path.basename(file)}: ${sound.error}`);
        continue;
      }
    }
    fs.writeFileSync(file, text, 'utf8');
    files++;
  }
  console.log(`\n${words} wordings put into ${files} files`);
  if (noChinese) console.log(`${noChinese} wordings still without Chinese`);
  if (kept) console.log(`${kept} files kept as they were`);
}
