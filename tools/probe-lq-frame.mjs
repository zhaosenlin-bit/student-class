/* Open a page and report what the console said and what the frames hold. */
import { connect, sleep } from './cdp2.mjs';

const url = process.argv[2];
const wait = Number(process.argv[3] || 9000);

const browser = await connect(9222);
await browser.goto(url);
await sleep(wait);
const logs = browser.events
  .filter((e) => e.method === 'Runtime.consoleAPICalled' || e.method === 'Runtime.exceptionThrown')
  .map((e) => {
    if (e.method === 'Runtime.exceptionThrown') {
      const d = e.params.exceptionDetails;
      return `EXC ${d.text} ${d.exception?.description || ''}`.slice(0, 400);
    }
    return `LOG ${e.params.type} ${(e.params.args || []).map((a) => a.value ?? a.description ?? '').join(' ')}`.slice(0, 400);
  });
console.log(logs.slice(0, 25).join('\n'));

const out = await browser.evaluate(`(() => {
  const frame = document.getElementById('frame');
  const doc = frame && frame.contentDocument;
  return {
    frameSrc: frame ? frame.getAttribute('src') : null,
    innerLen: doc ? doc.body ? doc.body.innerHTML.length : 0 : 0,
    adapter: doc && doc.body ? doc.body.dataset.courseAdapterState : null,
    notice: doc ? [...doc.querySelectorAll('aside[role="status"]')].map(n => ({hidden: n.hidden, text: n.innerText.replace(/\\s+/g,' ').slice(0,140)})) : [],
    select: document.getElementById('chapter') ? document.getElementById('chapter').value : null,
  };
})()`);
console.log(JSON.stringify(out, null, 1));
await browser.close();
