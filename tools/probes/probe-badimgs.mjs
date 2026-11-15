import { connect, sleep } from './cdp2.mjs';
const b = await connect(Number(process.env.CDP_PORT || 9226));
for (const id of ['afe-754','afe-180','mirror','afe-506']) {
  await b.goto('http://localhost:4173/#play/' + id);
  await sleep(9000);
  const out = await b.evaluate(`(() => {
    const frame = document.querySelector('#lesson-frame iframe') || document.querySelector('iframe');
    const doc = frame && frame.contentDocument;
    if (!doc) return { note: 'no frame' };
    const bad = [...doc.querySelectorAll('img')].filter(i => i.complete && i.naturalWidth === 0);
    return { total: doc.querySelectorAll('img').length, bad: bad.slice(0,6).map(i => ({ src: (i.getAttribute('src')||'').slice(0,120), cls: i.className.slice(0,40), alt: (i.alt||'').slice(0,30) })) };
  })()`);
  console.log(id, JSON.stringify(out));
}
