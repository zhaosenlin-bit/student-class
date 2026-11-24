#!/usr/bin/env node
/*
 * Give the Chinese wording to the words a simulation speaks out.
 *
 * A simulation keeps the words it shows in a table.  The words it
 * speaks to a screen reader are kept in the program itself, in small
 * blocks that hold one word each.  Those blocks are found here, the
 * English in them is given a Chinese wording, and the wording is put
 * back where it was.
 *
 *   --collect   list the wording that is still English
 *   --translate ask for the Chinese wording and keep it
 *   --apply     put the Chinese back into the simulations
 *
 *   node tools/lab-physics-zh-a11y.mjs --collect
 *   node tools/lab-physics-zh-a11y.mjs --translate --conc 6
 *   node tools/lab-physics-zh-a11y.mjs --apply
 */
import fs from 'node:fs';
import path from 'node:path';
import { chat } from './lq-relay.mjs';
import { checkScripts } from './lq-script-check.mjs';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const has = (name) => args.includes(`--${name}`);

const CW = path.resolve('mirror/lab-physics/courseware');
const LIB = path.resolve('mirror/leqixiang/courseware');
const CACHE = arg('cache', 'tools/lab-physics-zh-a11y.json');
const OUT = arg('out', 'work/lab-physics-zh-a11y.json');
const MODEL = arg('model', 'qwen3.8-flash');
const CONC = Number(arg('conc', 6));
const BATCH = Number(arg('batch', 10));

const CJK = /[\u3400-\u9fff]/;

/* One word of the program: {value:"the words"}. */
const WORD = /\{value:"((?:[^"\\]|\\.)*)"\}/g;

/* The beginning of a block of the program. */
const BLOCK = /,(\w+)\("((?:[^"\\]|\\.)*)"\s*[,)]/g;

/*
 * The parts of the file that hold the words a simulation speaks.
 * They sit inside a block whose name ends in A11yStrings.
 */
function spokenRegions(text) {
  const starts = [];
  BLOCK.lastIndex = 0;
  let m;
  while ((m = BLOCK.exec(text)) !== null) {
    starts.push({ at: m.index, id: m[2] });
  }
  const out = [];
  for (let i = 0; i < starts.length; i++) {
    if (!/A11yStrings$/.test(starts[i].id)) continue;
    const from = starts[i].at;
    const to = i + 1 < starts.length ? starts[i + 1].at : text.length;
    out.push([from, to]);
  }
  return out;
}

/* The English words in the parts that are spoken. */
function spokenWords(text) {
  const out = [];
  for (const [from, to] of spokenRegions(text)) {
    WORD.lastIndex = from;
    let m;
    while ((m = WORD.exec(text)) !== null) {
      if (m.index >= to) break;
      out.push({ index: m.index, value: m[1], raw: m[0] });
    }
  }
  return out;
}

/* The words that are worth giving a Chinese wording. */
function worthWording(value) {
  if (!/[A-Za-z]{3}/.test(value)) return false;
  if (CJK.test(value)) return false;
  /* A name of a part of the program. */
  if (/^[A-Za-z][A-Za-z0-9]*(\.[A-Za-z][A-Za-z0-9]*)+$/.test(value)) return false;
  /* A shape that holds no words of its own. */
  const rest = value.replace(/\{\{[^}]*\}\}/g, ' ').replace(/<[^>]*>/g, ' ').trim();
  if (!/[A-Za-z]{3}/.test(rest)) return false;
  return true;
}

/* ------------------------------------------------------------------ */
/*  Collect                                                            */
/* ------------------------------------------------------------------ */

if (has('collect')) {
  const unique = new Map();
  let total = 0;
  for (const f of fs.readdirSync(CW).filter((f) => f.endsWith('.html'))) {
    const text = fs.readFileSync(path.join(CW, f), 'utf8');
    for (const w of spokenWords(text)) {
      if (!worthWording(w.value)) continue;
      total++;
      if (!unique.has(w.value)) unique.set(w.value, []);
      unique.get(w.value).push(f);
    }
  }
  const list = [...unique].map(([source, files]) => ({ source, files }));
  fs.writeFileSync(OUT, JSON.stringify(list, null, 1));
  console.log(`${total} spoken words still English, ${list.length} different`);
  console.log(`written to ${OUT}`);
}

/* ------------------------------------------------------------------ */
/*  Translate                                                          */
/* ------------------------------------------------------------------ */

if (has('translate')) {
  let cache = {};
  if (fs.existsSync(CACHE)) cache = JSON.parse(fs.readFileSync(CACHE, 'utf8'));
  const list = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  const todo = list.map((x) => x.source).filter((s) => !cache[s]);
  console.log(`to translate ${todo.length}, already known ${list.length - todo.length}`);

  const queue = todo.slice();
  let done = 0;
  let failed = 0;

  const worker = async () => {
    while (queue.length) {
      const batch = queue.splice(0, BATCH);
      const payload = batch.map((s, i) => `${i}\t${s.replace(/\r?\n/g, ' ')}`).join('\n');
      let out = '';
      try {
        out = await chat(
          [
            {
              role: 'system',
              content:
                '你是物理课堂课件的中文译者。下面每一行是仿真课件里给屏幕阅读器播报的英文文本，' +
                '行首的数字是编号。请逐行翻译成简体中文。\n' +
                '规则：\n' +
                '1. 严格保留 {{placeholder}} 形式的占位符，一个都不能改、不能少、不能多；\n' +
                '2. 保留 HTML 标签（如 <strong>、<em>、<br>）原样；\n' +
                '3. 保留数字、单位、公式、上下标符号原样；\n' +
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
        if (!zh || !CJK.test(zh)) continue;
        const want = (src.match(/\{\{[^}]*\}\}/g) || []).sort().join('|');
        const have = (zh.match(/\{\{[^}]*\}\}/g) || []).sort().join('|');
        if (want !== have) {
          failed++;
          continue;
        }
        cache[src] = zh;
        done++;
      }
      failed += batch.length - got.size;
      if (done % 100 < BATCH) {
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

  let touched = 0;
  let words = 0;
  let kept = 0;

  const work = (file) => {
    const text = fs.readFileSync(file, 'utf8');
    const spoken = spokenWords(text);
    if (!spoken.length) return;
    /* The words are replaced from the back, so the places stay right. */
    const edits = [];
    for (const w of spoken) {
      const zh = cache[w.value];
      if (!zh) continue;
      edits.push({ start: w.index, end: w.index + w.raw.length, zh });
    }
    if (!edits.length) return;
    edits.sort((a, b) => b.start - a.start);
    let after = text;
    for (const e of edits) {
      const zh = e.zh.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      after = after.slice(0, e.start) + `{value:"${zh}"}` + after.slice(e.end);
      words++;
    }
    if (after === text) return;
    const sound = checkScripts(after);
    const was = checkScripts(text);
    if (!sound.ok && (was.ok || was.error !== sound.error)) {
      kept++;
      console.log(`kept ${path.basename(file)}: ${sound.error}`);
      return;
    }
    fs.writeFileSync(file, after, 'utf8');
    touched++;
  };

  for (const f of fs.readdirSync(CW).filter((f) => f.endsWith('.html'))) {
    work(path.join(CW, f));
    const lib = path.join(LIB, `lab-physics-${f}`);
    if (fs.existsSync(lib)) work(lib);
  }

  console.log(`\ntouched ${touched} files, ${words} words given a Chinese wording`);
  if (kept) console.log(`kept ${kept} files as they were`);
}
