/*
 * Walks every locally installed courseware in the merged catalogue, opens it
 * the way a visitor would, and reports whether the frame actually rendered.
 */
import fs from 'node:fs';
import { connect, sleep } from './cdp2.mjs';

const PORT = Number(process.env.LQ_PORT || 4173);
const WAIT = Number(process.env.LQ_WAIT || 8000);
const ONLY = (process.env.LQ_ONLY || '').split(',').filter(Boolean);
const CDP_PORT = Number(process.env.LQ_CDP_PORT || 9222);
/* The work can be split over several browsers, each with its own profile. */
const SLICE = Number(process.env.LQ_SLICE || 0);
const SLICES = Number(process.env.LQ_SLICES || 1);

const catalog = JSON.parse(fs.readFileSync('mirror/leqixiang/catalog.json', 'utf8'));
const playable = catalog.products.filter((p) => p.localInstalled);
let targets = ONLY.length
  ? playable.filter((p) => ONLY.some((o) => p.id === o || p.id.includes(o)))
  : playable;
if (SLICES > 1) targets = targets.filter((_, i) => i % SLICES === SLICE);

const PROBE = `(() => {
  const doc = document;
  const canvases = [...doc.querySelectorAll('canvas')].map((c) => ({w: c.width, h: c.height}));
  const imgs = [...doc.querySelectorAll('img')];
  return {
    url: location.href,
    title: doc.title,
    canvases,
    accessState: doc.documentElement.getAttribute('data-xb-classroom-state'),
    accessOverlay: !!doc.querySelector('[data-xb-classroom-access-layer]'),
    bodyLen: doc.body ? doc.body.innerHTML.length : 0,
    text: (doc.body ? doc.body.innerText : '').replace(/\\s+/g, ' ').slice(0, 200),
    imgs: imgs.length,
    badImgs: imgs.filter((i) => i.complete && i.naturalWidth === 0).length,
    scripts: doc.querySelectorAll('script').length,
  };
})()`;

/* A course that is not sandboxed stays in the page, so it is read from
   the frame element instead of from a target of its own. */
const PROBE_IN_PAGE = `(() => {
  const frame = document.querySelector('#lesson-frame iframe') || document.querySelector('iframe');
  const doc = frame && frame.contentDocument;
  if (!doc) return null;
  const canvases = [...doc.querySelectorAll('canvas')].map((c) => ({w: c.width, h: c.height}));
  const imgs = [...doc.querySelectorAll('img')];
  return {
    url: frame.src || doc.location.href,
    title: doc.title,
    canvases,
    accessState: doc.documentElement.getAttribute('data-xb-classroom-state'),
    accessOverlay: !!doc.querySelector('[data-xb-classroom-access-layer]'),
    bodyLen: doc.body ? doc.body.innerHTML.length : 0,
    text: (doc.body ? doc.body.innerText : '').replace(/\\s+/g, ' ').slice(0, 200),
    imgs: imgs.length,
    badImgs: imgs.filter((i) => i.complete && i.naturalWidth === 0).length,
    scripts: doc.querySelectorAll('script').length,
  };
})()`;

const results = [];
const t0 = Date.now();
const REPORT = `recon/scratch/lq-batch-report${SLICES > 1 ? `-${SLICE}` : ''}.json`;
const REPORT_FILE = process.env.LQ_REPORT || REPORT;

const WORKERS = Number(process.env.LQ_WORKERS || 4);
let cursor = 0;

