#!/usr/bin/env node
/*
 * Give the last of the English a Chinese wording.
 *
 * The lesson is opened in a real browser and the words on the glass
 * are read.  The English among them is looked up in the file, so that
 * the Chinese can be put back in the same place.
 *
 *   --collect   read the lessons and list the English
 *   --translate ask for the Chinese wording and keep it
 *   --apply     put the Chinese back into the lessons
 *   --static    read the wording from the file itself, without a browser
 *
 * A lesson whose scripts no longer read well is left as it was.
 *
 *   node tools/lq-visible-fix.mjs --collect --conc 5
 *   node tools/lq-visible-fix.mjs --translate --conc 5
 *   node tools/lq-visible-fix.mjs --apply
 */
import fs from 'node:fs';
import path from 'node:path';
import { connect, sleep } from './cdpx.mjs';
import { chat } from './lq-relay.mjs';
import { checkScripts } from './lq-script-check.mjs';
import { allPlaces, reader, decode } from './lq-locate.mjs';
import { worthWording } from './lq-english-filter.mjs';
import { sourceOf } from './lq-sources.mjs';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const has = (name) => args.includes(`--${name}`);

const CDP = Number(arg('cdp', 9226));
const LQ = Number(arg('lq', 4180));
const WAIT = Number(arg('wait', 3800));
const CONC = Number(arg('conc', 4));
const MODEL = arg('model', 'gpt-5.6');
const IN = arg('in', 'work/lq-visible-left.json');
const CACHE = arg('cache', 'work/lq-visible-zh.json');
const MODEL_BATCH = 15;

/*
 * The wording is tidied before it is used: a name of a character is
 * left out, and the spacing that came from the page is made plain.
 */
const tidy = (zh) =>
  String(zh)
    .replace(/&nbsp;/gi, ' ')
    .replace(/PEP\s*ENGLISH/gi, '英语')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

const LIB = path.resolve('mirror/leqixiang/courseware');

const CJK = /[\u3000-\u303f\u3400-\u9fff\uff00-\uffef]/;

/*
 * A piece of text that a reader sees is English when it has letters
 * and no Chinese.  A line of numbers and signs is not English.
 */
const isEnglish = (s) => {
  if (!s || CJK.test(s)) return false;
  const letters = (s.match(/[A-Za-z]/g) || []).length;
  if (letters < 3) return false;
  const core = s.replace(/\s+/g, '');
  return letters / Math.max(1, core.length) > 0.5;
};

