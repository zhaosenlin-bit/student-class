/*
 * How fast the library opens.
 *
 * A library that takes a long time to open is a library nobody opens.
 * This measures the three moments that matter: the catalogue page, the
 * catalogue data it asks for, and a lesson opening.
 *
 *   node tools/check-lq-speed.mjs
 */
import { connect, sleep } from './cdp2.mjs';

const PORT = Number(process.env.LQ_PORT || 4173);
const CDP = Number(process.env.CDP_PORT || 9226);

const browser = await connect(CDP);

/* The catalogue page itself. */
await browser.goto(`http://127.0.0.1:${PORT}/#catalog`);
await sleep(500);
const nav = await browser.evaluate(
  `(() => {
    const n = performance.getEntriesByType('navigation')[0];
    return n ? {
      domContentLoaded: Math.round(n.domContentLoadedEventEnd),
      load: Math.round(n.loadEventEnd),
      transfer: n.transferSize,
    } : null;
  })()`
);
console.log('目录页:', JSON.stringify(nav));

await sleep(4000);

/* What the page pulled down, and how long the biggest pieces took. */
const net = await browser.evaluate(
  `(() => {
    const rows = performance.getEntriesByType('resource')
      .map(r => ({ name: r.name, size: r.transferSize, ms: Math.round(r.duration) }))
      .sort((a, b) => b.size - a.size);
    const total = rows.reduce((n, r) => n + (r.size || 0), 0);
    return { count: rows.length, total, top: rows.slice(0, 8) };
  })()`
);
console.log(`页面一共取回 ${net.count} 个文件，合计 ${(net.total / 1024).toFixed(0)} KB`);
for (const r of net.top) {
  console.log(`  ${(r.size / 1024).toFixed(0)} KB  ${r.ms} ms  ${r.name.replace(/^https?:\/\/[^/]+/, '')}`);
}

/* The catalogue data, asked for twice. */
const twice = await browser.evaluate(
  `(async () => {
    const a = performance.now();
    const r1 = await fetch('/api/catalog', { cache: 'no-cache' });
    const b1 = performance.now();
    const r2 = await fetch('/api/catalog', { cache: 'no-cache' });
    const b2 = performance.now();
    const rows = performance.getEntriesByType('resource')
      .filter(e => e.name.includes('/api/catalog'));
    return {
      first: Math.round(b1 - a),
      second: Math.round(b2 - b1),
      secondStatus: r2.status,
      carried: rows.map(e => e.transferSize),
    };
  })()`
);
console.log('目录接口:', JSON.stringify(twice));

/* A lesson opening.  The address carries a mark so the page really
   loads again instead of only changing the hash. */
await browser.goto(`http://127.0.0.1:${PORT}/?speed=1#course/afe-846`);
await sleep(4000);
await browser.evaluate(
  `[...document.querySelectorAll('button')].find(x => /在线预览/.test(x.textContent))?.click()`
);
await sleep(12000);
const lesson = await browser.evaluate(
  `(() => {
    const frames = [...document.querySelectorAll('iframe, frame')];
    const f = frames.find(x => /courseware|\\.html/.test(x.getAttribute('src') || '')) || frames[0];
    let r = null;
    try { r = f && f.contentDocument ? f.contentDocument : null; } catch {}
    return {
      hash: location.hash,
      classroom: !document.querySelector('#classroom')?.hidden,
      frames: frames.length,
      frame: !!f,
      src: f ? (f.getAttribute('src') || '').slice(0, 60) : '',
      ready: r ? r.readyState : '',
      nodes: r ? r.querySelectorAll('*').length : 0,
      canvases: r ? r.querySelectorAll('canvas').length : 0,
      loadingHidden: !!document.querySelector('#lesson-loading')?.hidden,
    };
  })()`
);
console.log('打开一门课:', JSON.stringify(lesson));
await browser.shot('recon/scratch/speed-lesson.png');

await browser.close();
