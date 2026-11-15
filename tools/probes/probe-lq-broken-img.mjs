#!/usr/bin/env node
/* Which images fail inside a course? */
import { connect, sleep } from './cdp2.mjs';

const PORT = Number(process.env.LQ_PORT || 4173);
const CDP = Number(process.env.CDP_PORT || 9226);
const id = process.argv[2] || 'afe-846';
const browser = await connect(CDP);
await browser.goto('http://localhost:' + PORT + '/#course/' + id);
await sleep(1500);
await browser.evaluate(`(() => {
  const b = [...document.querySelectorAll('button')].find((e) => /在线使用/.test(e.innerText || ''));
  if (b) b.click();
  return true;
})()`);
await sleep(9000);
const out = await browser.evaluate(`(() => {
  const frame = document.querySelector('#lesson-frame iframe') || document.querySelector('iframe');
  const doc = frame && frame.contentDocument;
  if (!doc) return 'no frame';
  return [...doc.querySelectorAll('img')].map((i) => ({
    src: (i.currentSrc || i.src || '').slice(0, 160),
    w: i.naturalWidth,
    h: i.naturalHeight,
    alt: i.alt,
  }));
})()`);
console.log(JSON.stringify(out, null, 1));
await browser.close();
