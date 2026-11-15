#!/usr/bin/env node
/*
 * 把读者真正会走的那条路走一遍并各截一张：
 * 课件库 → 课件详情 → 在线预览 → 下载。
 *
 *   node tools\shot-lq-flow.mjs afe-831
 */
import { connect, sleep } from './cdp2.mjs';

const PORT = Number(process.env.LQ_PORT || 4173);
const CDP = Number(process.env.CDP_PORT || 9226);
const id = process.argv[2] || 'afe-831';
const tag = process.argv[3] || 'flow';
const mobile = process.argv.includes('--mobile');

const browser = await connect(CDP);
await browser.raw(
  'Emulation.setDeviceMetricsOverride',
  mobile
    ? { width: 414, height: 900, deviceScaleFactor: 2, mobile: true }
    : { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false },
  browser.pageSession
);

await browser.goto(`http://localhost:${PORT}/#course/${encodeURIComponent(id)}`);
await sleep(2500);
await browser.shot(`recon/scratch/${tag}-1-detail.png`);

const opened = await browser.evaluate(`(() => {
  const b = document.querySelector('[data-lq-preview]');
  if (!b) return false;
  b.click();
  return true;
})()`);
console.log('preview clicked:', opened);
await sleep(9000);
await browser.shot(`recon/scratch/${tag}-2-preview.png`);

const downloaded = await browser.evaluate(`(() => {
  const b = document.querySelector('[data-download-action="download"]');
  if (!b) return false;
  b.click();
  return true;
})()`);
console.log('download clicked:', downloaded);
await sleep(3500);
await browser.shot(`recon/scratch/${tag}-3-download.png`);

const dialog = await browser.evaluate(`(() => {
  const d = document.querySelector('#dialog');
  return d ? d.innerText.replace(/\\s+/g, ' ').slice(0, 400) : null;
})()`);
console.log('dialog:', dialog);

await browser.close();
