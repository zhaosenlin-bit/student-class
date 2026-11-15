#!/usr/bin/env node
/* Screenshot a route of the delivered library and dump the visible controls. */
import fs from 'node:fs';
import { connect, sleep } from './cdp2.mjs';

const PORT = Number(process.env.LQ_PORT || 4173);
const CDP = Number(process.env.CDP_PORT || 9226);
const route = process.env.LQ_ROUTE || '#catalog';
const out = process.env.LQ_OUT || 'recon/scratch/shot.png';
const width = Number(process.env.LQ_W || 1600);
const height = Number(process.env.LQ_H || 1000);
const mobile = process.env.LQ_MOBILE === '1';

const browser = await connect(CDP);
await browser.raw('Emulation.setDeviceMetricsOverride',
  { width, height, deviceScaleFactor: 1, mobile }, browser.pageSession);
await browser.goto(`http://localhost:${PORT}/${route}`);
await sleep(3500);
const info = await browser.evaluate(`(() => {
  const vis = (el) => el.offsetParent !== null;
  const ctrls = [...document.querySelectorAll('button,a[href],summary')]
    .filter(vis)
    .map((el) => ((el.innerText || el.textContent || '').trim().replace(/\\s+/g,' ') || el.getAttribute('aria-label') || '').slice(0,30))
    .filter(Boolean);
  const panels = [...document.querySelectorAll('.download-gallery-filters,[data-collapsed]')]
    .map((el) => ({ cls: el.className, collapsed: el.getAttribute('data-collapsed'), h: el.offsetHeight }));
  const main = document.querySelector('#main');
  return {
    hash: location.hash,
    title: document.title,
    cards: document.querySelectorAll('#grid .product-card').length,
    nCtrls: ctrls.length,
    ctrls: ctrls.slice(0, 40),
    panels,
    mainTop: main ? main.getBoundingClientRect().top : null,
  };
})()`);
fs.writeFileSync(out.replace(/\.png$/, '.json'), JSON.stringify(info, null, 1));
await browser.shot(out);
fs.writeFileSync('recon/scratch/shot.log', JSON.stringify(info));
process.exit(0);
