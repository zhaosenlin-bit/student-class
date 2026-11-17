#!/usr/bin/env node
/*
 * Looks at the library the way a teacher does and reports what the new
 * 铜匠实验室 lessons look like there: the card in the gallery, the detail
 * page, and the buttons that are actually offered.
 *
 *   node tools/check-lq-tongjiang-ui.mjs [--cdp 9222]
 *   node tools/check-lq-tongjiang-ui.mjs --term 心脏 --id labsims-human_anatomy-heart-heart
 */
import { connect, sleep } from './cdpx.mjs';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const CDP = Number(arg('cdp', 9222));
const PORT = Number(arg('lq', 4173));
const TERM = arg('term', '合成氨工业');
const ID = arg('id', 'tongjiang-haber-step');

const p = await connect(CDP);

const CARD = `(() => {
  const all = [...document.querySelectorAll('*')];
  const hit = all.find((e) => e.children.length === 0 && (e.textContent || '').includes(${JSON.stringify(TERM)}));
  if (!hit) return { found: false, body: document.body.innerText.slice(0, 300) };
  let card = hit;
  for (let i = 0; i < 6 && card.parentElement; i++) {
    if ((card.innerText || '').includes('在线预览')) break;
    card = card.parentElement;
  }
  const buttons = [...card.querySelectorAll('button,a')].map((b) => b.innerText.trim()).filter(Boolean);
  const img = card.querySelector('img');
  return {
    found: true,
    text: (card.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 220),
    buttons,
    cover: img ? img.getAttribute('src') : null,
    coverLoaded: img ? img.naturalWidth > 0 : false,
  };
})()`;

await p.goto(`http://localhost:${PORT}/`);
await sleep(4000);
console.log('gallery:', JSON.stringify(await p.evaluate(CARD), null, 1));
await p.shot('recon/scratch/site-gallery-tongjiang.png');

/* A hash-only change does not always fire the route on a document that is
   already open, so the detail page is opened as a fresh document. */
await p.goto(`http://localhost:${PORT}/#course/${ID}`);
await p.send('Page.reload', { ignoreCache: true });
await sleep(5000);
const DETAIL = `(() => {
  const text = document.body.innerText.replace(/\\s+/g, ' ').trim();
  const buttons = [...document.querySelectorAll('button,a')]
    .map((b) => b.innerText.trim())
    .filter((t) => t && t.length < 20);
  return {
    text: text.slice(0, 400),
    buttons: [...new Set(buttons)],
    mentionsLogin: /登录|注册|扫码/.test(text),
    mentionsBuy: /购买|付费|开通会员|优惠/.test(text),
    mentionsFeedback: /反馈|意见|客服/.test(text),
  };
})()`;
console.log('detail:', JSON.stringify(await p.evaluate(DETAIL), null, 1));
await p.shot('recon/scratch/site-detail-tongjiang.png');

await p.close();
