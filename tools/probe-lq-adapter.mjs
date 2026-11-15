/* Watch how the course runtime reports itself while a chapter loads. */
import { connect, sleep } from './cdp2.mjs';

const url = process.argv[2];
const wait = Number(process.argv[3] || 16000);

const browser = await connect(9222);
await browser.goto(url);
await sleep(1500);
await browser.evaluate(`(() => {
  window.__states = [];
  const frame = document.getElementById('frame');
  if (!frame) return;
  const watch = () => {
    const doc = frame.contentDocument;
    if (!doc || !doc.body) return;
    const push = () => {
      const value = doc.body.dataset.courseAdapterState || '';
      if (window.__states[window.__states.length - 1] !== value) {
        window.__states.push(value);
      }
    };
    push();
    new MutationObserver(push).observe(doc.body, { attributes: true, attributeFilter: ['data-course-adapter-state'] });
  };
  frame.addEventListener('load', watch);
  watch();
  setInterval(watch, 300);
})()`);
await sleep(wait);
const out = await browser.evaluate(`(() => {
  const frame = document.getElementById('frame');
  const doc = frame && frame.contentDocument;
  return {
    states: window.__states,
    notice: doc ? [...doc.querySelectorAll('aside[role="status"]')].map(n => ({hidden: n.hidden, text: n.innerText.replace(/\\s+/g,' ').slice(0,140)})) : [],
    saved: Object.keys(localStorage).filter(k => /turing|course\\.runtime/.test(k)).map(k => k + '=' + String(localStorage.getItem(k)).slice(0,140)),
  };
})()`);
console.log(JSON.stringify(out, null, 1));
const logs = browser.events
  .filter((e) => e.method === 'Runtime.consoleAPICalled' || e.method === 'Runtime.exceptionThrown')
  .map((e) => (e.method === 'Runtime.exceptionThrown'
    ? 'EXC ' + e.params.exceptionDetails.text + ' ' + (e.params.exceptionDetails.exception?.description || '')
    : 'LOG ' + e.params.type + ' ' + (e.params.args || []).map((a) => a.value ?? a.description ?? '').join(' ')))
  .filter((t) => !/版权声明|受版权保护/.test(t));
console.log(logs.slice(0, 15).join('\n').slice(0, 2000));
await browser.close();
