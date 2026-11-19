/* Open a course the way a visitor does and take a picture of the lesson. */
import { connect, sleep } from './cdp2.mjs';

const PORT = Number(process.env.LQ_PORT || 4173);
const CDP = Number(process.env.CDP_PORT || 9222);
const id = process.argv[2];
const wait = Number(process.argv[3] || 9000);
const tag = process.argv[4] || 'course';

const browser = await connect(CDP);
await browser.goto(`http://localhost:${PORT}/#course/${id}`);
await sleep(1500);
const clicked = await browser.evaluate(`(() => {
  const b = [...document.querySelectorAll('button, a')].find((e) => /在线(?:使用|预览)/.test(e.innerText || ''));
  if (!b) return false;
  b.click();
  return true;
})()`);
console.log('clicked:', clicked);
await sleep(wait);
const file = `recon/scratch/${tag}-${id}.png`;
await browser.shot(file);
console.log(file);
const state = await browser.evaluate(`(() => {
  return {
    hash: location.hash,
    frames: [...document.querySelectorAll('iframe')].map((f) => f.getAttribute('src')),
    hidden: (document.querySelector('#lesson-loading') || {}).hidden,
  };
})()`);
console.log(JSON.stringify(state));
await browser.close();
