/*
 * Clear the signed-in state in the 扫码 browser so a fresh QR shows up.
 *
 * The camera runtime gives every course a few openings per account.  When
 * they run out the platform answers "试用次数已用完".  A new sign-in hands
 * the account a fresh set of openings, so the last course that is still
 * waiting for its material can be fetched again.
 *
 *   node tools/probe-afe-fresh-login.mjs          # only report
 *   node tools/probe-afe-fresh-login.mjs --clear  # sign out
 */
import fs from 'node:fs';
import path from 'node:path';
import { connect, screenshot } from './cdp.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const PORT = Number(process.env.CDP_PORT || 9228);
const CLEAR = process.argv.includes('--clear');

const page = await connect(PORT, 'aifunengjiaoyu.com');
console.log('title:', await page.evaluate('document.title'));
console.log('token in page:', await page.evaluate("!!localStorage.getItem('aiedu_token')"));

if (CLEAR) {
  await page.evaluate(
    "localStorage.removeItem('aiedu_token');localStorage.removeItem('aiedu_user');'ok'"
  );
  await page.send('Page.navigate', { url: 'https://aifunengjiaoyu.com/' });
  await new Promise((r) => setTimeout(r, 5000));
  console.log('after reload, token in page:', await page.evaluate("!!localStorage.getItem('aiedu_token')"));
}

const backup = path.join(ROOT, 'recon', 'scratch', 'afe-token.bak.txt');
if (fs.existsSync(backup)) console.log('kept a copy of the old token ->', backup);

const shot = path.join(ROOT, 'recon', 'scratch', 'fresh-qr.png');
const qrOnScreen = () =>
  page.evaluate(
    "!![...document.querySelectorAll('img')].find(e => e.offsetParent !== null && /showqrc/.test(e.src || ''))"
  );

if (!process.argv.includes('--status')) {
  await screenshot(page, shot);
  console.log('shot ->', shot);
}
console.log('qr on screen:', await qrOnScreen());
console.log(
  'modal says:',
  await page.evaluate(
    "(document.querySelector('.modal-overlay.show') || document.body).innerText.replace(/\\s+/g,' ').slice(0,120)"
  )
);

if (process.argv.includes('--click')) {
  /* Only knock when the code is not already on screen: the button closes
     the panel when it is open. */
  if (await qrOnScreen()) {
    console.log('the code is already up — left it alone');
    page.close();
    process.exit(0);
  }
  const box = await page.evaluate(`
    (() => {
      const btn = [...document.querySelectorAll('button,a')]
        .find(e => (e.textContent || '').replace(/\\s+/g, '') === '登录/注册');
      if (!btn) return null;
      btn.scrollIntoView({ block: 'center' });
      const r = btn.getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    })()
  `);
  console.log('login button:', JSON.stringify(box));
  if (box) {
    for (const type of ['mousePressed', 'mouseReleased']) {
      await page.send('Input.dispatchMouseEvent', {
        type,
        x: box.x,
        y: box.y,
        button: 'left',
        clickCount: 1,
      });
    }
    await new Promise((r) => setTimeout(r, 3500));
    await screenshot(page, shot);
    console.log(
      'qr on screen:',
      await page.evaluate(
        "!![...document.querySelectorAll('img')].find(e => e.offsetParent !== null && /showqrc/.test(e.src || ''))"
      )
    );
  }
}
page.close();
