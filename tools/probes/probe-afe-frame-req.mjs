/* The full request of a course file, headers and cookies included. */
import { connect, sleep } from './cdp2.mjs';

const id = process.argv[2] || '1016';
const browser = await connect(9222);
await browser.goto(`https://aifunengjiaoyu.com/play/${id}`);
await sleep(9000);

const reqs = browser.events
  .filter((e) => e.method === 'Network.requestWillBeSent')
  .filter((e) => /reviewed-course-assets/.test(e.params.request.url));
console.log('course requests:', reqs.length);
for (const e of reqs.slice(0, 3)) {
  console.log('\nurl:', e.params.request.url);
  console.log('headers:', JSON.stringify(e.params.request.headers, null, 1));
}

/* Cookies the browser holds for the site. */
const cookies = await browser.raw('Network.getCookies', { urls: ['https://aifunengjiaoyu.com/'] });
console.log('\ncookies:', cookies.cookies.map((c) => `${c.name}=${String(c.value).slice(0, 24)}`).join(', '));

await browser.close();
