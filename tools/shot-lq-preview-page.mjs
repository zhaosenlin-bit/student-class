/*
 * Open a lesson the way a reader does and take a picture.
 *
 *   node tools/shot-lq-preview-page.mjs <course-id> [out.png]
 */
import { connect, sleep } from './cdp2.mjs';

const PORT = Number(process.env.LQ_PORT || 4173);
const CDP = Number(process.env.CDP_PORT || 9226);
const id = process.argv[2];
const out = process.argv[3] || `recon/scratch/preview-${id}.png`;
const WAIT = Number(process.env.LQ_WAIT || 13000);

const browser = await connect(CDP);
await browser.goto(`http://127.0.0.1:${PORT}/#course/${id}`);
await sleep(5000);
await browser.evaluate(
  `[...document.querySelectorAll('button')].find(x => /在线预览/.test(x.textContent))?.click()`
);
await sleep(WAIT);
await browser.shot(out);
console.log(out);
await browser.close();
