/* Attach to the course frame once it shows up and fetch from inside it. */
import { connect, sleep } from './cdp2.mjs';

const id = process.argv[2] || '1016';
const browser = await connect(9222);
await browser.goto(`https://aifunengjiaoyu.com/play/${id}`);

let frameSession = '';
for (let i = 0; i < 30; i++) {
  await sleep(1000);
  const found = [...browser.sessions.entries()].filter(([, s]) => s.targetInfo.type === 'iframe');
  if (found.length) {
    frameSession = found[found.length - 1][0];
    console.log('frame attached:', frameSession.slice(0, 10), found[found.length - 1][1].targetInfo.url.slice(0, 120));
    break;
  }
}

if (!frameSession) {
  console.log('no frame target');
} else {
  const expr = `(async () => {
    const base = location.href.replace(/\\/[^/]*$/, '/');
    const out = { base, tries: [] };
    for (const [name, opts] of [
      ['same-origin', { credentials: 'same-origin' }],
      ['omit', { credentials: 'omit' }],
      ['include', { credentials: 'include' }],
    ]) {
      try {
        const res = await fetch(base, opts);
        const text = res.ok ? await res.text() : '';
        out.tries.push({ name, status: res.status, len: text.length, head: text.slice(0, 100) });
      } catch (e) {
        out.tries.push({ name, error: e.message });
      }
    }
    return out;
  })()`;
  try {
    const out = await browser.evaluateIn(frameSession, expr);
    console.log(JSON.stringify(out, null, 1));
  } catch (e) {
    console.log('eval failed:', e.message.slice(0, 200));
  }
}

await browser.close();
