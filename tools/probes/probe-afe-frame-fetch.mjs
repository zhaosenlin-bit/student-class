/* Fetch a course file from inside the frame that is allowed to read it. */
import { connect, sleep } from './cdp2.mjs';

const id = process.argv[2] || '1016';
const browser = await connect(9222);
await browser.goto(`https://aifunengjiaoyu.com/play/${id}`);
await sleep(9000);

const frames = [...browser.sessions.entries()].filter(([, s]) => s.targetInfo.type === 'iframe');
console.log('frames:', frames.length);
for (const [sid, s] of frames) console.log('  ', sid.slice(0, 10), s.targetInfo.url.slice(0, 130));

for (const [sid] of frames) {
  const expr = `(async () => {
    const base = location.href.replace(/\\/[^/]*$/, '/');
    const res = await fetch(base, { credentials: 'include' });
    const text = res.ok ? await res.text() : '';
    return { status: res.status, len: text.length, head: text.slice(0, 120), base };
  })()`;
  try {
    const out = await browser.evaluateIn(sid, expr);
    console.log(`  -> ${out.status} len=${out.len} ${out.base}`);
    console.log('     ' + out.head.replace(/\s+/g, ' '));
  } catch (e) {
    console.log('  eval failed:', e.message.slice(0, 120));
  }
}

await browser.close();
