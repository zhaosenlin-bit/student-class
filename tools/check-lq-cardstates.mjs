/* 卡片的本地状态文案，到底有几种。 */
import { connect, sleep } from './cdp2.mjs';

const PORT = Number(process.env.LQ_PORT || 4173);
const CDP = Number(process.env.CDP_PORT || 9226);
const browser = await connect(CDP);
await browser.goto('http://localhost:' + PORT + '/#catalog');
await sleep(6000);
const out = await browser.evaluate(`(() => {
  const cards = [...document.querySelectorAll('#grid .product-card')];
  const states = {};
  for (const c of cards) {
    const badge = c.querySelector('.card-meta span:last-child');
    const key = badge ? badge.textContent.trim() : '(none)';
    states[key] = (states[key] || 0) + 1;
  }
  return { cards: cards.length, states, sample: cards.slice(0, 3).map((c) => c.innerText.replace(/\\s+/g, ' ').slice(0, 90)) };
})()`);
console.log(JSON.stringify(out, null, 1));
await browser.close();
