/* What makes the frame's request work? Try the shapes one by one. */
import { connect, sleep } from './cdp2.mjs';

const id = process.argv[2] || '1016';
const browser = await connect(9222);
await browser.goto(`https://aifunengjiaoyu.com/play/${id}`);
await sleep(9000);

const expr = `(async () => {
  const frame = document.querySelector('iframe');
  if (!frame) return { error: 'no frame' };
  const base = frame.src.replace(/\\/[^/]*$/, '/');
  const out = { base, tries: [] };
  const attempts = [
    ['same-origin', { credentials: 'same-origin' }],
    ['omit', { credentials: 'omit' }],
    ['include', { credentials: 'include' }],
    ['no-credentials', {}],
  ];
  for (const [name, opts] of attempts) {
    try {
      const res = await fetch(base, opts);
      const text = res.ok ? await res.text() : '';
      out.tries.push({ name, status: res.status, len: text.length });
    } catch (e) {
      out.tries.push({ name, error: e.message });
    }
  }
  return out;
})()`;

const out = await browser.evaluate(expr);
console.log(JSON.stringify(out, null, 1));
await browser.close();
