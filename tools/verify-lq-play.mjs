import fs from 'node:fs';
import { connect, sleep } from './cdpx.mjs';

const PORT = Number(process.env.LQ_PORT || 4173);
const ids = process.argv.slice(2);
if (!ids.length) ids.push('afe-466');
const WAIT = Number(process.env.LQ_WAIT || 9000);

const PROBE = `(() => {
  const doc = document;
  const canvases = [...doc.querySelectorAll('canvas')].map(c => ({w: c.width, h: c.height}));
  const out = {
    url: location.href,
    title: doc.title,
    canvases,
    bodyLen: doc.body ? doc.body.innerHTML.length : 0,
    text: (doc.body ? doc.body.innerText : '').replace(/\\s+/g, ' ').slice(0, 260),
    scripts: [...doc.querySelectorAll('script')].length,
    imgs: [...doc.querySelectorAll('img')].map(i => ({src: (i.currentSrc || i.src || '').slice(-70), ok: i.complete && i.naturalWidth > 0})),
  };
  try {
    const c = doc.querySelector('canvas');
    if (c) {
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      out.gl = gl ? 'yes' : 'no';
    }
  } catch (e) { out.gl = 'err:' + e.message; }
  return out;
})()`;

for (const id of ids) {
  const p = await connect(9222);
  const report = { id, ok: false };
  try {
    await p.goto(`http://localhost:${PORT}/#course/${id}`);
    await sleep(1500);

    // The detail page renders a "在线使用" button; click it.
    const clicked = await p.evaluate(`(() => {
      const b = [...document.querySelectorAll('button')].find(e => /在线使用/.test(e.innerText||''));
      if (!b) return { found: false, buttons: [...document.querySelectorAll('button')].map(e=>(e.innerText||'').trim().slice(0,14)).slice(0,20) };
      b.click();
      return { found: true, text: b.innerText.trim() };
    })()`);
    report.clicked = clicked;
    await sleep(WAIT);

    const shell = await p.evaluate(`(() => ({
      hash: location.hash,
      loading: (document.querySelector('#lesson-loading')||{}).hidden,
      loadingText: (document.querySelector('#lesson-loading')||{}).innerText?.replace(/\\s+/g,' ').slice(0,160),
      frames: [...document.querySelectorAll('iframe')].map(f => f.getAttribute('src')),
      errorState: document.querySelector('#lesson-loading')?.classList.contains('error-state'),
    }))()`);
    report.shell = shell;

    // Evaluate inside every frame that has a document.
    report.frames = [];
    for (const [frameId, ctx] of p.contexts) {
      if (!ctx.auxData?.isDefault) continue;
      let probe;
      try {
        probe = await p.evaluate(PROBE, ctx.id);
      } catch (e) {
        continue;
      }
      report.frames.push({ frameId, url: probe.url, canvases: probe.canvases, text: probe.text, imgs: probe.imgs?.length, badImgs: probe.imgs?.filter((i) => !i.ok).length, gl: probe.gl, bodyLen: probe.bodyLen });
    }

    const reqs = p.events
      .filter((e) => e.method === 'Network.responseReceived')
      .map((e) => e.params.response);
    report.requests = reqs.length;
    report.failed = reqs
      .filter((r) => r.status >= 400)
      .map((r) => `${r.status} ${r.url.replace(`http://localhost:${PORT}`, '').slice(0, 130)}`)
      .slice(0, 12);
    report.offsite = [
      ...new Set(
        reqs
          .map((r) => r.url)
          .filter((u) => !u.startsWith(`http://localhost:${PORT}`) && !u.startsWith('data:'))
          .map((u) => u.slice(0, 120))
      ),
    ].slice(0, 10);

    const errs = p.events.filter(
      (e) => e.method === 'Runtime.exceptionThrown' || (e.method === 'Log.entryAdded' && e.params?.entry?.level === 'error')
    );
    report.errors = errs
      .map((e) =>
        (e.params?.exceptionDetails?.exception?.description || e.params?.exceptionDetails?.text || e.params?.entry?.text || '').replace(/\s+/g, ' ').slice(0, 180)
      )
      .slice(0, 10);

    await p.shot(`recon/scratch/lq-play-${id}.png`);
    report.ok =
      !!shell.frames?.length &&
      shell.loading === true &&
      report.frames.some((f) => f.canvases?.length || (f.bodyLen || 0) > 500);
  } catch (e) {
    report.error = e.message;
  }
  await p.close();
  console.log(JSON.stringify(report, null, 1));
  console.log('---');
}
