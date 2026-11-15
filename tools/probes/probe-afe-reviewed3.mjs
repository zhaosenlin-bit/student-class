/* Watch a chapter course open: session response, frame requests, asset reachability. */
import { connect, sleep } from './cdp2.mjs';

const id = process.argv[2] || '842';
const browser = await connect(9222);
await browser.raw('Network.enable', {}, browser.pageSession).catch(() => {});

await browser.goto(`https://aifunengjiaoyu.com/play/${id}`);
await sleep(7000);

const responses = browser.events
  .filter((e) => e.method === 'Network.responseReceived')
  .map((e) => ({
    url: e.params.response.url,
    requestId: e.params.requestId,
    sessionId: e.sessionId,
    status: e.params.response.status,
  }));
console.log('responses:', responses.length);
for (const r of responses) console.log(`  [${r.sessionId.slice(0, 8)}] ${r.status} ${r.url.slice(0, 120)}`);

const session = responses.find((r) => r.url.includes('/reviewed-course-session/'));
if (session) {
  try {
    const body = await browser.raw(
      'Network.getResponseBody',
      { requestId: session.requestId },
      session.sessionId
    );
    const data = JSON.parse(body.body);
    console.log('\n=== session ===');
    console.log('id:', data.id, 'adapter:', data.adapter, 'error:', data.error);
    console.log('allowed:', JSON.stringify(data.allowedEntryIds));
    if (data.descriptor) {
      for (const e of data.descriptor.entries) {
        console.log(`  ${e.id} | ${e.path} | scripts=${(e.scripts || []).map((s) => s.path).join(' , ')}`);
      }
      console.log('binding:', JSON.stringify(data.binding).slice(0, 200));
    }
  } catch (e) {
    console.log('body failed:', e.message);
  }
}

/* What the frame itself loaded. */
const frame = browser.evaluate(`(() => {
  const f = document.querySelector('iframe');
  return { src: f ? f.src : '', title: document.title };
})()`);
console.log('\nframe:', frame.src?.slice(0, 160));

await browser.close();
