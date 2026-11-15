#!/usr/bin/env node
/* Dump every visible control on the pages of the delivered library. */
import { connect, sleep } from './cdp2.mjs';

const PORT = Number(process.env.LQ_PORT || 4173);
const CDP = Number(process.env.CDP_PORT || 9226);
const ROUTES = (process.env.LQ_ROUTES || '#catalog,#works,#course/afe-831,#course/measurement-motion').split(',');
const browser = await connect(CDP);
await browser.raw('Emulation.setDeviceMetricsOverride',
  { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false }, browser.pageSession);

for (const route of ROUTES) {
  await browser.goto(`http://localhost:${PORT}/${route}`);
  await sleep(3200);
  const out = await browser.evaluate(`(() => {
    const vis = (el) => el.offsetParent !== null || getComputedStyle(el).position === 'fixed';
    const ctrl = [...document.querySelectorAll('button,a[data-action],a[href],summary,label[for],input[type=checkbox],input[type=radio]')]
      .filter(vis)
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        act: el.getAttribute('data-action') || '',
        href: el.getAttribute('href') || '',
        txt: (el.innerText || el.textContent || el.getAttribute('aria-label') || '').trim().replace(/\\s+/g,' ').slice(0, 28),
      }));
    return { hash: location.hash, title: document.title, n: ctrl.length, ctrl };
  })()`);
  console.log('=== ' + route);
  for (const c of out.ctrl) console.log('   ', c.tag, c.act || c.href || '', '|', c.txt);
}
await browser.close();
