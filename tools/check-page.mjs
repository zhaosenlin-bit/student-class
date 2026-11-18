#!/usr/bin/env node
/*
 * 把一个地址真正打开，看看它有没有裂开的图、有没有报错。
 *
 *   node tools/check-page.mjs http://127.0.0.1:4173/api/program-assets/1360/province-terrain-samples/macau.html
 */
import { connect, sleep } from './cdp2.mjs';

const CDP = Number(process.env.CDP_PORT || 9226);
const url = process.argv[2];
if (!url) {
  console.log('要给一个地址');
  process.exit(1);
}

const browser = await connect(CDP);
await browser.raw('Network.enable', {}, browser.pageSession);
await browser.raw('Runtime.enable', {}, browser.pageSession);
await browser.raw('Log.enable', {}, browser.pageSession).catch(() => {});

const bad = [];
const errors = [];
const drain = () => {
  for (const e of browser.events.splice(0)) {
    if (e.method === 'Network.loadingFailed') {
      bad.push(e.params.errorText + ' ' + e.params.type);
    }
    if (e.method === 'Network.responseReceived' && e.params.response.status >= 400) {
      bad.push(e.params.response.status + ' ' + e.params.response.url);
    }
    if (e.method === 'Runtime.exceptionThrown') {
      errors.push(e.params.exceptionDetails?.exception?.description || e.params.exceptionDetails?.text);
    }
    if (e.method === 'Log.entryAdded' && e.params.entry?.level === 'error') {
      errors.push(e.params.entry.text);
    }
  }
};

await browser.goto(url);
await sleep(Number(process.env.WAIT || 4000));
drain();

const out = await browser.evaluate(`(() => {
  const imgs = [...document.querySelectorAll('img')];
  return {
    title: document.title,
    text: (document.body.innerText || '').replace(/\\s+/g, ' ').slice(0, 220),
    imgs: imgs.length,
    broken: imgs.filter(i => i.complete && i.naturalWidth === 0 && i.getAttribute('src')).map(i => i.src),
    nodes: document.body.querySelectorAll('*').length,
  };
})()`);

console.log('标题：' + out.title);
console.log('节点：' + out.nodes + '   图：' + out.imgs + '   裂：' + out.broken.length);
console.log('文字：' + out.text);
for (const b of out.broken.slice(0, 10)) console.log('  裂图 ' + b);
for (const b of bad.slice(0, 10)) console.log('  失败 ' + b);
for (const e of errors.slice(0, 6)) console.log('  报错 ' + String(e).slice(0, 200));
await browser.close();
