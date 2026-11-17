/* Open one address in the browser and take a picture of it. */
import { connect, sleep } from './cdp2.mjs';

const url = process.argv[2];
const wait = Number(process.argv[3] || 9000);
const tag = process.argv[4] || 'page';
const CDP = Number(process.env.CDP_PORT || 9222);

const browser = await connect(CDP);
await browser.goto(url);
await sleep(wait);
const file = `recon/scratch/${tag}.png`;
await browser.shot(file);
console.log(file);
const state = await browser.evaluate(`(() => ({
  adapter: document.body && document.body.dataset ? document.body.dataset.courseAdapterState : null,
  notice: [...document.querySelectorAll('aside[role="status"]')].map(n => ({hidden: n.hidden, text: n.innerText.replace(/\\s+/g,' ').slice(0,160)})),
  bodyLen: document.body ? document.body.innerHTML.length : 0,
}))()`);
console.log(JSON.stringify(state));
await browser.close();
