/* Open a local course straight away and report what the page complained
   about: console errors, failed requests, and what the canvas ended up
   showing. */
import { connect, sleep } from './cdp2.mjs';

const PORT = Number(process.env.LQ_PORT || 4173);
const CDP_PORT = Number(process.env.LQ_CDP_PORT || 9222);
const id = process.argv[2];
const wait = Number(process.argv[3] || 15000);

const browser = await connect(CDP_PORT);
await browser.raw('Network.enable', {}, browser.pageSession).catch(() => {});
await browser.raw('Log.enable', {}, browser.pageSession).catch(() => {});
await browser.goto(`http://localhost:${PORT}/courseware/${id}?local=1`);
await sleep(wait);

const seen = new Set();
for (const e of browser.events) {
  if (e.method === 'Network.loadingFailed' && !seen.has('f' + e.params.errorText)) {
    seen.add('f' + e.params.errorText);
    console.log('loading failed:', e.params.errorText, e.params.type, e.params.requestId);
  }
  if (e.method === 'Network.responseReceived' && e.params.response.status >= 400) {
    const key = e.params.response.status + e.params.response.url;
    if (!seen.has(key)) {
      seen.add(key);
      console.log('http', e.params.response.status, e.params.response.url);
    }
  }
}

const state = await browser.evaluate(`(() => {
  const canvas = document.querySelector('canvas');
  let painted = null;
  try {
    const gl = canvas && (canvas.getContext('webgl2') || canvas.getContext('webgl'));
    painted = gl ? 'webgl-context-ok' : 'no-webgl';
  } catch (e) { painted = 'ctx-error'; }
  return {
    title: document.title,
    bodyText: (document.body.innerText || '').slice(0, 400),
    canvas: canvas ? canvas.width + 'x' + canvas.height : 'none',
    painted,
    scripts: [...document.querySelectorAll('script')].map((s) => s.src || 'inline').slice(0, 20),
  };
})()`);
console.log(JSON.stringify(state, null, 1));
await browser.shot(`recon/scratch/console-${id}.png`);
await browser.close();
