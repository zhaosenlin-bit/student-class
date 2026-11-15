/* Read the course files out of the frame's own responses. */
import { connect, sleep } from './cdp2.mjs';

const id = process.argv[2] || '841';
const browser = await connect(9222);
browser.events.length = 0;
await browser.goto(`https://aifunengjiaoyu.com/play/${id}`);
await sleep(10000);

const responses = browser.events
  .filter((e) => e.method === 'Network.responseReceived')
  .filter((e) => /reviewed-course-assets/.test(e.params.response.url))
  .map((e) => ({
    url: e.params.response.url,
    requestId: e.params.requestId,
    sessionId: e.sessionId,
    status: e.params.response.status,
  }));
console.log('course responses:', responses.length);
for (const r of responses) {
  try {
    const body = await browser.raw('Network.getResponseBody', { requestId: r.requestId }, r.sessionId);
    console.log(`  ${r.status} len=${body.body.length} b64=${body.base64Encoded} ${r.url.slice(-70)}`);
  } catch (e) {
    console.log(`  ${r.status} FAIL ${e.message.slice(0, 60)}`);
  }
}
await browser.close();
