#!/usr/bin/env node
/*
 * Give the English a reader still sees a Chinese wording.
 *
 *   --translate  ask for the Chinese wording and keep it in a cache
 *   --apply      put the Chinese back into the lessons
 *
 * The wording is found where it is written, in the lesson in the
 * library and in the lesson it was made from, so the two stay the
 * same.  A lesson whose scripts no longer read well is left as it
 * was.
 *
 *   node tools/lq-translate-visible.mjs --translate
 *   node tools/lq-translate-visible.mjs --apply
 */
import fs from 'node:fs';
import path from 'node:path';
import { chat } from './lq-relay.mjs';
import { checkScripts } from './lq-script-check.mjs';
import { sourceOf } from './lq-visible-english.mjs';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const has = (name) => args.includes(`--${name}`);

const IN = arg('in', 'work/lq-visible-english.json');
const CACHE = arg('cache', 'work/lq-visible-zh.json');
const MODEL = arg('model', 'gpt-5.6');
const CONC = Number(arg('conc', 3));

const input = JSON.parse(fs.readFileSync(IN, 'utf8'));
let cache = {};
if (fs.existsSync(CACHE)) cache = JSON.parse(fs.readFileSync(CACHE, 'utf8'));

if (has('translate')) {
  const todo = input.words.map((w) => w.source).filter((s) => !cache[s]);
  console.log(`to translate ${todo.length}, already known ${input.words.length - todo.length}`);

  const queue = todo.slice();
  let done = 0;
  let failed = 0;

  const worker = async () => {
    while (queue.length) {
      const batch = queue.splice(0, 20);
      const payload = batch.map((s, i) => `${i}\t${s.replace(/\n/g, ' ')}`).join('\n');
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
        console.error(`  a batch failed: ${e.message}`);
        failed += batch.length;
        continue;
      }
      for (const line of String(out).split('\n')) {
        const m = /^\s*(\d+)\s*[\t:]\s*(.*)$/.exec(line);
        if (!m) continue;
        const i = Number(m[1]);
        const zh = m[2].trim();
        if (!zh || !batch[i]) continue;
        if (!/[\u3400-\u9fff]/.test(zh)) continue;
        cache[batch[i]] = zh;
        done++;
      }
      if (done % 100 < 20) console.log(`  ${done} done, ${queue.length} waiting`);
    }
  };

  await Promise.all(Array.from({ length: CONC }, worker));
  fs.writeFileSync(CACHE, JSON.stringify(cache, null, 1));
  console.log(`\ntranslated ${done}, failed ${failed}, cache now ${Object.keys(cache).length}`);
  if (failed) process.exit(1);
}

if (has('apply')) {
  const BUILD = path.resolve('mirror/leqixiang/courseware');
  const byId = new Map();
  for (const w of input.words) {
    for (const id of w.ids) {
      if (!byId.has(id)) byId.set(id, []);
      byId.get(id).push(w.source);
    }
  }

  let files = 0;
  let words = 0;
  const left = [];

  for (const [id, sources] of byId) {
    const targets = [path.join(BUILD, `${id}.html`)];
    const from = sourceOf(id);
    if (from && !targets.includes(from)) targets.push(from);

    for (const file of targets) {
      if (!fs.existsSync(file)) continue;
      let text = fs.readFileSync(file, 'utf8');
      const before = text;
      for (const s of sources) {
        const zh = cache[s];
        if (!zh) {
          left.push(`${id}: ${s.slice(0, 60)}`);
          continue;
        }
        if (!text.includes(s)) continue;
        text = text.split(s).join(zh);
        words++;
      }
      if (text === before) continue;
      const sound = checkScripts(text);
      if (!sound.ok) {
        console.error(`left as it was  ${file}  (${sound.error})`);
        continue;
      }
      fs.writeFileSync(file, text, 'utf8');
      files++;
    }
  }

  console.log(`\n${words} wordings put into ${files} lessons`);
  if (left.length) {
    console.log(`still without Chinese: ${left.length}`);
    for (const l of left.slice(0, 20)) console.log('  ' + l);
  }
}
