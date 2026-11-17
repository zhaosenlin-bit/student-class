#!/usr/bin/env node
/*
 * Opens one address and says whether the page answers.
 *
 *   node tools/probe-lq-url.mjs http://localhost:4180/afe-180.html
 */
import { connect, sleep } from './cdpx.mjs';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const CDP = Number(arg('cdp', 9222));
const WAIT = Number(arg('wait', 6000));
const url = args.find((a) => a.startsWith('http'));

const p = await connect(CDP);
await p.goto(url);
await sleep(WAIT);

const PROBE = `(() => ({
  n: document.querySelectorAll('*').length,
  t: document.title,
  vis: document.body ? document.body.style.visibility : '',
  head: (document.body ? document.body.innerText : '').replace(/\\s+/g, ' ').trim().slice(0, 100),
}))()`;

const r = await Promise.race([
  p.evaluate(PROBE).catch((e) => ({ error: e.message })),
  new Promise((res) => setTimeout(() => res({ error: 'no answer in 5s' }), 5000)),
]);
console.log(url);
console.log(JSON.stringify(r, null, 1));
await p.close();
