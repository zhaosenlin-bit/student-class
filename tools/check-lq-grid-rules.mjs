/*
 * Which rule decides how many columns the catalogue has?
 *
 *   node tools/check-lq-grid-rules.mjs
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
await browser.goto(`http://127.0.0.1:${PORT}/?rules=1#catalog`);
await sleep(4000);

const info = await browser.evaluate(
  `(() => {
    const grid = document.querySelector('.catalog-products .grid');
    if (!grid) return { error: 'no grid' };
    const hits = [];
    for (const sheet of document.styleSheets) {
      let rules;
      try { rules = sheet.cssRules; } catch { continue; }
      const walk = (list, media) => {
        for (const rule of list) {
          if (rule.media) {
            walk(rule.cssRules, rule.conditionText || rule.media.mediaText);
            continue;
          }
          if (!rule.selectorText) continue;
          if (!/grid-template-columns/.test(rule.cssText)) continue;
          if (!/\\.grid/.test(rule.selectorText)) continue;
          try {
            if (grid.matches(rule.selectorText)) {
              hits.push({ media: media || '', selector: rule.selectorText, css: rule.style.gridTemplateColumns });
            }
          } catch {}
        }
      };
      walk(rules, '');
    }
    return {
      width: innerWidth,
      narrow: matchMedia('(max-width:600px)').matches,
      computed: getComputedStyle(grid).gridTemplateColumns,
      hits,
    };
  })()`
);

console.log(JSON.stringify(info, null, 1));
await browser.close();
