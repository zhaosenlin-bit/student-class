#!/usr/bin/env node
/*
 * Look for the words that belong to a commercial site — logging in,
 * feedback, buying, refunds — in the pages the local library serves.
 *
 * The local build has one line only: browse, use, download. Anything
 * that still asks for an account or a card is a leftover.
 */
import { connect, sleep } from './cdp2.mjs';

const CDP = Number(process.env.CDP_PORT || 9226);
const browser = await connect(CDP);
await browser.raw(
  'Emulation.setDeviceMetricsOverride',
  { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false },
  browser.pageSession
);

const PAT =
  '登录|注册|退出登录|绑定手机号|改进建议|反馈|购买|购买下载卡|退款|售后|订单|' +
  '发布课件|上传作品|会员中心|尝鲜卡|次卡|年卡|永久卡|选择下载卡';

const ROUTES = [
  [
    4173,
    [
      '#catalog',
      '#course/afe-831',
      '#course/afe-849',
      '#course/mirror',
      '#works',
      '#teachers',
      '#purchases',
      '#creator',
      '#admin',
      '#moderation',
      '#owner-login',
      '#purchase/afe-849',
      '#unlocked',
    ],
  ],
  [4175, ['#catalog', '#course/mirror', '#works']],
  [4174, ['#catalog']],
];

let bad = 0;
for (const [port, routes] of ROUTES) {
  for (const route of routes) {
    await browser.goto(`http://localhost:${port}/${route}`);
    await sleep(2800);
    const out = await browser.evaluate(`(() => {
      const re = new RegExp(${JSON.stringify(PAT)});
      const hits = new Set();
      for (const el of document.querySelectorAll('button,a,label,summary,h1,h2,h3,p,li,dt')) {
        const t = (el.innerText || el.textContent || '').trim().replace(/\\s+/g, ' ');
        if (!t || t.length > 40) continue;
        if (el.offsetParent === null) continue;
        if (re.test(t)) hits.add(t);
      }
      return {
        hash: location.hash,
        cards: document.querySelectorAll('#grid .product-card').length,
        hits: [...hits].slice(0, 12),
      };
    })()`);
    if (out.hits.length) bad += out.hits.length;
    console.log(port, route, '=>', JSON.stringify(out));
  }
}
console.log(bad ? `\n${bad} 处还需要处理` : '\n干净：没有登录 / 反馈 / 购买文案');
await browser.close();