async function worker() {
  const p = await connect(CDP_PORT);
  while (cursor < targets.length) {
    const item = targets[cursor++];
    const id = item.id;
    const mark = p.events.length;
    const report = { id, title: item.title, source: item.source, ok: false };
    try {
      await p.goto(`http://localhost:${PORT}/#course/${id}`);
      await sleep(1200);

      const clicked = await p.evaluate(`(() => {
        /* The course page opens the courseware in an inline preview frame. */
        const b =
          document.querySelector('[data-lq-preview]') ||
          [...document.querySelectorAll('button')].find((e) => /在线预览|在线使用/.test(e.innerText || ''));
        if (!b) return { found: false, buttons: [...document.querySelectorAll('button')].map((e) => (e.innerText || '').trim().slice(0, 12)).slice(0, 12) };
        b.click();
        return { found: true };
      })()`);
      report.clicked = clicked;
      await sleep(WAIT);

      const shell = await p.evaluate(`(() => ({
        hash: location.hash,
        loadingHidden: (document.querySelector('#lesson-loading') || {}).hidden,
        errorState: !!document.querySelector('#lesson-loading')?.classList.contains('error-state'),
        frames: [...document.querySelectorAll('iframe')].map((f) => f.getAttribute('src')),
      }))()`);
      report.shell = shell;

      /*
       * The courseware runs in a sandboxed frame, which Chrome puts in its
       * own target.  Find that target by the address the page gave the
       * frame — the browser hands every client the events of every target,
       * so guessing by target type would pick up a neighbour's course.
       */
      report.frames = [];
      const src = shell.frames?.[0] || '';
      /*
       * The courseware runs in a sandboxed frame, which Chrome puts in its
       * own target.  That target does not carry its address, so every
       * frame is asked what it is showing and the courseware one is kept.
       */
      for (const [sessionId, info] of p.sessions) {
        if (info.targetInfo?.type !== 'iframe') continue;
        let probe;
        try {
          probe = await p.evaluateIn(sessionId, PROBE);
        } catch {
          continue;
        }
        if (!probe.url.includes('/courseware/')) continue;
        report.frames.push(probe);
        break;
      }
      if (!report.frames.length) {
        let probe = null;
        try {
          probe = await p.evaluate(PROBE_IN_PAGE);
        } catch {
          probe = null;
        }
        if (probe && probe.url.includes('/courseware/')) report.frames.push(probe);
      }

      /* Only the events of this worker's own targets count. */
      const own = new Set([p.pageSession]);
      for (const [sessionId, info] of p.sessions) {
        if (info.parent === p.pageSession || sessionId === p.pageSession) own.add(sessionId);
      }
      const fresh = p.events.slice(mark).filter((e) => !e.sessionId || own.has(e.sessionId));
      const failed = fresh
        .filter((e) => e.method === 'Network.responseReceived' && e.params.response.status >= 400)
        .map((e) => `${e.params.response.status} ${e.params.response.url.replace(/^https?:\/\/[^/]+/, '').slice(0, 240)}`);
      /* Keep the whole path: a truncated one cannot be fetched back. */
      report.failed = [...new Set(failed)].slice(0, 24);
      report.errors = fresh
        .filter((e) => e.method === 'Runtime.exceptionThrown')
        .map((e) => (e.params.exceptionDetails?.exception?.description || e.params.exceptionDetails?.text || '').replace(/\s+/g, ' ').slice(0, 150))
        .slice(0, 4);

      const frame = report.frames[0];
      report.ok =
        !!shell.frames?.length &&
        !shell.errorState &&
        !!frame &&
        ((frame.canvases?.length || 0) > 0 || (frame.bodyLen || 0) > 800) &&
        /* A courseware that still waits for a classroom shows a curtain
           over the lesson. The lesson is not open until the curtain is
           gone. */
        !frame.accessOverlay &&
        frame.accessState !== 'blocked' &&
        frame.accessState !== 'waiting';
      report.evidence = frame
        ? {
            canvases: frame.canvases.length,
            bodyLen: frame.bodyLen,
            imgs: frame.imgs,
            badImgs: frame.badImgs,
            accessState: frame.accessState,
            accessOverlay: frame.accessOverlay,
            text: frame.text?.slice(0, 90),
          }
        : null;
    } catch (e) {
      report.error = e.message;
    }
    results.push(report);
    const tag = report.ok ? 'ok  ' : 'FAIL';
    console.log(
      `${tag} ${String(results.length).padStart(3)}/${targets.length} ${id.padEnd(12)} ` +
        `canvases=${report.evidence?.canvases ?? '-'} bodyLen=${report.evidence?.bodyLen ?? '-'} ` +
        `bad=${report.failed?.length || 0} ${report.error || ''}`
    );
    if (!report.ok) {
      try {
        await p.shot(`recon/scratch/lq-fail-${id}.png`);
      } catch {}
    }
    fs.writeFileSync(REPORT_FILE, JSON.stringify(results, null, 1));
  }
  await p.close();
}

await Promise.all(Array.from({ length: Math.min(WORKERS, targets.length) }, worker));
const bad = results.filter((r) => !r.ok);
console.log(`\n${results.length - bad.length}/${results.length} rendered, ${bad.length} failed`);
for (const b of bad) console.log('  FAIL', b.id, b.error || b.shell?.errorState || 'empty frame');
console.log('minutes', ((Date.now() - t0) / 60000).toFixed(1));
