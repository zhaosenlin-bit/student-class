/* The cookies the browser holds for the site. */
import { connect, sleep } from './cdp2.mjs';

const browser = await connect(9222);
await browser.goto('https://aifunengjiaoyu.com/');
await sleep(1500);
const res = await browser.raw('Storage.getCookies', {}, browser.pageSession);
console.log(
  res.cookies
    .filter((c) => /aifunengjiaoyu/.test(c.domain))
    .map((c) => `${c.name} (${c.domain}) len=${c.value.length}`)
    .join('\n')
);
await browser.close();
