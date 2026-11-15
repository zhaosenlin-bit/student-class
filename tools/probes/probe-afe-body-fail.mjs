/* Why does the main document's body refuse to be read? */
import { connect, sleep } from './cdp2.mjs';

const id = process.argv[2] || '841';
const browser = await connect(9222);
browser.events.length = 0;
await browser.goto(`https://aifunengjiaoyu.com/play/${id}`);
await sleep(10000);

const responses = browser.events
  .filter((e) => e.method === 'Network.responseReceived')
  .filter((e) => /reviewed-course-assets/.test(e.params.response.url));
for (const e of responses) {
  const url = e.params.response.url;
  const isDoc = /\/index\.html(\?|$)/.test(url);
  if (!isDoc) continue;
  console.log('doc response:', e.params.response.status, e.params.response.mimeType);
  console.log('  session:', e.sessionId.slice(0, 10), 'requestId:', e.params.requestId);
  for (const [label, sessionId] of [
    ['own', e.sessionId],
    ['page', browser.pageSession],
  ]) {
    try {
      const body = await browser.raw(
        'Network.getResponseBody',
        { requestId: e.params.requestId },
        sessionId
      );
      console.log(`  ${label}: len=${body.body.length}`);
    } catch (err) {
      console.log(`  ${label}: ${err.message.slice(0, 60)}`);
    }
  }
  /* Loading the document again through the frame gives a fresh response
     that can still be read. */
  const again = await browser.evaluate(`(async () => {
    const f = document.querySelector('iframe');
    if (!f) return { error: 'no frame' };
    const res = await fetch(f.src, { credentials: 'include' });
    const text = res.ok ? await res.text() : '';
    return { status: res.status, len: text.length, head: text.slice(0, 120) };
  })()`);
  console.log('  refetch in page:', JSON.stringify(again));
}

await browser.close();
