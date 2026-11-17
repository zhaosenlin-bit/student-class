#!/usr/bin/env node
/*
 * Open a course from the library and photograph what the visitor sees.
 *
 *   node tools/shot-preview.mjs afe-1387 12000
 */
import { connect, sleep } from './cdp2.mjs';

const PORT = Number(process.env.LQ_PORT || 4173);
const id = process.argv[2];
const wait = Number(process.argv[3] || 10000);
const tag = process.argv[4] || 'preview';

const browser = await connect(9222);
await browser.goto(`http://localhost:${PORT}/#course/${id}`);
await sleep(2000);

const clicked = await browser.evaluate(`(() => {
  const buttons = [...document.querySelectorAll('button, a')];
  const b = buttons.find((e) => /在线预览|开始学习|在线使用/.test(e.innerText || ''));
  if (!b) return { ok: false, labels: buttons.map((e) => (e.innerText || '').trim()).filter(Boolean).slice(0, 30) };
  b.click();
  return { ok: true, label: (b.innerText || '').trim() };
})()`);
console.log('clicked:', JSON.stringify(clicked));
await sleep(wait);

const file = `recon/scratch/${tag}-${id}.png`;
await browser.shot(file);
console.log(file);

const state = await browser.evaluate(`(() => ({
  hash: location.hash,
  frames: [...document.querySelectorAll('iframe')].map((f) => f.getAttribute('src')),
  lessonHidden: (document.querySelector('#lesson-loading') || {}).hidden,
  bodyText: (document.body.innerText || '').slice(0, 200),
}))()`);
console.log(JSON.stringify(state, null, 1));

/* What the frame itself asked for, and what came back. */
const net = browser.events
  .filter((e) => e.method === 'Network.responseReceived')
  .filter((e) => e.params.response.status >= 400)
  .map((e) => `${e.params.response.status} ${e.params.response.url}`)
  .slice(0, 25);
if (net.length) console.log('失败的请求:\n  ' + net.join('\n  '));

await browser.close();

