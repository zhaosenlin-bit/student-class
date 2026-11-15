/* 目录页为什么是空的：把控制台报错和 DOM 现状都拉出来。 */
import { connect, sleep } from './cdp2.mjs';

const PORT = Number(process.env.LQ_PORT || 4173);
const browser = await connect(Number(process.env.CDP_PORT || 9226));
const mark = browser.events.length;
await browser.goto('http://127.0.0.1:' + PORT + '/#catalog');
await sleep(7000);
const out = await browser.evaluate(`(() => ({
  url: location.href,
  title: document.title,
  grid: !!document.querySelector('#grid'),
  gridChildren: document.querySelector('#grid')?.children.length ?? -1,
  cards: document.querySelectorAll('.product-card').length,
  mainText: (document.querySelector('#main')?.innerText || '').replace(/\\s+/g, ' ').slice(0, 200),
  scripts: [...document.querySelectorAll('script')].map((s) => s.src).filter(Boolean),
}))()`);
console.log(JSON.stringify(out, null, 1));
const errs = browser.events
  .slice(mark)
  .filter((e) => e.method === 'Runtime.exceptionThrown')
  .map((e) => e.params.exceptionDetails?.exception?.description || e.params.exceptionDetails?.text || '');
console.log('errors:', JSON.stringify(errs.slice(0, 5), null, 1));
const bad = browser.events
  .slice(mark)
  .filter((e) => e.method === 'Network.responseReceived' && e.params.response.status >= 400)
  .map((e) => e.params.response.status + ' ' + e.params.response.url);
console.log('failed:', JSON.stringify([...new Set(bad)].slice(0, 10), null, 1));
await browser.shot('recon/scratch/lq-page-state.png');
await browser.close();
