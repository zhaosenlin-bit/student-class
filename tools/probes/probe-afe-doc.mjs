/* The course documents are the last piece: they only open in a browser.
   Try a top level page and a frame, then read the document out. */
import fs from 'node:fs';
import { connect, sleep } from './cdp2.mjs';

const ORIGIN = 'https://aifunengjiaoyu.com';
const TOKEN = fs.readFileSync('recon/scratch/afe-token.txt', 'utf8').trim();
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const SID = process.argv[2] || 'e547484ae39c1c50abdb4d69dde927f3b3375f6d79b0461c';
const PROGRAM = Number(process.argv[3] || 841);

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

const resumed = await post(`/api/reviewed-course-session/session/${SID}/resume`, {
  programId: PROGRAM,
});
const entries = resumed.descriptor.entries;
console.log('entries:', entries.map((e) => `${e.id}=${e.path}`).join(' '));

const browser = await connect(9222);
await browser.goto(ORIGIN + '/');
await sleep(1000);

for (const entry of entries.slice(0, 3)) {
  const mounted = await post(`/api/reviewed-course-session/session/${SID}/mount`, {
    entry: entry.id,
  });
  const url = ORIGIN + mounted.prefix + entry.path.split('/').map(encodeURIComponent).join('/');
  console.log(`\n=== ${entry.id} ${entry.path}`);

  /* A frame, because that is how the course opens. */
  const frameResult = await browser.evaluate(`(async () => {
    const frame = document.createElement('iframe');
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.style.width = '800px'; frame.style.height = '600px';
    document.body.append(frame);
    frame.src = ${JSON.stringify(url)};
    await new Promise(r => setTimeout(r, 4000));
    return { src: frame.src, w: frame.contentWindow ? 'has-window' : 'no-window' };
  })()`);
  console.log('  frame:', JSON.stringify(frameResult));

  /* Read the document from inside the frame target. */
  const frames = [...browser.sessions.entries()].filter(
    ([, s]) => s.targetInfo.type === 'iframe' || /reviewed-course-assets/.test(s.targetInfo.url || '')
  );
  console.log('  iframe targets:', frames.length);
  for (const [sid, s] of frames) {
    console.log('   ', sid.slice(0, 10), s.targetInfo.type, (s.targetInfo.url || '').slice(0, 90));
    try {
      const html = await browser.evaluateIn(
        sid,
        `document.documentElement ? document.documentElement.outerHTML.slice(0, 400) : 'EMPTY'`
      );
      console.log('      html:', String(html).slice(0, 300).replace(/\s+/g, ' '));
      const len = await browser.evaluateIn(
        sid,
        `document.documentElement ? document.documentElement.outerHTML.length : 0`
      );
      console.log('      len:', len);
    } catch (e) {
      console.log('      read failed:', e.message);
    }
  }
  await browser.evaluate(`document.querySelectorAll('iframe').forEach(f => f.remove())`);
}

await browser.close();
