#!/usr/bin/env node
/*
 * Does a page that was left open keep up with the library?
 *
 * The trouble this guards against: a page is opened while the library holds
 * one set of lessons, the library is then rebuilt with another set, and the
 * page goes on showing the first set.  A card for a lesson that has since
 * been taken off the disk leads to an empty frame.
 *
 * So this opens a page, notes what it asked for, changes the library while
 * the page is still open, and then moves the page on and off a lesson to
 * see whether it notices.
 *
 *   node tools/check-lq-catalogue-sync.mjs --cdp 9226
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, sleep } from './cdpx.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 && args[at + 1] ? args[at + 1] : fallback;
};
const CDP = Number(arg('cdp', 9226));
const PORT = Number(arg('lq', 4173));
const BASE = `http://127.0.0.1:${PORT}`;
const CATALOG = path.join(ROOT, 'mirror', 'leqixiang', 'catalog.json');

const page = await connect(CDP);
await page.send('Network.enable');

const catalogCalls = [];
page.on((m) => {
  if (m.method !== 'Network.responseReceived') return;
  const url = m.params.response.url || '';
  if (url.includes('/api/catalog')) {
    catalogCalls.push({
      status: m.params.response.status,
      url,
      at: Date.now(),
    });
  }
});

const evalJs = async (expression) => {
  return page.evaluate(expression);
};

/* The number of lessons the page says the library holds. */
const libraryCount = () =>
  evalJs(
    "(()=>{const el=document.querySelector('.download-gallery-heading span');" +
      "const n=el?el.textContent.match(/\\d+/):null;return n?Number(n[0]):-1;})()"
  );

console.log('opening the library …');
await page.send('Page.navigate', { url: `${BASE}/#catalog` });
await sleep(5000);

const before = await libraryCount();
console.log('lessons the page says the library holds:', before);
console.log('catalogue asked for:', catalogCalls.map((c) => c.status).join(', '));

/* The library is changed while the page is open. */
const original = fs.readFileSync(CATALOG, 'utf8');
let changed = false;
try {
  const catalog = JSON.parse(original);
  catalog.products = catalog.products.slice(0, -1);
  fs.writeFileSync(CATALOG, JSON.stringify(catalog));
  changed = true;
  console.log('one lesson was taken off the library while the page stayed open');
} catch (error) {
  console.log('could not change the library:', String(error.message || error));
}
await sleep(600);

/* Move the page off a lesson and back, and watch what it asks for. */
const marked = catalogCalls.length;
await evalJs("location.hash='#course/afe-180'");
await sleep(2500);
await evalJs("location.hash='#catalog'");
await sleep(3000);

const after = await libraryCount();
const fresh = catalogCalls.slice(marked);
console.log('lessons the page says the library holds now:', after);
console.log('catalogue asked for since the change:', fresh.map((c) => c.status).join(', '));

/* Put the library back the way it was. */
if (changed) {
  fs.writeFileSync(CATALOG, original);
  console.log('the library was put back');
}
await sleep(600);

const ok = after === before - 1 && fresh.some((c) => c.status === 200);
console.log(
  ok
    ? '绿灯：the open page noticed the change and drew the library as it is.'
    : `红灯：the open page still draws ${after} cards (was ${before}); the answers since the change were ${fresh.map((c) => c.status).join(', ')}.`
);

process.exit(ok ? 0 : 1);
