#!/usr/bin/env node
/*
 * The gate that keeps the shell honest.
 *
 * The catalogue is written by a build script that removes whole
 * functions from the published shell.  A removal that leaves a call
 * behind is invisible until a page is opened in a browser: the script
 * dies on an undefined name and the page answers with an empty
 * message.  This walks the library the way a reader does and fails on
 * any uncaught error the shell itself raises.
 */
import { connect, sleep } from './cdp2.mjs';

const PORT = Number(process.env.LQ_PORT || 4173);
const CDP = Number(process.env.CDP_PORT || 9226);
const BASE = 'http://127.0.0.1:' + PORT + '/';

const browser = await connect(CDP);
await browser.raw('Runtime.enable', {}, browser.pageSession);
await browser.raw('Log.enable', {}, browser.pageSession);
await browser.raw('Page.enable', {}, browser.pageSession);

/* Only the shell of this library is judged here. The courseware that
   runs inside the frame is somebody else's code and may shout about
   its own business. */
const isShell = (url) => typeof url === 'string' && url.startsWith(BASE) && !url.includes('/courseware/');

const collected = [];
const note = (kind, text, url) => {
  if (!isShell(url)) return;
  collected.push({ kind, text: String(text).slice(0, 400), url });
};

browser.events.length = 0;
const watch = setInterval(() => {
  while (browser.events.length) {
    const event = browser.events.shift();
    if (event.method === 'Runtime.exceptionThrown') {
      const d = event.params.exceptionDetails;
      const url = d.url || (d.stackTrace?.callFrames?.[0]?.url ?? '');
      note('exception', d.exception?.description || d.text, url);
    }
    if (event.method === 'Log.entryAdded') {
      const entry = event.params.entry;
      if (entry.level !== 'error') continue;
      note('console', entry.text + ' ' + (entry.url || ''), entry.url);
    }
  }
}, 120);

/* A handful of pages from every family the library holds, so the walk
   covers the shell's own branches and not one lucky course. */
const catalog = await (await fetch(BASE + 'api/catalog')).json();
const products = catalog.products || [];
const pick = (predicate) => products.find(predicate);
const samples = [
  ['catalog', '#catalog'],
  ['works', '#works'],
  ['teachers', '#teachers'],
];

/* One course from every family the library holds, so the walk covers
   the shell's own branches and not one lucky course. */
const sources = [...new Set(products.map((p) => p.source).filter(Boolean))];
for (const source of sources) {
  const p = pick((one) => one.source === source);
  if (p) samples.push([source + ' · ' + p.id, '#course/' + p.id]);
}
const first = products[0];
if (first) samples.push(['first course ' + first.id, '#course/' + first.id]);

for (const [label, hash] of samples) {
  const before = collected.length;
  await browser.goto(BASE + hash);
  await sleep(2200);
  /* Open the sheet the reader opens first, so the dialog code runs. */
  await browser
    .evaluate(`(() => {
      const b = [...document.querySelectorAll('button,a')]
        .find((e) => /关于|说明|许可/.test(e.textContent || ''));
      if (b) b.click();
      return true;
    })()`)
    .catch(() => {});
  await sleep(700);
  const fresh = collected.slice(before);
  console.log(
    (fresh.length ? 'FAIL ' : ' ok  ') + label + '  (' + hash + ')' +
      (fresh.length ? '  ' + fresh.length + ' error(s)' : '')
  );
  for (const f of fresh) console.log('      [' + f.kind + '] ' + f.text);
}

/* The cards on the catalogue page are the thing the page is for. */
await browser.goto(BASE + '#catalog');
await sleep(2500);
const cards = await browser.evaluate(
  "document.querySelectorAll('#grid .product-card, #grid [data-action=\"detail\"]').length"
);
console.log('--- cards on the catalogue page:', cards);

clearInterval(watch);
await browser.close();

if (collected.length) {
  console.log('\n未捕获错误 ' + collected.length + ' 处，构建没有通过。');
  process.exit(1);
}
if (!cards) {
  console.log('\n目录页一张卡片也没有，渲染没有成功。');
  process.exit(1);
}
console.log('\n站点壳在浏览器里没有报错。');
