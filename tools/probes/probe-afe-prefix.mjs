/* Ask from inside the site whether the course prefix is still open, and
   show which cookies the browser holds for the domain. */
import { connect, sleep } from './cdp2.mjs';

const prefix = process.argv[2];
const files = (process.argv[3] || 'index.html').split(',');

const browser = await connect(9222);
await browser.goto('https://aifunengjiaoyu.com/');
await sleep(1500);

try {
  const cookies = await browser.raw('Storage.getCookies', {});
  console.log('cookies:');
  for (const c of cookies.cookies || []) {
    if (!/aifunengjiaoyu/.test(c.domain)) continue;
    console.log(`  ${c.name} = ${String(c.value).slice(0, 48)} (${c.domain}${c.path})`);
  }
} catch (e) {
  console.log('cookie read failed:', e.message);
}

const expr = `(async () => {
  const out = [];
  for (const file of ${JSON.stringify(files)}) {
    const url = location.origin + ${JSON.stringify(prefix)} + file;
    const res = await fetch(url, { credentials: 'include' });
    const text = res.ok ? await res.text() : '';
    out.push({ file, status: res.status, len: text.length, head: text.slice(0, 120) });
  }
  return out;
})()`;

console.log(JSON.stringify(await browser.evaluate(expr), null, 1));
await browser.close();
