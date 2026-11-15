/* Full course request URLs, headers included. */
import { connect, sleep } from './cdp2.mjs';

const id = process.argv[2] || '1360';
const browser = await connect(9222);
browser.events.length = 0;
await browser.goto(`https://aifunengjiaoyu.com/play/${id}`);
await sleep(9000);

const reqs = browser.events
  .filter((e) => e.method === 'Network.requestWillBeSent')
  .filter((e) => /reviewed-course-assets/.test(e.params.request.url));
console.log('course requests:', reqs.length);
const seen = new Set();
for (const e of reqs) {
  const url = e.params.request.url;
  if (seen.has(url)) continue;
  seen.add(url);
  console.log('\nurl:', url);
  console.log('headers:', JSON.stringify(e.params.request.headers));
}

/* Also the responses, to see which ones succeeded. */
const resps = browser.events
  .filter((e) => e.method === 'Network.responseReceived')
  .filter((e) => /reviewed-course-assets/.test(e.params.response.url));
console.log('\nresponses:', resps.length);
for (const e of resps.slice(0, 12)) {
  console.log(`  ${e.params.response.status} ${e.params.response.url.slice(-90)}`);
}

await browser.close();
