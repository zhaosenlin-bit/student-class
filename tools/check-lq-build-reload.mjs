/*
 * Does an old page notice that the library has moved on?
 *
 * The page carries the build it was made from.  This pretends the page
 * is old, wakes it up, and watches whether it reloads itself and comes
 * back in step with the server.
 *
 *   node tools/check-lq-build-reload.mjs
 */
import { connect, sleep } from './cdp2.mjs';

const PORT = Number(process.env.LQ_PORT || 4173);
const CDP = Number(process.env.CDP_PORT || 9226);

const browser = await connect(CDP);
await browser.goto(`http://127.0.0.1:${PORT}/#catalog`);
await sleep(6000);

const before = await browser.evaluate(
  `document.querySelector('meta[name="lq-build"]')?.content || ''`
);

/* Pretend this page was made long ago. */
await browser.evaluate(
  `document.querySelector('meta[name="lq-build"]').content = 'lq-202001010000'`
);
await browser.evaluate(`window.dispatchEvent(new Event('focus'))`);
await sleep(3500);

const after = await browser.evaluate(
  `document.querySelector('meta[name="lq-build"]')?.content || ''`
);
const stamp = await browser.evaluate(
  `(() => {
    const el = document.querySelector('#lq-build-stamp');
    return el ? el.textContent.trim() : '';
  })()`
);

console.log(`页面自称的版本：${before}`);
console.log(`醒来之后的版本：${after}`);
console.log(`页脚标记：${stamp}`);
console.log(
  after === before ? '绿灯：旧页面自己更新了' : '红灯：旧页面没有更新'
);
await browser.close();
