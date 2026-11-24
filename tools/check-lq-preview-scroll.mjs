#!/usr/bin/env node
/*
 * The preview must be readable from top to bottom.
 *
 * Opening a lesson used to leave the foot of it out of reach: the page
 * locked its scroll, the frame started under the site header, and the
 * lesson was cut off at the bottom with no way to scroll to what was
 * missing.  This opens the preview the way a teacher does and checks
 * the three things that have to hold:
 *
 *   1. the frame starts below the header and reaches the bottom of the
 *      window, so nothing of the lesson hides behind the header;
 *   2. the page itself can be scrolled, so the rest of the lesson can
 *      be reached;
 *   3. a lesson that is taller than the frame can scroll inside it.
 *
 *   node tools/check-lq-preview-scroll.mjs --cdp 9222
 *   node tools/check-lq-preview-scroll.mjs --ids a,b,c --shot out.png
 */
import { connect } from './cdpx.mjs';

const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const at = argv.indexOf(`--${name}`);
  return at >= 0 && argv[at + 1] ? argv[at + 1] : fallback;
};
const CDP = Number(argOf('cdp', 9222));
const PORT = Number(argOf('lq', 4173));
const IDS = argOf('ids', '')
  ? argOf('ids', '').split(',').map((s) => s.trim()).filter(Boolean)
  : ['mirror', 'lab-reaction-genetics-mitosis-3d-story', 'lab-physics-beers-law-lab'];
const SHOT = argOf('shot', '');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const OPEN = `(() => {
  const btn = [...document.querySelectorAll('button,a')]
    .find((b) => /在线预览|预览/.test(b.innerText || ''));
  if (!btn) return { ok: false };
  btn.click();
  return { ok: true };
})()`;

const MEASURE = `(() => {
  const de = document.documentElement;
  const head = document.querySelector('.site-header');
  const bar = document.querySelector('.lq-preview-bar');
  const frame = document.querySelector('[data-lq-preview-host] iframe');
  const state = document.querySelector('.lq-preview-state');
  const headBox = head ? head.getBoundingClientRect() : null;
  const barBox = bar ? bar.getBoundingClientRect() : null;
  const frameBox = frame ? frame.getBoundingClientRect() : null;
  let inner = null;
  try {
    const d = frame && frame.contentDocument;
    if (d && d.documentElement) {
      inner = {
        scrollHeight: d.documentElement.scrollHeight,
        clientHeight: d.documentElement.clientHeight,
      };
    }
  } catch (e) {
    inner = null;
  }
  return {
    headerBottom: headBox ? Math.round(headBox.bottom) : 0,
    barTop: barBox ? Math.round(barBox.top) : null,
    frameTop: frameBox ? Math.round(frameBox.top) : null,
    frameBottom: frameBox ? Math.round(frameBox.bottom) : null,
    windowH: window.innerHeight,
    pageScrollable: de.scrollHeight > de.clientHeight + 2,
    bodyOverflowY: getComputedStyle(document.body).overflowY,
    state: state ? state.textContent.trim() : null,
    stateError: state ? state.classList.contains('is-error') : false,
    inner: inner,
    hasFrame: !!frame,
  };
})()`;

const SCROLL_OUT = `(() => {
  window.scrollTo(0, document.documentElement.scrollHeight);
  const frame = document.querySelector('[data-lq-preview-host] iframe');
  if (!frame) return { ok: false };
  const r = frame.getBoundingClientRect();
  return { ok: true, bottom: Math.round(r.bottom), windowH: window.innerHeight };
})()`;

const SCROLL_IN = `(() => {
  const frame = document.querySelector('[data-lq-preview-host] iframe');
  if (!frame) return { ok: false };
  let d = null;
  try { d = frame.contentDocument; } catch (e) {}
  if (!d || !d.documentElement) return { ok: false };
  const de = d.documentElement;
  de.scrollTop = de.scrollHeight;
  return {
    ok: true,
    scrollHeight: de.scrollHeight,
    clientHeight: de.clientHeight,
    reachedBottom: de.scrollTop + de.clientHeight >= de.scrollHeight - 2,
  };
})()`;

const page = await connect(CDP);
const rows = [];
for (const id of IDS) {
  const row = { id };
  try {
    await page.goto(`http://127.0.0.1:${PORT}/#course/${encodeURIComponent(id)}`);
    await sleep(1200);
    await page.send('Page.reload', { ignoreCache: true });
    await sleep(3000);
    row.opened = (await page.evaluate(OPEN)).ok;
    await sleep(6000);
    const m = await page.evaluate(MEASURE);
    Object.assign(row, m);

    const out = await page.evaluate(SCROLL_OUT);
    row.bottomReachable = !!out.ok && out.bottom <= out.windowH + 2;

    const inside = await page.evaluate(SCROLL_IN);
    row.innerReachable = !!inside.ok && inside.reachedBottom;

    row.problems = [];
    if (!row.hasFrame) row.problems.push('预览框没有打开');
    if (row.stateError) row.problems.push(`预览报错：${row.state}`);
    if (row.frameTop !== null && row.frameTop < row.headerBottom - 2) {
      row.problems.push(`课件框被页头盖住（框顶 ${row.frameTop} < 页头 ${row.headerBottom}）`);
    }
    if (!row.pageScrollable) row.problems.push('页面不能滚动');
    if (!row.bottomReachable) row.problems.push('课件底部滚不到');
    if (!row.innerReachable) row.problems.push('课件内部滚不到底');
  } catch (e) {
    row.problems = [String(e.message).slice(0, 160)];
  }
  if (SHOT) {
    await page.shot(SHOT.includes('.png') ? SHOT : `${SHOT}-${id}.png`);
  }
  rows.push(row);
}
await page.close();

let bad = 0;
for (const r of rows) {
  const ok = !r.problems || !r.problems.length;
  if (!ok) bad++;
  console.log(
    `${ok ? 'ok  ' : 'FAIL'} ${r.id}` +
      (ok
        ? `  框 ${r.frameTop}-${r.frameBottom} / 窗口 ${r.windowH}` +
          `  页面可滚=${r.pageScrollable} 底部可达=${r.bottomReachable} 内部可达=${r.innerReachable}`
        : `  ${r.problems.join('；')}`)
  );
}
console.log('');
console.log(
  bad
    ? `红灯：${rows.length} 门里有 ${bad} 门预览滚不到底。`
    : `绿灯：${rows.length} 门课件，预览从上到下都够得着。`
);
process.exit(bad ? 1 : 0);
