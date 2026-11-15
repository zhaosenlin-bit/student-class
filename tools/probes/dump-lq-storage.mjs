/* List the course namespaces the browser kept, with the keys inside them. */
import { connect, sleep } from './cdp2.mjs';

const browser = await connect(9222);
await browser.goto('https://aifunengjiaoyu.com/');
await sleep(1500);

const expr = `(() => {
  const out = [];
  for (const key of Object.keys(localStorage)) {
    if (!/turing|course|fr1789/i.test(key)) continue;
    out.push({ key, value: String(localStorage.getItem(key)).slice(0, 600) });
  }
  return out;
})()`;

console.log(JSON.stringify(await browser.evaluate(expr), null, 1));
await browser.close();
