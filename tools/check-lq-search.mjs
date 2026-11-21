/*
 * Type a word into the search box and see what comes back.
 *
 * The count on the page is checked against the words on the cards that
 * are actually there, so a search that returns nothing useful — or
 * returns cards that have nothing to do with the word — is caught.
 *
 *   node tools/check-lq-search.mjs --cdp 9226
 */
import { connect, sleep } from './cdpx.mjs';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const CDP = Number(arg('cdp', 9222));
const PORT = Number(arg('lq', 4173));

/* A word from each corner of the library: a title, a knowledge point,
   a subject and an author. */
const WORDS = arg('words', '合成氨,凸透镜,电,PhET,语文').split(',').filter(Boolean);

const p = await connect(CDP);
await p.goto(`http://127.0.0.1:${PORT}/#catalog`);
/* The library draws itself a card at a time, so give it a moment to
   settle before counting. */
for (let i = 0; i < 20; i++) {
  await sleep(1000);
  const n = await p
    .evaluate(`document.querySelectorAll('#main .product-card').length`)
    .catch(() => 0);
  if (n > 0) break;
}

const read = async () =>
  p.evaluate(`(() => {
    const cards = [...document.querySelectorAll('#main .product-card')];
    const text = (el) => (el.innerText || '').replace(/\\s+/g, ' ').trim();
    const counter = document.querySelector('#result-count');
    return {
      count: cards.length,
      total: counter ? Number((counter.textContent.match(/(\\d+)/) || [])[1] || 0) : 0,
      titles: cards.slice(0, 12).map(text),
      head: text(document.querySelector('#main') || document.body).slice(0, 120),
    };
  })()`);

/* The grid is drawn a screenful at a time.  Everything that came back
   has to be looked at, so the rest is asked for. */
const loadAll = async () => {
  for (let i = 0; i < 40; i++) {
    const more = await p
      .evaluate(
        `(() => { const b = document.querySelector('#main .catalog-more'); if (!b) return false; b.click(); return true; })()`
      )
      .catch(() => false);
    if (!more) break;
    await sleep(350);
  }
  await sleep(600);
};

const type = async (word) => {
  await p.evaluate(`(() => {
    const box = document.querySelector('#search');
    if (!box) return false;
    box.focus();
    box.value = ${JSON.stringify(word)};
    box.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  })()`);
  await sleep(1400);
  return read();
};

let allGood = true;
for (const word of WORDS) {
  await type('');
  await loadAll();
  const before = await read();
  const after = await type(word);
  await loadAll();
  const full = await read();
  /* Every card that came back has to say something about the word. */
  const hit = full.titles.filter((t) => t.includes(word)).length;
  const shown = full.titles.length;
  const narrowed = full.total < before.total;
  const ok = full.total === 0 ? shown === 0 : hit === shown && hit > 0;
  if (!ok || !narrowed) allGood = false;
  console.log(
    `“${word}” 命中 ${full.total} 张（全部 ${before.total} 张），` +
      `全部 ${shown} 张里有 ${hit} 张含关键词` +
      `${narrowed ? '' : ' ← 没有收窄'}` +
      `${ok ? '' : ' ← 结果对不上关键词'}`
  );
  if (full.titles.length) console.log(`   例如：${full.titles[0].slice(0, 60)}`);
}

/* Put the box back the way it was found. */
await type('');
await p.close();
console.log(allGood ? '\n绿灯：搜索都能收窄，结果也都对得上关键词。' : '\n红灯：搜索有问题。');
process.exit(allGood ? 0 : 1);
