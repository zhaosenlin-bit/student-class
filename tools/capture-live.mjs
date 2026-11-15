#!/usr/bin/env node
/*
 * Open a work on the live site in a real browser and write down every
 * address it asks for.
 *
 * Some works keep their files in a place the document only hints at, and
 * the mirror can then only guess. The live page shows the truth, so the
 * browser is pointed at the live catalogue and every request is recorded.
 *
 *   node tools/capture-live.mjs 506 20 196
 */
import fs from 'node:fs';
import path from 'node:path';
import { connect } from './cdp.mjs';

const ROOT = process.cwd();
const ORIGIN = 'https://aifunengjiaoyu.com';
const ids = process.argv.slice(2).filter(Boolean);
const token = fs.readFileSync(path.join(ROOT, 'recon', 'scratch', 'afe-token.txt'), 'utf8').trim();

const page = await connect(9222);
await page.send('Network.enable');
await page.send('Page.enable');

await page.send('Page.navigate', { url: `${ORIGIN}/` });
await new Promise((r) => setTimeout(r, 3000));
/* The account is put into the page before the catalogue is opened. */
await page.evaluate(
  `(() => {
     for (const key of ['token','afe_token','auth_token','jwt','user_token']) {
       try { localStorage.setItem(key, ${JSON.stringify(token)}); } catch (e) {}
     }
     try { localStorage.setItem('token', ${JSON.stringify(token)}); } catch (e) {}
     return Object.keys(localStorage);
   })()`
);

for (const id of ids) {
  page.events.length = 0;
  await page.send('Page.navigate', { url: `${ORIGIN}/#browse?program=${id}` });
  await new Promise((r) => setTimeout(r, 12000));
  const seen = new Map();
  for (const ev of page.events) {
    if (ev.method === 'Network.requestWillBeSent') {
      seen.set(ev.params.request.url, { status: 0, type: ev.params.type });
    } else if (ev.method === 'Network.responseReceived') {
      const row = seen.get(ev.params.response.url);
      if (row) row.status = ev.params.response.status;
    } else if (ev.method === 'Network.loadingFailed') {
      /* kept below */
    }
  }
  const rows = [...seen.entries()].map(([url, row]) => ({ url, ...row }));
  const interesting = rows.filter(
    (r) => r.status >= 400 || /program-assets|\/assets\/|\.glb|\.wasm|pet-assets/.test(r.url)
  );
  console.log(`\n=== ${id}: ${rows.length} 个请求, ${interesting.length} 个要看`);
  for (const r of interesting) console.log(`  ${r.status} ${r.url}`);
  fs.writeFileSync(
    path.join(ROOT, 'recon', 'scratch', `live-${id}.json`),
    JSON.stringify(rows, null, 1)
  );
}
page.close();
