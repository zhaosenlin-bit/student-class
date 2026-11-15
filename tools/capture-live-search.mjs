#!/usr/bin/env node
/*
 * Open a work on the live catalogue by its title and record every address
 * the page asks for.
 *
 * The catalogue is a single page with a search box. Typing the title of a
 * work leaves one card, clicking it opens the preview, and the preview
 * tells us where its files really live.
 *
 *   node tools/capture-live-search.mjs "宠物成长" "毛公鼎" "分数与除法"
 */
import fs from 'node:fs';
import path from 'node:path';
import { connect } from './cdp.mjs';

const ROOT = process.cwd();
const ORIGIN = 'https://aifunengjiaoyu.com';
const keys = process.argv.slice(2).filter(Boolean);

const page = await connect(9222);
await page.send('Page.enable');
await page.send('Network.enable');

for (const key of keys) {
  await page.send('Page.navigate', { url: `${ORIGIN}/#browse` });
  await new Promise((r) => setTimeout(r, 5000));
  const typed = await page.evaluate(`(() => {
    const input = document.querySelector('#program-search-input');
    if (!input) return 'no search box';
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, ${JSON.stringify(key)});
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return 'ok';
  })()`);
  await new Promise((r) => setTimeout(r, 2500));
  page.events.length = 0;
  const clicked = await page.evaluate(`(() => {
    const cards = [...document.querySelectorAll('.program-card')]
      .filter((el) => el.innerText && el.innerText.includes(${JSON.stringify(key)}));
    if (!cards.length) return 'no card';
    cards[0].click();
    return cards[0].innerText.slice(0, 40).replace(/\\s+/g, ' ');
  })()`);
  await new Promise((r) => setTimeout(r, 12000));
  const seen = new Map();
  for (const ev of page.events) {
    if (ev.method === 'Network.requestWillBeSent') seen.set(ev.params.request.url, 0);
    else if (ev.method === 'Network.responseReceived') seen.set(ev.params.response.url, ev.params.response.status);
  }
  const rows = [...seen.entries()].map(([url, status]) => ({ url, status }));
  const interesting = rows.filter(
    (r) => r.status >= 400 || /program-assets|pet-assets|\.glb|\.wasm/.test(r.url)
  );
  console.log(`\n=== "${key}"  typed=${typed} clicked=${clicked}`);
  console.log(`    ${rows.length} 个请求`);
  for (const r of interesting) console.log(`  ${r.status} ${r.url}`);
  fs.writeFileSync(
    path.join(ROOT, 'recon', 'scratch', `live-search-${key.slice(0, 8)}.json`),
    JSON.stringify(rows, null, 1)
  );
}
page.close();
