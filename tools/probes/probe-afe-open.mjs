/* Open a chapter-course session straight from the site and print the raw
   answer, so the refusal can be read. */
import { connect, sleep } from './cdp2.mjs';

const programId = Number(process.argv[2] || 1360);
const requestId =
  process.argv[3] ||
  Array.from(crypto.getRandomValues(new Uint8Array(24)), (v) =>
    v.toString(16).padStart(2, '0')
  ).join('');

const browser = await connect(9222);
await browser.goto('https://aifunengjiaoyu.com/');
await sleep(1500);

const expr = `(async () => {
  const token = localStorage.getItem('aiedu_token');
  const res = await fetch('/api/reviewed-course-session/${programId}/open', {
    method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ requestId: '${requestId}' }),
  });
  const text = await res.text();
  return { status: res.status, body: text.slice(0, 3000) };
})()`;

console.log(JSON.stringify(await browser.evaluate(expr), null, 1));
await browser.close();
