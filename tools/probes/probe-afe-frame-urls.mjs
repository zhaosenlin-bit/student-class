/* The frame is its own target. Read the addresses it asked for. */
import { connect, sleep } from './cdp2.mjs';

const id = process.argv[2] || '842';
const browser = await connect(9222);
await browser.raw('Network.enable', {}, browser.pageSession).catch(() => {});
browser.events.length = 0;
await browser.goto(`https://aifunengjiaoyu.com/play/${id}`);
await sleep(8000);

const all = browser.events.filter((e) => e.method === 'Network.responseReceived');
console.log('all responses:', all.length);
const bySession = new Map();
for (const e of all) {
  const list = bySession.get(e.sessionId) || [];
  list.push(e.params.response.url);
  bySession.set(e.sessionId, list);
}
for (const [sid, urls] of bySession) {
  console.log(`\n--- session ${sid.slice(0, 10)} (${urls.length}) ---`);
  for (const u of urls.slice(0, 25)) console.log('  ', u.slice(0, 150));
}

await browser.close();
