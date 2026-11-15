/* Every cookie the browser holds for the site, HttpOnly included. */
import { connect, sleep } from './cdp2.mjs';

const browser = await connect(9222);
await browser.raw('Network.enable', {}, browser.pageSession).catch(() => {});
await browser.goto('https://aifunengjiaoyu.com/');
await sleep(1500);
const res = await browser.raw('Network.getCookies', { urls: ['https://aifunengjiaoyu.com/'] }, browser.pageSession);
for (const c of res.cookies) {
  console.log(`${c.name} domain=${c.domain} httpOnly=${c.httpOnly} len=${c.value.length}`);
}
await browser.close();
