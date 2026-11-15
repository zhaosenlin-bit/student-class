/* Read the session response body and the frame's own requests. */
import { connect, sleep } from './cdp2.mjs';

const browser = await connect(9222);
await browser.raw('Network.enable', {}, browser.pageSession).catch(() => {});
await browser.goto('https://aifunengjiaoyu.com/play/1360');
await sleep(6000);

const responses = browser.events
  .filter((e) => e.method === 'Network.responseReceived')
  .map((e) => ({
    url: e.params.response.url,
    requestId: e.params.requestId,
    sessionId: e.sessionId,
    type: e.params.type,
  }));
console.log('page responses:', responses.length);
for (const r of responses) console.log(`  [${r.sessionId}] ${r.url.slice(0, 120)}`);

const session = responses.find((r) => r.url.includes('/reviewed-course-session/'));
if (session) {
  try {
    const body = await browser.raw(
      'Network.getResponseBody',
      { requestId: session.requestId },
      session.sessionId
    );
    const data = JSON.parse(body.body);
    console.log('\nsession id:', data.id, 'adapter:', data.adapter);
    console.log('entries:', data.descriptor.entries.length);
    for (const e of data.descriptor.entries) {
      console.log(`  ${e.id} ${e.path} scripts=${(e.scripts || []).map((s) => s.path).join(',')}`);
    }
    console.log('allowed:', JSON.stringify(data.allowedEntryIds));
  } catch (e) {
    console.log('body read failed:', e.message);
  }
}

/* The frame is its own target; look at what it asked for. */
for (const [sessionId, s] of browser.sessions) {
  if (s.targetInfo.type === 'iframe') {
    console.log('\nframe target:', s.targetInfo.url.slice(0, 140));
    const events = browser.events.filter((e) => e.sessionId === sessionId);
    console.log('frame events:', events.length);
  }
}

await browser.close();
