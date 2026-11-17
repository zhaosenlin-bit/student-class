#!/usr/bin/env node
/*
 * Runtime truth for the whole library.
 *
 * The static scan only sees what the document mentions; the browser sees
 * what actually loads.  This opens every installed course in a real tab,
 * watches the network, and reports the ones that fail to paint.
 *
 *   node tools/audit-lq-all.mjs [--conc 8] [--port 9222] [--out file.json]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, sleep } from './cdpx.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const CONC = Number(arg('conc', 8));
const CDP_PORT = Number(arg('cdp', 9222));
const OUT = arg('out', 'recon/scratch/lq-audit-all.json');
const LQ_PORT = Number(arg('lq', 4173));
const WAIT = Number(arg('wait', 3500));
const LIMIT = Number(arg('limit', 0));

/* A course paints either in the page itself or in the frame it holds. */
const paintedOf = (probe) => {
  if (!probe) return 0;
  let painted = probe.painted || 0;
  for (const frame of probe.frames || []) {
    painted += frame.inner?.painted || 0;
  }
  return painted;
};
const nodesOf = (probe) => {
  if (!probe) return 0;
  let nodes = probe.nodes || 0;
  for (const frame of probe.frames || []) {
    nodes += frame.inner?.nodes || 0;
  }
  return nodes;
};
const textOf = (probe) => {
  if (!probe) return 0;
  let text = probe.textLen || 0;
  for (const frame of probe.frames || []) {
    text += frame.inner?.textLen || 0;
  }
  return text;
};

