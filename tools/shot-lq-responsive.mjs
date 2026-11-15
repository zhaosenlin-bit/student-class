#!/usr/bin/env node
/*
 * Look at the catalogue the way a reader sees it, at both a desktop and a
 * phone width. The filter block is the part that eats the screen, so the
 * two shots are the ones worth keeping.
 */
import { connect, sleep } from './cdp2.mjs';

const PORT = Number(process.env.LQ_PORT || 4173);
const CDP = Number(process.env.CDP_PORT || 9226);
const HASH = process.env.LQ_HASH || '#catalog';

const browser = await connect(CDP);

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 1000, mobile: false },
  { name: 'phone', width: 414, height: 900, mobile: true },
];

for (const vp of VIEWPORTS) {
  await browser.raw(
    'Emulation.setDeviceMetricsOverride',
    {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      mobile: vp.mobile,
    },
    browser.pageSession
  );
  await browser.goto(`http://localhost:${PORT}/${HASH}`);
  await sleep(3000);
  const info = await browser.evaluate(`(() => {
    const grid = document.querySelector('#grid');
    const first = grid && grid.querySelector('.product-card');
    const filters = document.querySelector('.download-gallery-filters');
    return {
      hash: location.hash,
      cards: grid ? grid.querySelectorAll('.product-card').length : 0,
      firstCardTop: first ? Math.round(first.getBoundingClientRect().top + window.scrollY) : null,
      filtersOpen: filters ? !filters.open : null,
      pageHeight: document.body.scrollHeight,
    };
  })()`);
  console.log(vp.name, JSON.stringify(info));
  await browser.shot(`recon/scratch/lq-${vp.name}-${HASH.replace(/[#/]/g, '') || 'home'}.png`);
}

await browser.close();