const READ_TEXT = `(() => {
  const out = [];
  const walk = (doc) => {
    if (!doc || !doc.body) return;
    const seen = new Set();
    const nodes = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
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

/* ------------------------------------------------------------------ */
/*  Reading without a browser                                          */
/* ------------------------------------------------------------------ */

/*
 * The wording of a lesson as it is written in the file: the words
 * between the tags, without the programs and the styles.
 */
function staticText(html) {
  const out = [];
  const lower = html.toLowerCase();
  let i = 0;
  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt < 0) {
      out.push(html.slice(i));
      break;
    }
    if (lt > i) out.push(html.slice(i, lt));
    /* A comment, a program or a style holds no wording. */
    if (html.startsWith('<!--', lt)) {
      const end = html.indexOf('-->', lt);
      i = end < 0 ? html.length : end + 3;
      continue;
    }
    const tag = /^<\s*(\w+)/.exec(html.slice(lt, lt + 20));
    const name = tag ? tag[1].toLowerCase() : '';
    const close = html.indexOf('>', lt);
    if (close < 0) break;
    if (name === 'script' || name === 'style') {
      const end = lower.indexOf(`</${name}`, close);
      i = end < 0 ? html.length : end;
      continue;
    }
    i = close + 1;
  }
  return out
    .map((t) => decode(t).replace(/\s+/g, ' ').trim())
    .filter((t) => t.length > 0);
}

/* ------------------------------------------------------------------ */
/*  Collect                                                            */
/* ------------------------------------------------------------------ */

if (has('collect')) {
  const catalog = JSON.parse(fs.readFileSync('catalog/catalog.json', 'utf8'));
  let ids = catalog.products.filter((p) => p.localInstalled).map((p) => p.id);
  const only = arg('ids', '');
  if (only) {
    const set = new Set(only.split(',').map((s) => s.trim()).filter(Boolean));
    ids = ids.filter((id) => set.has(id));
  }
  const skip = arg('skip', '');
  if (skip) {
    const set = new Set(skip.split(',').map((s) => s.trim()).filter(Boolean));
    ids = ids.filter((id) => !set.has(id));
  }

  const found = [];
  const missing = [];
  const errors = [];
  let done = 0;
  const queue = ids.slice();
  const log = (line) => {
    console.log(line);
    try {
      fs.appendFileSync('work/visible-fix-progress.log', line + '\n');
    } catch {}
  };

  const worker = async () => {
    const static_ = has('static');
    const page = static_ ? null : await connect(CDP);
    while (queue.length) {
      const id = queue.shift();
      const file = path.join(LIB, `${id}.html`);
      if (!fs.existsSync(file)) continue;
      const text = fs.readFileSync(file, 'utf8');
      try {
        let pieces;
        if (static_) {
          pieces = staticText(text);
        } else {
          await page.goto(`http://127.0.0.1:${LQ}/courseware/${id}/index.html`);
          await sleep(WAIT);
          /* A lesson that will not answer is left for another time. */
          const raw = await Promise.race([
            page.evaluate(READ_TEXT),
            new Promise((_, no) => setTimeout(() => no(new Error('slow')), 25000))
          ]);
          pieces = JSON.parse(raw);
        }
        const seen = new Set();
        const find = reader(text);
        for (const piece of pieces) {
          if (!isEnglish(piece)) continue;
          if (!worthWording(piece)) continue;
          if (seen.has(piece)) continue;
          seen.add(piece);
          const hit = find(piece);
          if (!hit) {
            missing.push({ id, source: piece });
            continue;
          }
          found.push({ id, source: hit.exact, asked: piece });
        }
      } catch (e) {
        errors.push({ id, error: e.message });
      }
      /* The record of one lesson is of no use to the next one. */
      if (page) { try { page.events.length = 0; } catch {} }
      done++;
      if (done % 50 === 0) log(`  ${done} lessons read, ${queue.length} to go`);
    }
    if (page) await page.close();
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
    /* Wording read from the file itself is body wording: it is never
       written back into a program. */
    bodyOnly: has('static'),
    words: [...words].map(([source, ids]) => ({ source, ids }))
  };
  fs.writeFileSync(IN, JSON.stringify(out, null, 1));
  fs.writeFileSync(
    IN.replace(/\.json$/, '-missing.json'),
    JSON.stringify(missing, null, 1)
  );
  fs.writeFileSync(
    IN.replace(/\.json$/, '-errors.json'),
    JSON.stringify(errors, null, 1)
  );
  console.log(`\n${done} lessons read, ${found.length} pieces of English, ${words.size} distinct`);
  console.log(`${missing.length} pieces could not be found in the file`);
  if (errors.length) console.log(`${errors.length} lessons did not answer`);
  log(`done: ${done} lessons, ${words.size} distinct`);
  console.log(`written to ${IN}`);
}

/* ------------------------------------------------------------------ */
/*  Translate                                                          */
/* ------------------------------------------------------------------ */

