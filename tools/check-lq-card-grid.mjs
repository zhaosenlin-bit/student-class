/*
 * Do the cards in a row line up?
 *
 * A grid row is as tall as its tallest card, and every card in it
 * should put its two buttons on the same line.  This measures the
 * cards of the first row at a desktop width and at a phone width.
 *
 *   node tools/check-lq-card-grid.mjs
 */
import { connect, sleep } from './cdp2.mjs';

const PORT = Number(process.env.LQ_PORT || 4173);
const CDP = Number(process.env.CDP_PORT || 9226);

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
  await browser.goto(`http://127.0.0.1:${PORT}/?grid=${vp.name}#catalog`);
  await sleep(4000);
  const info = await browser.evaluate(
    `(() => {
      const grid = document.querySelector('.catalog-products .grid') || document.querySelector('#grid');
      const cards = [...document.querySelectorAll('.catalog-products .product-card, #grid .product-card')].slice(0, 4);
      const columns = grid ? getComputedStyle(grid).gridTemplateColumns : '';
      const rows = cards.map(c => {
        const actions = c.querySelector('.download-card-actions, .card-actions');
        const title = c.querySelector('.card-title h3');
        const desc = c.querySelector('.card-description');
        return {
          title: title ? title.textContent.trim().slice(0, 14) : '',
          titleLines: title ? Math.round(title.getBoundingClientRect().height / parseFloat(getComputedStyle(title).lineHeight)) : 0,
          descLines: desc ? Math.round(desc.getBoundingClientRect().height / parseFloat(getComputedStyle(desc).lineHeight)) : 0,
          cardTop: Math.round(c.getBoundingClientRect().top),
          cardHeight: Math.round(c.getBoundingClientRect().height),
          actionsTop: actions ? Math.round(actions.getBoundingClientRect().top) : null,
        };
      });
      return { width: innerWidth, columns, rows };
    })()`
  );
  console.log(vp.name, JSON.stringify(info, null, 1));
}

await browser.close();
