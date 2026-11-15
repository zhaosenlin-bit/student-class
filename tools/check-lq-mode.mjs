#!/usr/bin/env node
/*
 * 验一验本地模式：交易类路由进不去，在线使用和下载照旧。
 *
 *   $env:LQ_CDP_PORT="9226"; node tools\check-lq-mode.mjs
 */
import { connect, sleep } from './cdp2.mjs';

const PORT = Number(process.env.LQ_PORT || 4173);
const CDP_PORT = Number(process.env.LQ_CDP_PORT || 9222);

const browser = await connect(CDP_PORT);
let failed = 0;

const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`);
  if (!ok) failed++;
};

/* 1. 首页正常，品牌是乐启享 */
await browser.goto(`http://localhost:${PORT}/#works`);
await sleep(2500);
const home = await browser.evaluate(`(() => ({
  title: document.title,
  brand: (document.querySelector('.header .brand span') || {}).textContent || '',
  nav: [...document.querySelectorAll('#site-navigation .nav-link')].map((a) => a.textContent.trim()),
  oldBrand: document.body.innerText.includes('图灵智赋') || document.body.innerText.includes('小白教育'),
}))()`);
check('首页标题是乐启享', /乐启享/.test(home.title), home.title);
check('导航只剩三条', home.nav.length === 3, home.nav.join(' / '));
check('页面没有旧品牌字样', home.oldBrand === false);

/* 2. 交易类路由被挡回课件库 */
for (const route of ['purchases', 'creator', 'admin', 'refunds', 'moderation', 'market']) {
  await browser.goto(`http://localhost:${PORT}/#${route}`);
  await sleep(900);
  const hash = await browser.evaluate('location.hash');
  check(`#${route} 被挡回 #catalog`, hash === '#catalog', hash);
}

/* 3. 在线路径没被误伤 */
await browser.goto(`http://localhost:${PORT}/#course/afe-196`);
await sleep(1200);
const clicked = await browser.evaluate(`(() => {
  const b = [...document.querySelectorAll('button')].find((e) => /在线使用/.test(e.innerText || ''));
  if (!b) return false;
  b.click();
  return true;
})()`);
check('找到“在线使用”按钮', clicked === true);
await sleep(12000);
const play = await browser.evaluate(`(() => ({
  hash: location.hash,
  frame: (document.querySelector('#lesson-frame iframe') || {}).src || '',
}))()`);
check('课件在线打开了', /\/courseware\//.test(play.frame), play.hash + ' ' + play.frame);

/* 4. 下载接口仍然可用（不需要登录） */
const dl = await fetch(`http://localhost:${PORT}/api/downloads/prepare`, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    /* 小白教育那套 POST 门槛：同源 + X-Requested-With: studio */
    origin: `http://localhost:${PORT}`,
    'x-requested-with': 'studio',
  },
  body: JSON.stringify({ productId: 'afe-196' }),
}).then((r) => r.json().catch(() => null));
check('下载接口可用', !!(dl && (dl.url || dl.files || dl.download)), JSON.stringify(dl).slice(0, 160));

await browser.shot('recon/scratch/lq-mode-check.png');
await browser.close();
console.log(failed ? `\n${failed} 项没过。` : '\n全部通过。');
process.exit(failed ? 1 : 0);

