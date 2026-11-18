#!/usr/bin/env node
/*
 * Wait for the scan of the code to be finished at the platform, and keep
 * the ticket that comes with it.
 *
 * The window has to stay open while the reader scans, so the wait is done
 * here, in the background, and the ticket is written down as soon as it
 * arrives.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect } from './cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'recon', 'scratch', 'afe-token.txt');
const PORT = Number(process.env.AFE_CDP_PORT || 9228);
const TIMEOUT_MS = Number(process.argv[2] || 15 * 60 * 1000);

const page = await connect(PORT, 'aifunengjiaoyu.com');
console.log('page:', await page.evaluate('document.title'));

/* The window has to show the code, so it is opened if it is not open. */
const hasQr = await page.evaluate(
  "!![...document.querySelectorAll('img')].find(e => e.offsetParent !== null && /showqrc/.test(e.src || ''))"
);
if (!hasQr) {
  const box = await page.evaluate(
    "(() => {" +
      "const btn = [...document.querySelectorAll('button,a')]" +
      ".find(e => (e.textContent || '').replace(/\\s+/g, '') === '登录/注册');" +
      "if (!btn) return null;" +
      "btn.scrollIntoView({ block: 'center' });" +
      "const r = btn.getBoundingClientRect();" +
      "return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };" +
      "})()"
  );
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
  await new Promise((r) => setTimeout(r, 3500));
}

const deadline = Date.now() + TIMEOUT_MS;
while (Date.now() < deadline) {
  const token = await page.evaluate("localStorage.getItem('aiedu_token')");
  if (token) {
    fs.writeFileSync(OUT, token);
    console.log('ticket saved ->', OUT);
    break;
  }
  await new Promise((r) => setTimeout(r, 4000));
}

if (!fs.existsSync(OUT)) console.log('no ticket yet');
page.close();
process.exit(fs.existsSync(OUT) ? 0 : 1);
