/*
 * The catalogue describes every lesson.  Where the name or the
 * description was still English, it is written in Chinese here, so that
 * the page a reader sees speaks one language.
 *
 * The English name is kept in the catalogue as it was, because it says
 * which lesson this is and where it came from.
 *
 *   node tools/lq-translate-catalog.mjs --translate --conc 6
 *   node tools/lq-translate-catalog.mjs --apply
 */
import fs from 'node:fs';
import { chat } from './lq-relay.mjs';

const args = process.argv.slice(2);
const has = (n) => args.includes(n);
const arg = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};

const TRANSLATE = has('--translate');
const APPLY = has('--apply');
const TIDY = has('--tidy');
const NOTE = has('--note');
const CONC = Number(arg('conc', 6));
const BATCH = Number(arg('batch', 8));
const MODEL = arg('model', 'gpt-5.4-mini');
const CACHE = arg('cache', 'work/lq-catalog-translations.json');

/* Every catalogue that holds a lesson of ours. */
const SOURCES = [
  'mirror/lab-course/catalog.json',
  'mirror/lab-virtual/catalog.json',
  'mirror/lab-reaction/catalog.json',
  'mirror/lab-explore/catalog.json',
  'mirror/lab-physics/catalog.json',
  'mirror/lab-process/catalog.json',
  'mirror/game-block/catalog.json',
];

/* The words a reader sees. */
const FIELDS = ['title', 'description', 'tagline'];

const englishish = (s) => {
  if (!s) return false;
  if (/[\u3400-\u9fff]/.test(s)) return false;
  const letters = (s.match(/[A-Za-z]/g) || []).length;
  const core = s.replace(/\s+/g, '');
  if (!core.length) return false;
  return letters / core.length > 0.55 && letters > 3;
};

/* The same wording is written down the same way everywhere. */
const key = (s) => String(s || '').replace(/\s+/g, ' ').trim();

/*
 * Some descriptions carry the English wording and the Chinese wording
 * one after the other.  A reader is served one language, so the English
 * part in front is taken away and the Chinese is kept.
 */
function keepChinese(value) {
  if (!value) return value;
  const at = value.search(/[\u3400-\u9fff]/);
  if (at < 0) return value;
  const front = value.slice(0, at);
  const letters = (front.match(/[A-Za-z]/g) || []).length;
  if (letters < 4) return value;
  return value.slice(at).replace(/^[\s,.:;、，。；：]+/, '');
}

const cache = fs.existsSync(CACHE)
  ? JSON.parse(fs.readFileSync(CACHE, 'utf8'))
  : {};

const jobs = [];
for (const file of SOURCES) {
  if (!fs.existsSync(file)) continue;
  const list = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(list)) continue;
  for (const item of list) {
    for (const field of FIELDS) {
      if (!englishish(item[field])) continue;
      jobs.push({ file, field, text: key(item[field]) });
    }
  }
}

console.log(`wording to translate ${jobs.length}`);

if (TRANSLATE) {
  const queue = [...new Set(jobs.map((j) => j.text))].filter((s) => !cache[s]);
  console.log(`new wording ${queue.length}, already known ${jobs.length - queue.length}`);
  let done = 0;
  let failed = 0;

  const worker = async () => {
    while (queue.length) {
      const batch = queue.splice(0, BATCH);
      const payload = batch
        .map((s, i) => `${i}\t${s.replace(/\s+/g, ' ').slice(0, 1800)}`)
        .join('\n');
      let out = '';
      try {
        out = await chat(
          [
            {
              role: 'system',
              content:
                '你是物理课堂课件的中文译者。下面每行是课件的标题或简介，行首数字是编号。' +
                '请逐行译成简体中文，术语准确、简洁自然，不要添加解释，' +
                '保留数字、单位、公式和专有名词，严格按 "<编号>\\t<译文>" 输出，条数与输入一致。'
            },
            { role: 'user', content: payload }
          ],
          MODEL,
          0.1
        );
      } catch (e) {
        failed += batch.length;
        console.log('  batch failed: ' + e.message.slice(0, 80));
        /* The wording is put back at the front and tried once more. */
        queue.unshift(...batch);
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }
      const got = new Map();
      for (const line of out.split(/\r?\n/)) {
        const m = /^\s*(\d+)\s*[:.)]?\s*(.+)$/.exec(line);
        if (!m) continue;
        const i = Number(m[1]);
        if (!(i >= 0 && i < batch.length)) continue;
        got.set(i, m[2].trim());
      }
      for (const [i, zh] of got) cache[batch[i]] = zh;
      done += got.size;
      if (batch.length - got.size > 0) {
        /* The lines that came back empty are asked for once more. */
        queue.unshift(...batch.filter((_, i) => !got.has(i)));
        failed += batch.length - got.size;
      }
      if (done % 100 < 20) {
        fs.writeFileSync(CACHE, JSON.stringify(cache, null, 1));
        console.log(`  ${done} done, ${queue.length} left`);
      }
    }
  };

  await Promise.all(
    Array.from({ length: CONC }, async () => {
      await worker();
    })
  );
  fs.writeFileSync(CACHE, JSON.stringify(cache, null, 1));
  console.log(`translated ${done}, failed ${failed}, cache ${Object.keys(cache).length}`);
}

if (APPLY) {
  let changed = 0;
  let words = 0;
  for (const file of SOURCES) {
    if (!fs.existsSync(file)) continue;
    const list = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      for (const field of FIELDS) {
        const zh = cache[key(item[field])];
        if (!zh) continue;
        item[field] = zh;
        words++;
      }
    }
    fs.writeFileSync(file, JSON.stringify(list, null, 2) + '\n');
    changed++;
  }
  console.log(`rewrote ${changed} files, ${words} pieces of wording`);
}

if (TIDY) {
  let changed = 0;
  let words = 0;
  for (const file of SOURCES) {
    if (!fs.existsSync(file)) continue;
    const list = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      for (const field of FIELDS) {
        const before = item[field];
        if (typeof before !== 'string') continue;
        const after = keepChinese(before);
        if (after === before) continue;
        item[field] = after;
        words++;
      }
    }
    fs.writeFileSync(file, JSON.stringify(list, null, 2) + '\n');
    changed++;
  }
  console.log(`tidied ${changed} files, ${words} descriptions`);
}

/*
 * The note that says the body of a lesson is still English is no longer
 * true once the body has been put into Chinese, so the note is written
 * again to say what the reader will find.
 */
if (NOTE) {
  let changed = 0;
  let words = 0;
  for (const file of SOURCES) {
    if (!fs.existsSync(file)) continue;
    const list = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      for (const field of FIELDS) {
        const before = item[field];
        if (typeof before !== 'string') continue;
        const after = before
          .replace(/课件正文为英文原版/g, '课件正文为中文')
          .replace(/英文原版/g, '中文课件');
        if (after === before) continue;
        item[field] = after;
        words++;
      }
    }
    fs.writeFileSync(file, JSON.stringify(list, null, 2) + '\n');
    changed++;
  }
  console.log(`rewrote the note in ${changed} files, ${words} pieces of wording`);
}
