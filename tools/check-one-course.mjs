/*
 * Open one lesson in a fresh tab and ask the page how it is doing.
 *
 * The sweep tool attaches the debugger so that a lesson which watches
 * for it does not freeze.  This one does not, so it shows what a plain
 * browser would see.
 *
 *   node tools/check-one-course.mjs afe-180 --cdp 9226
 */
import fs from 'node:fs';

const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith('--'));
const cdp = Number(
  args.find((a) => a.startsWith('--cdp'))?.split('=')[1] ||
    process.env.CDP_PORT ||
    9222
);
const port = Number(process.env.LQ_PORT || 4173);
const wait = Number(process.env.LQ_WAIT || 9000);

/* --via=cdpx  use the sweep's own client, so the two can be compared */
if (args.includes('--via=cdpx')) {
  const { connect } = await import('./cdpx.mjs');
  const p = await connect(cdp);
  await p.goto(`http://127.0.0.1:${port}/courseware/${id}.html`);
  await new Promise((r) => setTimeout(r, wait));
  const out = await p
    .evaluate(
      `(() => ({ title: document.title, nodes: document.querySelectorAll('*').length }))()`
    )
    .catch((e) => ({ error: e.message }));
  console.log('cdpx ->', JSON.stringify(out));
  await p.close();
  process.exit(0);
}

/* A tab of its own, so a lesson that wedges the renderer cannot take
   the rest of the browser with it. */
const made = await (
  await fetch(`http://127.0.0.1:${cdp}/json/new?about:blank`, { method: 'PUT' })
).json();

/* A client that talks to that one tab, and to nothing else. */
const ws = new WebSocket(made.webSocketDebuggerUrl);
await new Promise((res, rej) => {
  ws.addEventListener('open', res, { once: true });
  ws.addEventListener('error', rej, { once: true });
});
let seq = 0;
const pending = new Map();
ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  if (!msg.id || !pending.has(msg.id)) return;
  const { resolve, reject } = pending.get(msg.id);
  pending.delete(msg.id);
  if (msg.error) reject(new Error(msg.error.message));
  else resolve(msg.result);
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error('timeout ' + method));
      }
    }, 20000);
  });
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (r.exceptionDetails) {
    throw new Error(r.exceptionDetails.exception?.description || 'evaluate failed');
  }
  return r.result.value;
};

const page = { send, evaluate, close: () => ws.close() };
await page.send('Page.enable');
await page.send('Runtime.enable');
if (args.includes('--network')) await page.send('Network.enable');
/* 
 * --debug      turn the debugger on before the page loads
 * --debug-skip turn it on, but let the page run through the pauses
 * --debug-late turn it on after the page has loaded
 */
const debug = args.find((a) => a.startsWith('--debug'));
if (debug) {
  await page.send('Debugger.enable');
  if (debug === '--debug-skip') {
    await page.send('Debugger.setSkipAllPauses', { skip: true });
  }
}
await page.send('Page.navigate', {
  url: `http://127.0.0.1:${port}/courseware/${id}.html`,
});
await new Promise((r) => setTimeout(r, wait));
if (debug === '--debug-late') {
  await page.send('Debugger.enable');
  await page.send('Debugger.setSkipAllPauses', { skip: true });
}

const probe = await page
  .evaluate(
    `(() => ({
       title: document.title,
       nodes: document.querySelectorAll('*').length,
       textLen: (document.body ? document.body.innerText : '').replace(/\\s+/g,' ').trim().length,
       head: (document.body ? document.body.innerText : '').replace(/\\s+/g,' ').trim().slice(0,90),
     }))()`
  )
  .catch((e) => ({ error: e.message }));

console.log(JSON.stringify(probe, null, 2));

try {
  const shot = await page.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(`recon/scratch/probe-${id}.png`, Buffer.from(shot.data, 'base64'));
  console.log('screenshot: recon/scratch/probe-' + id + '.png');
} catch (e) {
  console.log('screenshot failed:', e.message);
}

await page.send('Page.close').catch(() => {});
page.close();
process.exit(0);
