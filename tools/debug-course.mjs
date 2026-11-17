#!/usr/bin/env node
/*
 * Open one course and report what went wrong inside it: console messages,
 * requests that failed, and what the document ended up showing.
 *
 *   node tools/debug-course.mjs afe-1387 [waitMs]
 */
import { connect, sleep } from './cdp2.mjs';

const PORT = Number(process.env.LQ_PORT || 4173);
const id = process.argv[2];
const wait = Number(process.argv[3] || 12000);

const browser = await connect(9222);
await browser.raw('Runtime.enable', {}, browser.pageSession).catch(() => {});
await browser.raw('Log.enable', {}, browser.pageSession).catch(() => {});
await browser.raw('Network.enable', {}, browser.pageSession).catch(() => {});

await browser.goto(`http://localhost:${PORT}/courseware/${id}.html`);
await sleep(wait);

const console_ = browser.events
  .filter((e) => e.method === 'Runtime.consoleAPICalled')
  .map((e) =>
    e.params.type +
      ': ' +
      (e.params.args || [])
        .map((a) => a.value ?? a.description ?? a.unserializableValue ?? '')
        .join(' ')
  );
const exceptions = browser.events
  .filter((e) => e.method === 'Runtime.exceptionThrown')
  .map((e) => e.params.exceptionDetails?.exception?.description || e.params.exceptionDetails?.text);
const failed = browser.events
  .filter((e) => e.method === 'Network.responseReceived')
  .filter((e) => e.params.response.status >= 400)
  .map((e) => `${e.params.response.status} ${e.params.response.url}`);
const logEntries = browser.events
  .filter((e) => e.method === 'Log.entryAdded')
  .map((e) => `${e.params.entry.level} ${e.params.entry.text} ${e.params.entry.url || ''}`);

console.log('控制台:');
for (const c of console_.slice(0, 30)) console.log('  ' + c);
console.log('异常:');
for (const c of exceptions.slice(0, 15)) console.log('  ' + c);
console.log('日志:');
for (const c of logEntries.slice(0, 20)) console.log('  ' + c);
console.log('失败请求:');
for (const c of failed.slice(0, 30)) console.log('  ' + c);

const state = await browser.evaluate(`(() => ({
  url: location.href,
  title: document.title,
  bodyLen: (document.body?.innerText || '').length,
  bodyHead: (document.body?.innerText || '').slice(0, 300),
  appChildren: document.getElementById('app')?.childElementCount ?? -1,
  frames: [...document.querySelectorAll('iframe')].map((f) => f.src),
  scripts: [...document.querySelectorAll('script[src]')].map((s) => s.src),
}))()`);
console.log('\n页面状态:', JSON.stringify(state, null, 1));

/* Look inside the course frame. */
const frameEntry = [...browser.sessions.entries()]
  .reverse()
  .find(([, s]) => s.targetInfo.type === 'iframe');
if (frameEntry) {
  const [frameSession] = frameEntry;
  const inner = await browser
    .evaluateIn(
      frameSession,
      `(() => ({
         url: location.href,
         title: document.title,
         bodyLen: (document.body?.innerText || '').length,
         bodyHead: (document.body?.innerText || '').slice(0, 400),
         app: document.getElementById('app')?.childElementCount ?? -1,
         html: (document.body?.innerHTML || '').slice(0, 400),
       }))()`
    )
    .catch((e) => ({ err: String(e) }));
  console.log('\n课件框状态:', JSON.stringify(inner, null, 1));
}

/* A same-origin frame can also be read straight from the page. */
const innerFromPage = await browser
  .evaluate(`(() => {
    const f = document.querySelector('iframe');
    if (!f) return { err: 'no iframe' };
    try {
      const d = f.contentDocument;
      return {
        url: f.contentWindow.location.href,
        ready: d.readyState,
        bodyLen: (d.body?.innerText || '').length,
        bodyHead: (d.body?.innerText || '').slice(0, 400),
        app: d.getElementById('app')?.childElementCount ?? -1,
        html: (d.body?.innerHTML || '').slice(0, 300),
        scripts: [...d.querySelectorAll('script[src]')].map((s) => s.src),
      };
    } catch (e) {
      return { err: String(e) };
    }
  })()`)
  .catch((e) => ({ err: String(e) }));
console.log('\n课件框（同源读取）:', JSON.stringify(innerFromPage, null, 1));

await browser.shot(`recon/scratch/debug-${id}.png`);
await browser.close();

