/* Open one course and list every request that did not come back with a
   document, so a broken path can be fixed. */
import fs from 'node:fs';
import { connect, sleep } from './cdp2.mjs';

const PORT = Number(process.env.LQ_PORT || 4173);
const WAIT = Number(process.env.LQ_WAIT || 12000);
const id = process.argv[2];

const browser = await connect(9222);
await browser.raw('Network.enable', {}, browser.pageSession).catch(() => {});
await browser.goto(`http://localhost:${PORT}/#course/${id}`);
await sleep(1200);
await browser.evaluate(`(() => {
  const b = [...document.querySelectorAll('button')].find((e) => /在线使用/.test(e.innerText || ''));
  if (b) b.click();
  return !!b;
})()`);
await sleep(WAIT);

const bad = browser.events
  .filter((e) => e.method === 'Network.responseReceived')
  .filter((e) => e.params.response.status >= 400)
  .map((e) => `${e.params.response.status} ${e.params.response.url}`);
console.log('failed requests:');
for (const b of [...new Set(bad)]) console.log('   ', b);

const frames = browser.events
  .filter((e) => e.method === 'Network.responseReceived')
  .map((e) => e.params.response.url)
  .filter((u) => u.includes('/courseware/') || u.includes('/api/program-assets/'));
console.log('requests seen:', [...new Set(frames)].length);

await browser.shot(`recon/scratch/fail-${id}.png`);
await browser.close();