if (has('translate')) {
  let cache = {};
  if (fs.existsSync(CACHE)) cache = JSON.parse(fs.readFileSync(CACHE, 'utf8'));
  /* A few words are given their Chinese by hand, because they are a
     name, a unit or a label that only one lesson uses. */
  const OVERRIDES = 'tools/lq-visible-overrides.json';
  if (fs.existsSync(OVERRIDES)) {
    const hand = JSON.parse(fs.readFileSync(OVERRIDES, 'utf8'));
    for (const [k, v] of Object.entries(hand)) {
      if (cache[k] !== v) cache[k] = v;
    }
  }
  const input = JSON.parse(fs.readFileSync(IN, 'utf8'));
  const bodyOnly = input.bodyOnly === true;
  const todo = input.words
    .map((w) => w.source)
    .filter((s) => !cache[s])
    .filter((s) => worthWording(s));
  console.log(`to translate ${todo.length}, already known ${input.words.length - todo.length}`);

  const queue = todo.slice();
  let done = 0;
  let failed = 0;

  const worker = async () => {
    while (queue.length) {
      const batch = queue.splice(0, MODEL_BATCH);
      const payload = batch.map((s, i) => `${i}\t${s.replace(/\r?\n/g, ' ')}`).join('\n');
      let out = '';
      try {
        out = await chat(
          [
            {
              role: 'system',
              content:
                '你是物理课堂课件的中文译者。下面每一行是课件里读者会看到的英文文本，' +
                '行首的数字是编号。请逐行翻译成简体中文，术语准确、简洁自然，' +
                '保留数字、单位、公式、上下标符号和专有名词，不要添加解释，' +
                '不要合并或拆分行。严格按 "<编号>\\t<译文>" 的格式输出，' +
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
        cache[batch[i]] = zh;
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
  const input = JSON.parse(fs.readFileSync(IN, 'utf8'));
  const bodyOnly = input.bodyOnly === true;

  const byId = new Map();
  for (const w of input.words) {
    for (const id of w.ids) {
      if (!byId.has(id)) byId.set(id, []);
      byId.get(id).push(w.source);
    }
  }

  let files = 0;
  let words = 0;
  let left = 0;
  let kept = 0;

  const work = (file, id) => {
    if (!fs.existsSync(file)) return;
    let text = fs.readFileSync(file, 'utf8');
    const before = text;
    for (const s of byId.get(id) || []) {
      const zh = cache[s];
      if (!zh) {
        left++;
        continue;
      }
      /* A formula and a name are left exactly as they are. */
      if (!worthWording(s)) continue;
      /* Every place the wording stands is given the Chinese.  The places
         are given from the last to the first, so that writing one of
         them does not move the others. */
      for (const hit of allPlaces(text, s)) {
        /* Wording that was read from the page is never written into a
           program: a name in a program is not wording. */
        if (bodyOnly && hit.code) continue;
        /* Only wording that stands on its own is written into.  A word
           in the middle of a longer sentence belongs to that sentence. */
        if (!hit.whole) continue;
        text = text.slice(0, hit.start) + zh + text.slice(hit.end);
        words++;
      }
    }
    if (text === before) return;
    /* A name of the page that now says the same thing twice is shortened. */
    text = text.replace(/<title>([^<]*)<\/title>/gi, (whole, name) => {
      const m = /^(.*?)\s*·\s*(.*)$/.exec(name);
      if (!m) return whole;
      if (m[1].trim() === m[2].trim()) return `<title>${m[1].trim()}</title>`;
      return whole;
    });
    const sound = checkScripts(text);
    /* A file that was sound before and is not sound now is left alone. */
    const was = checkScripts(before);
    if (!sound.ok && (was.ok || was.error !== sound.error)) {
      kept++;
      console.log(`kept ${path.basename(file)}: ${sound.error}`);
      return;
    }
    write(file, text);
    files++;
  };

  for (const [id] of byId) {
    work(path.join(LIB, `${id}.html`), id);
    const src = sourceOf(id);
    if (src) work(src, id);
  }

  console.log(`\n${words} wordings put into ${files} lessons`);
  if (left) console.log(`${left} wordings still without Chinese`);
  if (kept) console.log(`${kept} lessons kept as they were`);
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
