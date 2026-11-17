#!/usr/bin/env node
/*
 * A quality read of every installed course.
 *
 * The plain audit answers "does it open".  This one answers the two
 * questions the library actually cares about:
 *
 *   - what language is the course written in (the catalogue may be in
 *     Chinese while the course itself is in English), and
 *   - how much a learner can actually do with it (a painted canvas, a
 *     set of controls, something to read).
 *
 * It opens every course in a real tab, so the answers come from the
 * running page and not from guessing at the source.
 *
 *   node tools/audit-lq-quality.mjs [--conc 6] [--cdp 9222] [--out file.json]
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

const CONC = Number(arg('conc', 6));
const CDP_PORT = Number(arg('cdp', 9222));
const OUT = arg('out', 'recon/scratch/lq-quality-audit.json');
const LQ_PORT = Number(arg('lq', 4173));
const WAIT = Number(arg('wait', 3200));
const LIMIT = Number(arg('limit', 0));
const RETRY = args.includes('--retry-empty');

const catalog = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'mirror', 'leqixiang', 'catalog.json'), 'utf8')
);
let ids = catalog.products.filter((p) => p.localInstalled).map((p) => p.id);
const explicit = args.filter((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
if (explicit.length) ids = explicit;
const fromFile = arg('ids-from', '');
if (fromFile && fs.existsSync(path.join(ROOT, fromFile))) {
  ids = JSON.parse(fs.readFileSync(path.join(ROOT, fromFile), 'utf8'));
}
if (LIMIT) ids = ids.slice(0, LIMIT);

/* One probe for the page and for every frame it holds. */
const PROBE = `(() => {
  const cjk = (s) => (s.match(/[\\u3400-\\u9fff\\u3040-\\u30ff\\uf900-\\ufaff]/g) || []).length;
  const latin = (s) => (s.match(/[A-Za-z][A-Za-z'\\u2019-]*/g) || []).length;
  const read = (d) => {
    if (!d) return null;
    const canvases = [...d.querySelectorAll('canvas')];
    const painted = canvases.filter(c => c.width > 0 && c.height > 0).length;
    const text = (d.body ? d.body.innerText : '').replace(/\\s+/g, ' ').trim();
    const controls = d.querySelectorAll('button,input,select,textarea,[role=button],[onclick]').length;
    const sliders = d.querySelectorAll('input[type=range],input[type=checkbox],input[type=radio]').length;
    const media = d.querySelectorAll('audio,video,img,svg,canvas').length;
    const links = d.querySelectorAll('a[href]').length;
    const scripts = d.querySelectorAll('script').length;
    const frames = [...d.querySelectorAll('iframe')].map(f => {
      let inner = null;
      try {
        const idoc = f.contentDocument;
        if (idoc) inner = read(idoc);
      } catch (e) {}
      return { src: (f.getAttribute('src') || '').slice(0, 160), inner };
    });
    return {
      nodes: d.querySelectorAll('*').length,
      canvases: canvases.length,
      painted,
      textLen: text.length,
      cjk: cjk(text),
      latin: latin(text),
      controls,
      sliders,
      media,
      links,
      scripts,
      head: text.slice(0, 200),
      sample: text.slice(0, 2600),
      frames,
    };
  };
  return read(document);
})()`;

const merge = (probe) => {
  if (!probe) return null;
  const out = {
    nodes: probe.nodes || 0,
    canvases: probe.canvases || 0,
    painted: probe.painted || 0,
    textLen: probe.textLen || 0,
    cjk: probe.cjk || 0,
    latin: probe.latin || 0,
    controls: probe.controls || 0,
    sliders: probe.sliders || 0,
    media: probe.media || 0,
    links: probe.links || 0,
    scripts: probe.scripts || 0,
    head: probe.head || '',
    sample: probe.sample || '',
    frames: probe.frames || [],
  };
  for (const f of out.frames) {
    const inner = f.inner;
    if (!inner) continue;
    out.nodes += inner.nodes || 0;
    out.canvases += inner.canvases || 0;
    out.painted += inner.painted || 0;
    out.textLen += inner.textLen || 0;
    out.cjk += inner.cjk || 0;
    out.latin += inner.latin || 0;
    out.controls += inner.controls || 0;
    out.sliders += inner.sliders || 0;
    out.media += inner.media || 0;
    out.scripts += inner.scripts || 0;
    if (!out.sample && inner.sample) out.sample = inner.sample;
    if (!out.head && inner.head) out.head = inner.head;
  }
  return out;
};

