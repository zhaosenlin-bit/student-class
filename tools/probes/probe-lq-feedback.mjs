#!/usr/bin/env node
/* Which elements still talk about feedback? */
import { connect, sleep } from './cdp2.mjs';

const PORT = Number(process.env.LQ_PORT || 4173);
const CDP = Number(process.env.CDP_PORT || 9226);
const browser = await connect(CDP);
await browser.goto('http://localhost:' + PORT + '/#catalog');
await sleep(3000);

const hits = await browser.evaluate(`(() => {
  const out = [];
  const walk = (node) => {
    for (const el of node.querySelectorAll('*')) {
      const text = (el.textContent || '').trim();
      if (!text.includes('反馈')) continue;
      if (el.children.length && text.length > 60) continue;
      out.push({
        tag: el.tagName,
        cls: String(el.className || '').slice(0, 50),
        id: el.id,
        text: text.slice(0, 80),
      });
    }
  };
  walk(document);
  return out;
})()`);
console.log(JSON.stringify(hits, null, 1));
await browser.close();
