#!/usr/bin/env node
/*
 * Finish the Chinese wording of a simulation.
 *
 * A simulation keeps every word it shows in one table, with one row
 * for each language.  The English row is the one that is written in
 * the file; the Chinese row is filled in beside it.  A row that has
 * no Chinese yet is the only one that is touched here.
 *
 * The work is done in three steps:
 *
 *   --collect   list the wording that is still English
 *   --translate ask for the Chinese wording and keep it
 *   --apply     put the Chinese into the simulations
 *
 * A simulation whose scripts no longer read well is left as it was.
 *
 *   node tools/lab-physics-zh-fill.mjs --collect
 *   node tools/lab-physics-zh-fill.mjs --translate --conc 5
 *   node tools/lab-physics-zh-fill.mjs --apply
 */
import fs from 'node:fs';
import path from 'node:path';
import { chat } from './lq-relay.mjs';
import { checkScripts } from './lq-script-check.mjs';
import { readStrings } from './lab-physics-strings.mjs';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const has = (name) => args.includes(`--${name}`);

const CW = path.resolve('mirror/lab-physics/courseware');
const LIB = path.resolve('mirror/leqixiang/courseware');
const CACHE = arg('cache', 'tools/lab-physics-zh-values.json');
const OUT = arg('out', 'work/lab-physics-zh-values.json');
const MODEL = arg('model', 'gpt-5.6');
const CONC = Number(arg('conc', 5));
const BATCH = Number(arg('batch', 15));

const LRE = '\u202a';
const PDF = '\u202c';
const unwrap = (s) => s.replace(/^[\u202a\u202b]/, '').replace(/[\u202c]$/, '');
const wrap = (s) => `${LRE}${s}${PDF}`;

/* The files that hold a simulation. */
function simFiles() {
  return fs.readdirSync(CW).filter((f) => f.endsWith('.html')).sort();
}

/* The English row of a simulation, and the Chinese row it already has. */
function tableOf(file) {
  const r = readStrings(file);
  if (!r || !r.table || !r.table.en) return null;
  return { en: r.table.en, zh: r.table.zh_CN || {} };
}

/* ------------------------------------------------------------------ */
/*  What is worth wording                                              */
/* ------------------------------------------------------------------ */

const CJK = /[\u3400-\u9fff]/;

/*
 * A row that holds nothing but a sign or a number is not wording.
 * The row also carries the name of a symbol in some simulations, and
 * those names are left as they are.
 */
function worthWording(value) {
  if (!value) return false;
  const s = unwrap(String(value)).trim();
  if (!s) return false;
  if (CJK.test(s)) return false;
  /* Two letters and a sign, such as "m/s" or "1.5 N". */
  if (!/[A-Za-z]{3}/.test(s)) return false;
  /* A name that belongs to a part of the program. */
  if (/^[A-Za-z][A-Za-z0-9]*(\.[A-Za-z][A-Za-z0-9]*)+$/.test(s)) return false;
  return true;
}

/*
 * Some of the rows are not wording but a shape: a line that only
 * holds a placeholder, or a short name that the program looks up.
 * Those are left as they are.
 */
function worthTranslating(value) {
  const s = unwrap(String(value)).trim();
  if (!s) return false;
  /* A row of several lines is a shape the program reads line by line. */
  if (s.includes('\n')) return false;
  /* What is left when the placeholders are taken away is the wording. */
  const rest = s.replace(/\{\{[^}]*\}\}/g, ' ').replace(/\{[^{}]*\}/g, ' ');
  if (!/[A-Za-z]{3}/.test(rest)) return false;
  return true;
}

/* ------------------------------------------------------------------ */
/*  Collect                                                            */
/* ------------------------------------------------------------------ */

if (has('collect')) {
  const unique = new Map();
  let slots = 0;
  for (const f of simFiles()) {
    const t = tableOf(path.join(CW, f));
    if (!t) continue;
    for (const [key, raw] of Object.entries(t.en)) {
      if (CJK.test(t.zh[key] || '')) continue;
      const value = unwrap(String(raw));
      if (!worthWording(value)) continue;
      slots++;
      if (!unique.has(value)) unique.set(value, []);
      unique.get(value).push(`${f}:${key}`);
    }
  }
  const list = [...unique].map(([source, where]) => ({ source, where }));
  fs.writeFileSync(OUT, JSON.stringify(list, null, 1));
  console.log(`${slots} rows still English, ${list.length} different wordings`);
  console.log(`written to ${OUT}`);
}

/* ------------------------------------------------------------------ */
/*  Translate                                                          */
/* ------------------------------------------------------------------ */