const outFile = path.join(ROOT, OUT);
const results = [];
const done = new Set();

/* A run that was interrupted keeps what it already measured. */
if (fs.existsSync(outFile)) {
  try {
    const old = JSON.parse(fs.readFileSync(outFile, 'utf8'));
    for (const r of old.results || []) {
      /* A run that was cut short leaves a result without a reading in
         it; that course is measured again instead of being believed. */
      if (!r || !r.probe) continue;
      /* A course that was measured while it was still loading says
         nothing; it is measured again. */
      if (RETRY && r.probe.nodes < 20 && r.probe.painted === 0) continue;
      results.push(r);
      done.add(r.id);
    }
  } catch {
    /* A broken report is simply started again. */
  }
}

const todo = ids.filter((id) => !done.has(id));
let cursor = 0;
let count = 0;

const flush = () => {
  fs.writeFileSync(outFile, JSON.stringify({ results, at: new Date().toISOString() }, null, 1));
};

const worker = async () => {
  const p = await connect(CDP_PORT);
  try {
    while (cursor < todo.length) {
      const id = todo[cursor++];
      const rep = { id, errors: [], failed: [], offsite: [] };
      const t0 = Date.now();
      let t1 = t0;
      let t2 = t0;
      try {
        const mark = p.events.length;
        /*
         * The navigation is not waited for.  A course that keeps a
         * connection open (a stream, a long poll, an animation that
         * never lets the page settle) would otherwise hold the whole
         * library up for a minute at a time.
         */
        const target = `http://localhost:${LQ_PORT}/courseware/${id}.html`;
        p.send('Page.navigate', { url: target }).catch(() => {});
        await sleep(WAIT);
        t1 = Date.now();
        const probe = await p.evaluate(PROBE).catch((e) => ({ error: e.message }));
        t2 = Date.now();
        rep.probe = merge(probe);
        if (probe?.error) rep.errors.push(probe.error);
        /*
         * A course that is still loading says nothing at all.  It is
         * given a second, longer look before it is written down.  A
         * simulation that paints into a canvas builds that canvas late,
         * so a page that has no words and no picture yet is asked again.
         */
        if (
          rep.probe &&
          rep.probe.painted === 0 &&
          rep.probe.textLen === 0 &&
          (rep.probe.nodes < 40 || rep.probe.controls === 0)
        ) {
          await sleep(6000);
          const again = await p.evaluate(PROBE).catch((e) => ({ error: e.message }));
          const merged = merge(again);
          if (merged && (merged.nodes > (rep.probe.nodes || 0) || merged.painted > 0)) {
            rep.probe = merged;
            rep.retried = true;
          }
        }
        const events = p.events.slice(mark);
        const reqs = events
          .filter((e) => e.method === 'Network.responseReceived')
          .map((e) => e.params.response);
        rep.failed = [
          ...new Set(
            reqs
              .filter((r) => r.status >= 400)
              .map(
                (r) =>
                  `${r.status} ${r.url.replace(`http://localhost:${LQ_PORT}`, '').slice(0, 200)}`
              )
          ),
        ].slice(0, 8);
        rep.offsite = [
          ...new Set(
            reqs
              .map((r) => r.url)
              .filter(
                (u) =>
                  !u.startsWith(`http://localhost:${LQ_PORT}`) &&
                  !u.startsWith('data:') &&
                  !u.startsWith('blob:')
              )
          ),
        ].slice(0, 6);
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
                  .slice(0, 200)
              )
              .filter(Boolean)
          ),
        ].slice(0, 5);
      } catch (e) {
        rep.error = e.message;
      }
      results.push(rep);
      count++;
      rep.ms = { wait: t1 - t0, eval: t2 - t1, total: Date.now() - t0 };
      if (count % 25 === 0) {
        flush();
        const last = results[results.length - 1];
        console.log(
          `[${count}/${todo.length}] last ${last.id} wait=${last.ms.wait}ms eval=${last.ms.eval}ms total=${last.ms.total}ms`
        );
      }
    }
  } finally {
    await p.close();
  }
};

await Promise.all(Array.from({ length: CONC }, () => worker()));
flush();
console.log(`\n质量体检完成：${results.length} 门（本次 ${count} 门）`);
