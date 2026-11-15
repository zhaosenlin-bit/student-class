/* 版本条为什么还换行：看它实际吃到的样式是哪一条。 */
import { connect, sleep } from './cdp2.mjs';

const browser = await connect(Number(process.env.CDP_PORT || 9226));
await browser.goto('http://127.0.0.1:' + Number(process.env.LQ_PORT || 4173) + '/#catalog');
await sleep(5000);
const out = await browser.evaluate(`(() => {
  const nav = document.querySelector('.download-edition-tabs');
  if (!nav) return { missing: true };
  const cs = getComputedStyle(nav);
  const btn = nav.querySelector('button');
  const bs = btn ? getComputedStyle(btn) : null;
  return {
    navDisplay: cs.display,
    navWrap: cs.flexWrap,
    navWidth: cs.width,
    navBg: cs.backgroundColor,
    parentWidth: nav.parentElement.getBoundingClientRect().width,
    navRect: nav.getBoundingClientRect().width,
    btnWidth: btn ? btn.getBoundingClientRect().width : null,
    btnMinWidth: bs ? bs.minWidth : null,
    btnHeight: bs ? bs.height : null,
    btnMinHeight: bs ? bs.minHeight : null,
    btnPadding: bs ? bs.padding : null,
    btnGap: bs ? bs.gap : null,
    btnAlign: bs ? bs.alignItems : null,
    navAlign: cs.alignItems,
    strongFont: btn ? getComputedStyle(btn.querySelector('strong')).fontSize : null,
    spanFont: btn ? getComputedStyle(btn.querySelector('span')).fontSize : null,
    spanDisplay: btn ? getComputedStyle(btn.querySelector('span')).display : null,
    sheets: [...document.styleSheets].map((s) => (s.href || '').split('/').pop()),
  };
})()`);
console.log(JSON.stringify(out, null, 1));
await browser.close();