const catalog = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'mirror', 'leqixiang', 'catalog.json'), 'utf8')
);
const installed = catalog.products.filter((p) => p.localInstalled);
let ids = installed.map((p) => p.id);
const explicit = args.filter((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
if (explicit.length) ids = explicit;
if (LIMIT) ids = ids.slice(0, LIMIT);

const PROBE = `(() => {
  const d = document;
  const canvases = [...d.querySelectorAll('canvas')];
  const painted = canvases.filter(c => c.width > 0 && c.height > 0).length;
  const nodes = d.querySelectorAll('*').length;
  const text = (d.body ? d.body.innerText : '').replace(/\\s+/g, ' ').trim();
  const err = [...d.querySelectorAll('[data-course-adapter-state="TIMEOUT"], [data-course-adapter-state="ERROR"]')].length;
  const visible = e => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
  const notif = [...d.querySelectorAll('body *')].filter(e => visible(e) && /内容仅在授权平台运行|未授权的运行环境|加载失败|无法加载|付费|购买|开通会员/.test(e.textContent||'') && e.children.length === 0).length;
  /* A course that lives in a frame paints there, not here. */
  const frames = [];
  for (const f of d.querySelectorAll('iframe')) {
    let inner = null;
    try {
      const idoc = f.contentDocument;
      if (idoc) {
        const icanvas = [...idoc.querySelectorAll('canvas')];
        inner = {
          nodes: idoc.querySelectorAll('*').length,
          canvases: icanvas.length,
          painted: icanvas.filter(c => c.width > 0 && c.height > 0).length,
          textLen: (idoc.body ? idoc.body.innerText : '').replace(/\\s+/g, ' ').trim().length,
          head: (idoc.body ? idoc.body.innerText : '').replace(/\\s+/g, ' ').trim().slice(0, 120),
        };
      }
    } catch (e) {}
    frames.push({ src: (f.getAttribute('src') || '').slice(0, 120), inner });
  }
  return {
    title: d.title,
    nodes,
    canvases: canvases.length,
    painted,
    textLen: text.length,
    head: text.slice(0, 120),
    adapterErr: err,
    guardMsg: notif,
    frames,
  };
})()`;

const results = [];
let cursor = 0;
let done = 0;

/*
 * The report is written as the run goes on.  A heavy course can wedge the
 * renderer at the very end of a long run, and a report that only appears
 * at the end would then be lost with it.
 */
const outFile = path.join(ROOT, OUT);
const flush = () => {
  const bad = results.filter((r) => !r.ok);
  fs.writeFileSync(outFile, JSON.stringify({ results, bad: bad.map((b) => b.id) }, null, 1));
};

async function worker() {
  const p = await connect(CDP_PORT);
  try {
    while (cursor < ids.length) {
      const id = ids[cursor++];
      const rep = { id, ok: false, failed: [], errors: [] };
      try {
        const mark = p.events.length;
        await p.goto(`http://localhost:${LQ_PORT}/courseware/${id}.html`);
        await sleep(WAIT);
        const probe = await p.evaluate(PROBE).catch((e) => ({ error: e.message }));
        rep.probe = probe;
        const events = p.events.slice(mark);
        const reqs = events
          .filter((e) => e.method === 'Network.responseReceived')
          .map((e) => e.params.response);
        const failed = reqs.filter((r) => r.status >= 400);
        rep.failed = failed
          .map((r) => `${r.status} ${r.url.replace(`http://localhost:${LQ_PORT}`, '').slice(0, 200)}`)
          .filter((v, i, a) => a.indexOf(v) === i)
          .slice(0, 8);
        rep.offsite = [
          ...new Set(
            reqs
              .map((r) => r.url)
              .filter((u) => !u.startsWith(`http://localhost:${LQ_PORT}`) && !u.startsWith('data:'))
          ),
        ].slice(0, 6);
        const errs = events.filter(
          (e) =>
            e.method === 'Runtime.exceptionThrown' ||
            (e.method === 'Log.entryAdded' && e.params?.entry?.level === 'error')
        );
        rep.errors = [
          ...new Set(
            errs
              .map((e) =>
                (
                  e.params?.exceptionDetails?.exception?.description ||
                  e.params?.exceptionDetails?.text ||
                  e.params?.entry?.text ||
                  ''
                )
                  .replace(/\s+/g, ' ')
                  .slice(0, 160)
              )
              .filter(Boolean)
          ),
        ].slice(0, 5);
        const pr = probe || {};
        rep.ok =
          !failed.length &&
          (paintedOf(pr) > 0 || nodesOf(pr) > 40 || textOf(pr) > 120) &&
          !(pr.guardMsg > 0);
      } catch (e) {
        rep.error = e.message;
      }
      results.push(rep);
      done++;
      flush();
      if (done % 25 === 0) {
        const bad = results.filter((r) => !r.ok).length;
        process.stdout.write(`[${done}/${ids.length}] bad=${bad}\n`);
      }
    }
  } finally {
    await p.close();
  }
}

await Promise.all(Array.from({ length: CONC }, () => worker()));

/*
 * Ten tabs in one browser can starve a heavy course of time, and a course
 * that was still painting when the tab was closed looks exactly like one
 * that never paints at all.  The blank ones get a second, slower look.
 */
const blank = results.filter(
  (r) => !r.ok && !r.error && (!r.probe || (r.probe.nodes || 0) < 20)
);
if (blank.length) {
  console.log(`复检 ${blank.length} 门空白页…`);
  const p = await connect(CDP_PORT);
  try {
    for (const rep of blank) {
      const mark = p.events.length;
      try {
        await p.goto(`http://localhost:${LQ_PORT}/courseware/${rep.id}.html`);
        await sleep(Math.max(WAIT, 6000));
        const probe = await p.evaluate(PROBE).catch((e) => ({ error: e.message }));
        rep.probe = probe;
        const events = p.events.slice(mark);
        const failed = events
          .filter((e) => e.method === 'Network.responseReceived')
          .map((e) => e.params.response)
          .filter((r) => r.status >= 400);
        rep.failed = [
          ...new Set(
            failed.map(
              (r) => `${r.status} ${r.url.replace(`http://localhost:${LQ_PORT}`, '').slice(0, 200)}`
            )
          ),
        ].slice(0, 8);
        rep.errors = [
          ...new Set(
            events
              .filter(
                (e) =>
                  e.method === 'Runtime.exceptionThrown' ||
                  (e.method === 'Log.entryAdded' && e.params?.entry?.level === 'error')
              )
              .map((e) =>
                (
                  e.params?.exceptionDetails?.exception?.description ||
                  e.params?.exceptionDetails?.text ||
                  e.params?.entry?.text ||
                  ''
                )
                  .replace(/\s+/g, ' ')
                  .slice(0, 160)
              )
              .filter(Boolean)
          ),
        ].slice(0, 5);
        const pr = probe || {};
        rep.ok =
          !failed.length &&
          (paintedOf(pr) > 0 || nodesOf(pr) > 40 || textOf(pr) > 120) &&
          !(pr.guardMsg > 0);
      } catch (e) {
        rep.error = e.message;
      }
    }
  } finally {
    await p.close();
  }
}

const bad = results.filter((r) => !r.ok);
fs.writeFileSync(path.join(ROOT, OUT), JSON.stringify({ results, bad: bad.map((b) => b.id) }, null, 1));

console.log(`\n体检完成：${results.length} 门，可开 ${results.length - bad.length}，有问题 ${bad.length}`);
const byReason = new Map();
for (const b of bad) {
  const reason = b.error
    ? '脚本异常'
    : b.failed.length
      ? `资源缺失 ${b.failed.length}`
      : b.probe?.guardMsg
        ? '授权守卫'
        : b.probe?.adapterErr
          ? '适配器握手失败'
          : '空白页';
  byReason.set(reason, (byReason.get(reason) || 0) + 1);
}
for (const [k, v] of byReason) console.log(`   ${k}: ${v}`);
console.log('\n问题清单：');
for (const b of bad) {
  console.log(
    `   ${b.id}  ${b.probe?.title || b.probe?.head || ''}  ${
      b.failed.slice(0, 2).join(' | ') || b.errors.slice(0, 1).join('') || b.probe?.error || ''
    }`
  );
}
