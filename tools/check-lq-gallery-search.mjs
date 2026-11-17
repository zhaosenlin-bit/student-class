#!/usr/bin/env node
/*
 * Searches the gallery for a course and reports the card that comes back,
 * so a new source can be seen where a teacher would actually find it.
 *
 *   node tools/check-lq-gallery-search.mjs --term 合成氨
 */
import { connect, sleep } from './cdpx.mjs';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const CDP = Number(arg('cdp', 9222));
const PORT = Number(arg('lq', 4173));
const TERM = arg('term', '合成氨');

const p = await connect(CDP);
await p.goto(`http://localhost:${PORT}/#catalog`);
await p.send('Page.reload', { ignoreCache: true });
await sleep(5000);

const SEARCH = `(() => {
  const s = document.querySelector('#search');
  if (!s) return { error: 'no search box' };
  s.value = ${JSON.stringify(TERM)};
  s.dispatchEvent(new Event('input', { bubbles: true }));
  return { typed: s.value };
})()`;
console.log('search:', JSON.stringify(await p.evaluate(SEARCH)));
await sleep(1500);

const FIND = `(() => {
  const all = [...document.querySelectorAll('*')];
  const hits = all.filter((e) => (e.innerText || '').includes(${JSON.stringify(TERM)}) && e.children.length < 6);
  const card = hits[hits.length - 1];
  const img = card ? card.querySelector('img') : null;
  return {
    bodyHas: document.body.innerText.includes(${JSON.stringify(TERM)}),
    buttons: card ? [...card.querySelectorAll('button,a')].map((b) => b.innerText.trim()).filter(Boolean) : [],
    cover: img ? img.getAttribute('src') : null,
    coverLoaded: img ? img.naturalWidth > 0 : false,
    text: card ? (card.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 200) : null,
  };
})()`;
console.log('card:', JSON.stringify(await p.evaluate(FIND), null, 1));
await p.shot('recon/scratch/site-search-tongjiang.png');
await p.close();
