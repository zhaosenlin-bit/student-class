/* Watch every target, including the sandboxed frame, for course requests. */
import { connect, sleep } from './cdp2.mjs';

const id = process.argv[2] || '1016';
const browser = await connect(9222);
browser.events.length = 0;
await browser.goto(`https://aifunengjiaoyu.com/play/${id}`);
await sleep(10000);

const seen = new Map();
for (const e of browser.events) {
  if (e.method !== 'Network.requestWillBeSent') continue;
  const url = e.params.request.url;
  if (!/reviewed-course-assets/.test(url)) continue;
  const key = e.sessionId;
  if (!seen.has(key)) seen.set(key, []);
  seen.get(key).push({
    url,
    headers: e.params.request.headers,
    status: e.params.responseStatus,
  });
}
console.log('targets seen:', browser.sessions.size);
for (const [sid, s] of browser.sessions) {
  console.log(`  ${sid.slice(0, 10)} ${s.targetInfo.type} ${s.targetInfo.url.slice(0, 110)}`);
}
for (const [sid, list] of seen) {
  console.log(`\n--- ${sid.slice(0, 10)} (${list.length}) ---`);
  for (const r of list.slice(0, 12)) {
    console.log('  ', r.url.slice(0, 150));
    console.log('      headers:', JSON.stringify(r.headers).slice(0, 300));
  }
}
await browser.close();
