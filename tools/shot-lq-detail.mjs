/* 详情页在三种状态下的样子：本地可用 / 本地未收录 / 精品课。 */
import { connect, sleep } from './cdp2.mjs';

const PORT = Number(process.env.LQ_PORT || 4173);
const CDP = Number(process.env.CDP_PORT || 9226);
const browser = await connect(CDP);

await browser.raw('Emulation.setDeviceMetricsOverride', {
  width: 1600,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
}, browser.pageSession);

const targets = (process.argv[2] || 'mirror,afe-846,measurement-motion')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

for (const id of targets) {
  await browser.goto('http://localhost:' + PORT + '/#course/' + encodeURIComponent(id));
  await sleep(2600);
  const info = await browser.evaluate(`(() => {
    const panel = document.querySelector('.download-panel');
    return {
      id: location.hash,
      heading: (document.querySelector('.download-detail h1') || {}).textContent,
      status: (document.querySelector('.download-status') || {}).textContent?.trim(),
      panelText: panel ? panel.innerText.slice(0, 700) : null,
      buttons: [...document.querySelectorAll('.download-panel button, .download-panel a')]
        .map((b) => ({ t: (b.innerText || '').trim().slice(0, 24), dis: b.disabled || false, cls: b.className })),
    };
  })()`);
  console.log(JSON.stringify(info, null, 1));
  await browser.shot('recon/scratch/lq-detail-' + id.replace(/[^\w-]/g, '_') + '.png');
}

await browser.close();
