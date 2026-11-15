/* The real headers of the frame's request, cookies included. */
import { connect, sleep } from './cdp2.mjs';

const id = process.argv[2] || '841';
const browser = await connect(9222);
browser.events.length = 0;
await browser.goto(`https://aifunengjiaoyu.com/play/${id}`);
await sleep(10000);

const extras = browser.events
  .filter((e) => e.method === 'Network.requestWillBeSentExtraInfo')
  .filter((e) => e.params.headers && Object.keys(e.params.headers).length);
console.log('extra infos:', extras.length);
for (const e of extras.slice(0, 12)) {
  console.log('\n  headers:', JSON.stringify(e.params.headers));
}

/* Match them to the course requests. */
const reqs = browser.events
  .filter((e) => e.method === 'Network.requestWillBeSent')
  .filter((e) => /reviewed-course-assets/.test(e.params.request.url));
const byId = new Map(reqs.map((e) => [e.params.requestId, e.params.request.url]));
console.log('\n--- matched ---');
for (const e of extras) {
  const url = byId.get(e.params.requestId);
  if (!url) continue;
  console.log('\nurl:', url.slice(-70));
  console.log('  headers:', JSON.stringify(e.params.headers));
}

await browser.close();
