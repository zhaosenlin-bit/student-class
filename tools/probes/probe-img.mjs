import { connect, sleep } from './cdpx.mjs';

const url = process.argv[2];
const p = await connect(9222);
await p.goto('about:blank');
const res = await p.send('Network.setCacheDisabled', { cacheDisabled: true });
const r = await p.evaluate(`(async () => {
  const target = ${JSON.stringify(url)};
  try {
    const res = await fetch(target);
    const buf = await res.arrayBuffer();
    return { status: res.status, type: res.headers.get('content-type'), size: buf.byteLength };
  } catch (e) { return { error: String(e && e.message || e) }; }
})()`);
console.log(JSON.stringify(r));
await p.close();
