#!/usr/bin/env node
/* 「本地可用」这一档 */
import { connect, sleep } from './cdp2.mjs';
const PORT = Number(process.env.LQ_PORT || 4173);
const b = await connect(Number(process.env.CDP_PORT || 9226));
await b.goto('http://localhost:' + PORT + '/#catalog');
await sleep(3000);
const tabs = await b.evaluate(`(() => {
  const row = document.querySelector('.download-usage-tabs');
  return row ? [...row.querySelectorAll('button')].map(x => x.textContent.trim()) : null;
})()`);
console.log('可用性筛选档位：', JSON.stringify(tabs));
await b.evaluate(`(() => {
  const row = document.querySelector('.download-usage-tabs');
  const btn = [...row.querySelectorAll('button')].find(x => /本地可用/.test(x.textContent));
  if (btn) btn.click();
  return !!btn;
})()`);
await sleep(1500);
const after = await b.evaluate(`(() => ({
  cards: document.querySelectorAll('#grid .product-card').length,
  states: [...new Set([...document.querySelectorAll('#grid .product-card .card-meta span:last-child')].map(x => x.textContent.trim()))],
}))()`);
console.log('本地可用：', JSON.stringify(after));
await b.shot('recon/scratch/lq-ui-local.png');
// 点开一份待补齐的
await b.evaluate(`(() => {
  const row = document.querySelector('.download-usage-tabs');
  [...row.querySelectorAll('button')].find(x => /全部资源/.test(x.textContent)).click();
})()`);
await sleep(1200);
await b.goto('http://localhost:' + PORT + '/#course/measurement-motion');
await sleep(1500);
const detail = await b.evaluate(`(() => ({
  status: (document.querySelector('.download-status') || {}).textContent,
  button: (document.querySelector('[data-download-action="download"]') || {}).textContent,
  disabled: document.querySelector('[data-download-action="download"]')?.disabled,
}))()`);
console.log('未收录课件的详情页：', JSON.stringify(detail));
await b.shot('recon/scratch/lq-ui-missing.png');
