/*
 * Open one course the way a reader does and report what the frame shows.
 *
 *   node tools/probe-one.mjs afe-819 [waitMs]
 */
import { connect, sleep } from './cdp2.mjs';

const CDP = Number(process.env.LQ_CDP_PORT || 9226);
const PORT = Number(process.env.LQ_PORT || 4173);
const id = process.argv[2];
const wait = Number(process.argv[3] || 20000);
if (!id) {
  console.error('用法：node tools/probe-one.mjs <课件id> [等待毫秒]');
  process.exit(2);
}

const browser = await connect(CDP);
await browser.goto(`http://localhost:${PORT}/#course/${encodeURIComponent(id)}`);
await sleep(2000);
const clicked = await browser.evaluate(`(() => {
  const b = document.querySelector('[data-lq-preview]');
  if (!b) return false;
  b.click();
  return true;
})()`);
await sleep(wait);
const report = await browser.evaluate(`(() => {
  const frame = document.querySelector('.lq-preview iframe');
  const doc = frame && frame.contentDocument;
  const imgs = doc ? [...doc.querySelectorAll('img')] : [];
  return {
    clicked: ${clicked},
    src: frame ? frame.src : null,
    bodyLen: doc && doc.body ? doc.body.innerHTML.length : 0,
    text: doc && doc.body ? doc.body.innerText.replace(/\\s+/g, ' ').slice(0, 160) : '',
    imgs: imgs.length,
    badImgs: imgs.filter((i) => i.complete && i.naturalWidth === 0).length,
    canvases: doc ? doc.querySelectorAll('canvas').length : 0,
    state: doc ? doc.documentElement.getAttribute('data-xb-classroom-state') : null,
  };
})()`);
console.log(id, JSON.stringify(report, null, 1));
process.exit(0);