if (has('translate')) {
  let cache = {};
  if (fs.existsSync(CACHE)) cache = JSON.parse(fs.readFileSync(CACHE, 'utf8'));
  const list = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  const todo = list
    .map((x) => x.source)
    .filter((s) => !cache[s])
    .filter((s) => worthTranslating(s));
  console.log(`to translate ${todo.length}, already known ${list.length - todo.length}`);

  const queue = todo.slice();
  let done = 0;
  let failed = 0;

  const worker = async () => {
    while (queue.length) {
      const batch = queue.splice(0, BATCH);
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
                '你是物理课堂课件的中文译者。下面每一行是仿真课件里读者会看到的英文文本，' +
                '行首的数字是编号。请逐行翻译成简体中文。\n' +
                '规则：\n' +
                '1. 严格保留 {{placeholder}} 形式的占位符，一个都不能改、不能少、不能多；\n' +
                '2. 保留 HTML 标签（如 <b>、<br>、<i>、<sub>、<sup>）原样；\n' +
                '3. 保留数字、单位、公式、上下标符号（如 θ、Ω、₂、⁻）原样；\n' +
                '4. 术语用物理教材的标准中文译法，语气简洁自然；\n' +
                '5. 不要添加解释，不要合并或拆分行；\n' +
                '6. 严格按 "<编号>\\t<译文>" 输出一行一条，条数必须与输入一致。'
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
        const src = batch[i];
        if (!zh) continue;
        /* The placeholders must all survive. */
        const want = (src.match(/\{[^{}]*\}/g) || []).sort().join('|');
        const have = (zh.match(/\{[^{}]*\}/g) || []).sort().join('|');
        if (want !== have) {
          failed++;
          continue;
        }
        if (!CJK.test(zh)) continue;
        cache[src] = zh;
        done++;
      }
      failed += batch.length - got.size;
      if (done % 150 < BATCH) {
        fs.writeFileSync(CACHE, JSON.stringify(cache, null, 1));
        console.log(`  ${done} done, ${queue.length} waiting`);
      }
    }
  };

  await Promise.all(Array.from({ length: CONC }, worker));
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
  const glossary = fs.existsSync('tools/lab-physics-glossary.json')
    ? JSON.parse(fs.readFileSync('tools/lab-physics-glossary.json', 'utf8'))
    : {};

  let touched = 0;
  let written = 0;
  let left = 0;
  let kept = 0;

  /* Replace the table in a file with a new one. */
  const put = (text, table) => {
    const KEY = 'window.phet.chipper.strings = ';
    const at = text.indexOf(KEY);
    if (at < 0) return null;
    let i = at + KEY.length;
    let depth = 0;
    let inStr = null;
    for (; i < text.length; i++) {
      const c = text[i];
      if (inStr) {
        if (c === '\\') { i++; continue; }
        if (c === inStr) inStr = null;
        continue;
      }
      if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
      if (c === '(' || c === '{' || c === '[') depth++;
      else if (c === ')' || c === '}' || c === ']') depth--;
      else if (c === ';' && depth === 0) break;
    }
    /* The mark that ends the statement is kept as it was. */
    return text.slice(0, at) + KEY + JSON.stringify(table) + text.slice(i);
  };

  const work = (file) => {
    const r = readStrings(file);
    if (!r || !r.table || !r.table.en) return;
    const en = r.table.en;
    const zh = {};
    for (const [key, raw] of Object.entries(en)) {
      const value = unwrap(String(raw));
      const have = r.table.zh_CN?.[key];
      if (have && CJK.test(unwrap(String(have)))) {
        zh[key] = have;
        continue;
      }
      const g = glossary[key];
      const c = cache[value];
      const out = g || c;
      if (out && CJK.test(out)) {
        zh[key] = wrap(out);
        written++;
      } else {
        /* The English is kept exactly as it was written. */
        zh[key] = raw;
        left++;
      }
    }
    const text = fs.readFileSync(file, 'utf8');
    const after = put(text, { zh_CN: zh, en });
    if (after === null || after === text) return;
    const sound = checkScripts(after);
    /*
     * A file that already had a fault keeps its place; a file that
     * was sound before and is not sound now is left as it was.
 */
    const before = checkScripts(text);
    if (!sound.ok && (before.ok || before.error !== sound.error)) {
      kept++;
      console.log(`kept ${path.basename(file)}: ${sound.error}`);
      return;
    }
    write(file, after);
    touched++;
  };

  for (const f of simFiles()) {
    work(path.join(CW, f));
    const lib = path.join(LIB, `lab-physics-${f}`);
    if (fs.existsSync(lib)) work(lib);
  }

  console.log(`\ntouched ${touched} files, ${written} rows worded, ${left} rows left English`);
  if (kept) console.log(`kept ${kept} files as they were`);
}

/* Write a file, trying again when the disk says no for a moment. */
function write(file, text) {
  for (let i = 0; i < 5; i++) {
    try {
      fs.writeFileSync(file, text, 'utf8');
      return;
    } catch (e) {
      if (i === 4) throw e;
    }
  }
}
