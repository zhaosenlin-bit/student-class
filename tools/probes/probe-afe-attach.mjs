/* Does the course frame attach as its own target? */
import { connect, sleep } from './cdp2.mjs';

const id = process.argv[2] || '841';
const browser = await connect(9222);
await browser.goto(`https://aifunengjiaoyu.com/play/${id}`);
await sleep(10000);

const frames = [...browser.sessions.entries()].filter(([, s]) => s.targetInfo.type === 'iframe');
console.log('sessions:', browser.sessions.size, 'iframes:', frames.length);
for (const [sid, s] of browser.sessions) {
  console.log(`  ${sid.slice(0, 10)} ${s.targetInfo.type} ${JSON.stringify(s.targetInfo.url).slice(0, 110)}`);
}

for (const [sid] of frames) {
  const expr = `(async () => {
    const res = await fetch(location.href, { credentials: 'include' });
    const text = res.ok ? await res.text() : '';
    return { status: res.status, len: text.length, href: location.href };
  })()`;
  try {
    const out = await browser.evaluateIn(sid, expr);
    console.log('in-frame fetch:', JSON.stringify(out).slice(0, 200));
  } catch (e) {
    console.log('in-frame eval failed:', e.message.slice(0, 140));
  }
}

await browser.close();
