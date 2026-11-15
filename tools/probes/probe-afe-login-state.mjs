/* What does the player page say, and is the browser still signed in? */
import { connect, sleep } from './cdp2.mjs';

const id = process.argv[2] || '842';
const browser = await connect(9222);
await browser.goto(`https://aifunengjiaoyu.com/play/${id}`);
await sleep(5000);

const expr = `(() => ({
  title: document.title,
  status: document.getElementById('play-status')?.textContent || '',
  hint: document.getElementById('hint')?.textContent || '',
  body: (document.body.innerText || '').slice(0, 500),
  token: !!localStorage.getItem('aiedu_token'),
  user: localStorage.getItem('aiedu_user'),
  frames: [...document.querySelectorAll('iframe')].map(f => f.src),
}))()`;
const state = await browser.evaluate(expr);
console.log(JSON.stringify(state, null, 1));
await browser.close();
