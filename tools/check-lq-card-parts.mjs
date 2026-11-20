/*
 * Where each piece of a card sits.
 *
 *   node tools/check-lq-card-parts.mjs
 */
import { connect, sleep } from './cdp2.mjs';

const PORT = Number(process.env.LQ_PORT || 4173);
const CDP = Number(process.env.CDP_PORT || 9226);

const browser = await connect(CDP);
await browser.raw(
  'Emulation.setDeviceMetricsOverride',
  { width: 414, height: 900, deviceScaleFactor: 1, mobile: true },
  browser.pageSession
);
await browser.goto(`http://127.0.0.1:${PORT}/?parts=1#catalog`);
await sleep(4000);

const info = await browser.evaluate(
  `(() => {
    const cards = [...document.querySelectorAll('.product-card')].slice(0, 2);
    return cards.map(card => {
      const box = el => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return {
          top: Math.round(r.top),
          height: Math.round(r.height),
          flex: s.flex,
          flexGrow: s.flexGrow,
          marginTop: s.marginTop,
        };
      };
      const body = card.querySelector('.card-body');
      return {
        title: card.querySelector('.card-title h3')?.textContent.trim(),
        card: box(card),
        cover: box(card.querySelector('.cover')),
        body: box(body),
        bodyDisplay: body ? getComputedStyle(body).display : '',
        bodyDirection: body ? getComputedStyle(body).flexDirection : '',
        meta: box(card.querySelector('.card-meta')),
        titleBox: box(card.querySelector('.card-title')),
        titleH3: box(card.querySelector('.card-title h3')),
        desc: box(card.querySelector('.card-description')),
        actions: box(card.querySelector('.download-card-actions')),
      };
    });
  })()`
);

console.log(JSON.stringify(info, null, 1));
await browser.close();
