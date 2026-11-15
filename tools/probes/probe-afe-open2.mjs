/* Watch the play page of a chapter course and print what the server says
   when it refuses to open a session. */
import { connect, sleep } from './cdp2.mjs';

const id = process.argv[2] || '1360';
const browser = await connect(9222);
await browser.raw('Network.enable', {}, browser.pageSession).catch(() => {});

await browser.goto(`https://aifunengjiaoyu.com/play/${id}`);
await sleep(8000);

const hits = browser.events.filter(
  (e) => e.method === 'Network.responseReceived' && /reviewed-course-session/.test(e.params.response.url)
);
console.log('session calls:', hits.length);
for (const h of hits) {
  console.log(`  ${h.params.response.status} ${h.params.response.url.slice(0, 140)}`);
  try {
    const body = await browser.raw(
      'Network.getResponseBody',
      { requestId: h.params.requestId },
      h.sessionId
    );
    console.log('    body:', body.body.slice(0, 1500));
  } catch (e) {
    console.log('    body failed:', e.message);
  }
}

const text = await browser.evaluate(`(() => {
  return {
    status: document.getElementById('play-status')?.textContent || '',
    hint: document.getElementById('hint')?.textContent || '',
    buttons: [...document.querySelectorAll('button')].map(b => b.textContent),
    storage: Object.keys(sessionStorage).filter(k => /turing/.test(k)).map(k => k + '=' + sessionStorage.getItem(k)),
  };
})()`);
console.log('\npage:', JSON.stringify(text, null, 1));
await browser.close();
