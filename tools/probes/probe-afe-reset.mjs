/* Try the page's own "start over" button, which clears the pending launch
   and asks for a fresh session. */
import { connect, sleep } from './cdp2.mjs';

const id = process.argv[2] || '1360';
const browser = await connect(9222);
await browser.raw('Network.enable', {}, browser.pageSession).catch(() => {});

await browser.goto(`https://aifunengjiaoyu.com/play/${id}`);
await sleep(6000);

const before = await browser.evaluate(
  `Object.keys(sessionStorage).filter(k => /turing/.test(k)).map(k => k + '=' + sessionStorage.getItem(k))`
);
console.log('before:', before);

await browser.evaluate(`(() => {
  const button = [...document.querySelectorAll('button')].find(b => /重新开始/.test(b.textContent));
  if (!button) return false;
  button.click();
  return true;
})()`);
await sleep(9000);

const hits = browser.events.filter(
  (e) => e.method === 'Network.responseReceived' && /reviewed-course-session/.test(e.params.response.url)
);
for (const h of hits) {
  console.log(`  ${h.params.response.status} ${h.params.response.url.slice(0, 140)}`);
  try {
    const body = await browser.raw(
      'Network.getResponseBody',
      { requestId: h.params.requestId },
      h.sessionId
    );
    console.log('    body:', body.body.slice(0, 900));
  } catch (e) {
    console.log('    body failed:', e.message);
  }
}

const after = await browser.evaluate(
  `Object.keys(sessionStorage).filter(k => /turing/.test(k)).map(k => k + '=' + sessionStorage.getItem(k))`
);
console.log('after:', after);
const status = await browser.evaluate(
  `document.getElementById('play-status')?.textContent + ' | ' + document.getElementById('hint')?.textContent`
);
console.log('page:', status);
await browser.close();
