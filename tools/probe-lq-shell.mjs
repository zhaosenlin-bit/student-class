/*
 * Open a course the way a visitor does — through the site shell — and
 * report what the frame ended up showing.
 */
import { connect, sleep } from './cdp2.mjs';

const PORT = Number(process.env.LQ_PORT || 4173);
const CDP_PORT = Number(process.env.LQ_CDP_PORT || 9222);
const id = process.argv[2];
const wait = Number(process.argv[3] || 12000);

const browser = await connect(CDP_PORT);
await browser.raw('Network.enable', {}, browser.pageSession).catch(() => {});
await browser.goto(`http://localhost:${PORT}/#course/${id}`);
await sleep(1500);
const clicked = await browser.evaluate(`(() => {
  const b = [...document.querySelectorAll('button')].find((e) => /在线使用/.test(e.innerText || ''));
  if (!b) return false;
  b.click();
  return true;
})()`);
console.log('clicked:', clicked);
await sleep(wait);

const shell = await browser.evaluate(`(() => ({
  hash: location.hash,
  loading: (document.querySelector('#lesson-loading') || {}).hidden,
  frameSrc: (document.querySelector('#lesson-frame iframe') || {}).src || '',
}))()`);
console.log('shell:', JSON.stringify(shell));

const src = shell.frameSrc;
if (src) {
  const wanted = new URL(src, `http://localhost:${PORT}`).href;
  console.log('targets:');
  for (const [sessionId, info] of browser.sessions) {
    console.log('  ', sessionId.slice(0, 8), info.targetInfo?.type, info.targetInfo?.url);
  }
  for (const [sessionId, info] of browser.sessions) {
    if (info.targetInfo?.type !== 'iframe') continue;
    try {
      const probe = await browser.evaluateIn(
        sessionId,
        `(() => ({
           url: location.href,
           title: document.title,
           bodyLen: document.body ? document.body.innerHTML.length : 0,
           text: (document.body ? document.body.innerText : '').replace(/\\s+/g,' ').slice(0,160),
           canvases: [...document.querySelectorAll('canvas')].map(c=>c.width+'x'+c.height),
           scripts: document.querySelectorAll('script').length,
         }))()`
      );
      console.log('frame:', JSON.stringify(probe, null, 1));
      console.log('target url:', info.targetInfo?.url, '| wanted:', wanted);
    } catch (e) {
      console.log('frame read failed:', e.message);
    }
  }
}

const bad = browser.events
  .filter((e) => e.method === 'Network.responseReceived' && e.params.response.status >= 400)
  .map((e) => `${e.params.response.status} ${e.params.response.url}`);
console.log('failed requests:', [...new Set(bad)].join('\n  ') || '(none)');
await browser.shot(`recon/scratch/shell-${id}.png`);
await browser.close();
