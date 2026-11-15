/*
 * Open the 图灵智赋 login modal, wait for the WeChat scan to complete and
 * save the resulting bearer token to recon/scratch/afe-token.txt.
 *
 * The site only offers a WeChat QR scan, so the browser window has to be
 * visible while the user scans.  Everything else is read back through the
 * DevTools protocol.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, screenshot } from './cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'recon', 'scratch', 'afe-token.txt');
const SHOT = path.join(ROOT, 'recon', 'scratch', 'afe-login-qr.png');
const TIMEOUT_MS = Number(process.argv[2] || 10 * 60 * 1000);

const page = await connect(9222, 'aifunengjiaoyu.com');
console.log('page:', await page.evaluate('document.title'));

const qrAlready = await page.evaluate(
  "!![...document.querySelectorAll('img')].find(e => e.offsetParent !== null && /showqrc/.test(e.src || ''))",
);

/* A real trusted mouse event is needed; a synthetic click() is ignored. */
const box = qrAlready ? null : await page.evaluate(`
  (() => {
    const btn = [...document.querySelectorAll('button,a')]
      .find(e => (e.textContent || '').replace(/\\s+/g, '') === '登录/注册');
    if (!btn) return null;
    btn.scrollIntoView({ block: 'center' });
    const r = btn.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), tag: btn.tagName };
  })()
`);
console.log('login button box:', JSON.stringify(box));

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
}

await new Promise((r) => setTimeout(r, qrAlready ? 500 : 3500));
await screenshot(page, SHOT);
console.log('qr screenshot ->', SHOT);

const deadline = Date.now() + TIMEOUT_MS;
let token = null;
while (Date.now() < deadline) {
  token = await page.evaluate("localStorage.getItem('aiedu_token')");
  if (token) break;
  const note = await page.evaluate(
    "(()=>{const q=document.querySelector('#login-qr, .login-qr, [class*=qrcode], [class*=qr-code]'); return q? 'qr visible':'waiting';})()",
  );
  process.stdout.write(`\r  ${note} ...`);
  await new Promise((r) => setTimeout(r, 3000));
}
process.stdout.write('\n');

if (!token) {
  console.log('no token yet — scan the QR in the Chrome window');
  page.close();
  process.exit(1);
}

const user = await page.evaluate("localStorage.getItem('aiedu_user')");
fs.writeFileSync(OUT, token);
console.log('token saved ->', OUT);
console.log('user:', user);
page.close();
process.exit(0);
