#!/usr/bin/env node
/* Look at the catalogue the way a visitor sees it. */
import { connect, sleep } from './cdp2.mjs';

const PORT = Number(process.env.LQ_PORT || 4173);
const CDP = Number(process.env.CDP_PORT || 9226);
const browser = await connect(CDP);

await browser.goto('http://localhost:' + PORT + '/#catalog');
await sleep(3500);

const state = await browser.evaluate(`(() => {
  const subjectRow = document.querySelector('.download-subject-options');
  const more = document.querySelector('.download-subject-more');
  const loginBits = [...document.querySelectorAll('button,a')]
    .filter((e) => /登录|注册|退出登录|绑定手机号/.test(e.textContent || ''))
    .map((e) => e.textContent.trim());
  const feedbackBits = [...document.querySelectorAll('button,a,section')]
    .filter((e) => /反馈/.test(e.textContent || '') || /feedback/.test(e.className || ''))
    .map((e) => (e.textContent || '').trim().slice(0, 40));
  return {
    hash: location.hash,
    cards: document.querySelectorAll('#grid .product-card').length,
    subjectChips: subjectRow ? subjectRow.querySelectorAll('button').length : 0,
    moreLabel: more ? more.querySelector('summary').textContent.trim() : null,
    extraChips: more ? more.querySelectorAll('button').length : 0,
    loginBits,
    feedbackBits,
    accountHidden: (document.querySelector('#account') || {}).hidden,
    accountText: (document.querySelector('#account') || {}).textContent,
  };
})()`);
console.log(JSON.stringify(state, null, 1));
await browser.shot('recon/scratch/lq-ui-catalog.png');
console.log('recon/scratch/lq-ui-catalog.png');
await browser.close();
