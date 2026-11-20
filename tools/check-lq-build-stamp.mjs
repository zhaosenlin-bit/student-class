/*
 * The version mark in the footer.
 *
 * It says which build of the library is on screen, and it turns into a
 * button when the server is already serving a newer one.  This opens the
 * page and reads it.
 *
 *   node tools/check-lq-build-stamp.mjs
 */
import { connect, sleep } from './cdp2.mjs';

const PORT = Number(process.env.LQ_PORT || 4173);
const CDP = Number(process.env.CDP_PORT || 9226);

const browser = await connect(CDP);
await browser.goto(`http://127.0.0.1:${PORT}/#catalog`);
await sleep(6000);
const stamp = await browser.evaluate(
  `(() => {
    const el = document.querySelector('#lq-build-stamp');
    if (!el) return { missing: true };
    return {
      text: el.textContent.trim(),
      hidden: el.hidden,
      stale: el.classList.contains('is-stale'),
      build: document.querySelector('meta[name="lq-build"]')?.content || '',
    };
  })()`
);
console.log(JSON.stringify(stamp, null, 2));
await browser.close();
