/*
 * The course document is only readable from inside the frame. Read the
 * frame's own DOM and fetch its siblings from there.
 */
import { connect, sleep } from './cdp2.mjs';

const id = process.argv[2] || '841';
const browser = await connect(9222);
await browser.goto(`https://aifunengjiaoyu.com/play/${id}`);
await sleep(10000);

/* Find the frame target: it is attached as an iframe type. */
let frameSession = '';
for (const [sid, s] of browser.sessions) {
  if (s.targetInfo.type === 'iframe') {
    frameSession = sid;
    console.log('frame target:', sid.slice(0, 10), JSON.stringify(s.targetInfo.url).slice(0, 120));
  }
}

if (!frameSession) {
  /* The frame may live in the same renderer as the page. Look for an
     execution context whose origin is the course address. */
  for (const [key, c] of browser.contexts) {
    if (/reviewed-course-assets/.test(c.url)) {
      console.log('context:', key, c.url.slice(0, 120));
    }
  }
}

/* Read the frame's document through the page's own frame access. */
const viaPage = await browser.evaluate(`(() => {
  const f = document.querySelector('iframe');
  if (!f) return { error: 'no frame' };
  try {
    const doc = f.contentDocument;
    if (!doc) return { error: 'no contentDocument (sandboxed)' };
    return { html: doc.documentElement.outerHTML.slice(0, 400), len: doc.documentElement.outerHTML.length };
  } catch (e) {
    return { error: e.message };
  }
})()`);
console.log('via page:', JSON.stringify(viaPage).slice(0, 400));

await browser.close();
