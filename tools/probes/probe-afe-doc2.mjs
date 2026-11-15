/* Find a working way to read a course document byte for byte. */
import fs from 'node:fs';
import { connect, sleep } from './cdp2.mjs';

const ORIGIN = 'https://aifunengjiaoyu.com';
const TOKEN = fs.readFileSync('recon/scratch/afe-token.txt', 'utf8').trim();
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const SID = 'e547484ae39c1c50abdb4d69dde927f3b3375f6d79b0461c';

const post = async (route, body) => {
  const res = await fetch(ORIGIN + route, {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
      Origin: ORIGIN,
      Referer: `${ORIGIN}/`,
    },
    body: JSON.stringify(body),
  });
  return res.json().catch(() => null);
};

const mounted = await post(`/api/reviewed-course-session/session/${SID}/mount`, { entry: 'atlas' });
const url = ORIGIN + mounted.prefix + 'index.html';
console.log('url:', url);

const browser = await connect(9222);
await browser.goto(ORIGIN + '/');
await sleep(1200);

await browser.evaluate(`(() => {
  const frame = document.createElement('iframe');
  frame.setAttribute('sandbox', 'allow-scripts');
  frame.style.cssText = 'width:1200px;height:800px;border:0';
  document.body.append(frame);
  window.__f = frame;
  frame.src = ${JSON.stringify(url)};
  return true;
})()`);
await sleep(7000);

const frameEntry = [...browser.sessions.entries()]
  .reverse()
  .find(([, s]) => s.targetInfo.type === 'iframe');
console.log('frame target:', frameEntry?.[1]?.targetInfo?.url?.slice(0, 80));
const [frameSession] = frameEntry || [];

/* A: the network body of the document */
const docEvents = browser.events.filter(
  (e) => e.method === 'Network.responseReceived' && e.params.response.url === url
);
console.log('doc network events:', docEvents.length);
for (const e of docEvents) {
  try {
    const body = await browser.raw(
      'Network.getResponseBody',
      { requestId: e.params.requestId },
      e.sessionId
    );
    console.log(`  parent session ${e.sessionId.slice(0, 8)} len=${body.body.length}`);
  } catch (err) {
    console.log(`  parent session ${e.sessionId.slice(0, 8)} failed: ${err.message}`);
  }
}

/* B: the document as the frame sees it */
const outer = await browser.evaluateIn(
  frameSession,
  `document.documentElement.outerHTML`
);
console.log('outerHTML len:', outer.length);
console.log('head:', outer.slice(0, 400).replace(/\s+/g, ' '));

/* C: the resource the frame tree keeps */
try {
  const tree = await browser.raw('Page.getFrameTree', {}, frameSession);
  const frameId = tree.frameTree.frame.id;
  const resource = await browser.raw(
    'Page.getResourceContent',
    { frameId, url },
    frameSession
  );
  console.log('getResourceContent len:', resource.content.length);
  console.log('head:', resource.content.slice(0, 300).replace(/\s+/g, ' '));
} catch (err) {
  console.log('getResourceContent failed:', err.message);
}

/* D: the frame fetching its own address */
try {
  const text = await browser.evaluateIn(
    frameSession,
    `(async () => {
      const res = await fetch(location.href, { credentials: 'include' });
      const body = await res.text();
      return { status: res.status, len: body.length, head: body.slice(0, 300) };
    })()`
  );
  console.log('frame fetch:', JSON.stringify(text));
} catch (err) {
  console.log('frame fetch failed:', err.message);
}

await browser.close();
