#!/usr/bin/env node
/*
 * Opens courses one at a time, each in a tab of its own, and reports the
 * ones that do not come up.
 *
 * A batch run reuses one tab, and a heavy course can wedge the renderer of
 * that tab for good: every course after it then looks broken even though
 * it is fine.  Here each course gets a fresh tab that is closed again
 * afterwards, so one bad course cannot speak for the rest.
 *
 *   node tools/verify-lq-courses.mjs afe-180 afe-470
 *   node tools/verify-lq-courses.mjs --from recon/scratch/lq-audit-final.json
 *   node tools/verify-lq-courses.mjs --all --conc 6
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
const CDP = Number(arg('cdp', 9222));
const PORT = Number(arg('lq', 4173));
const WAIT = Number(arg('wait', 12000));
const CONC = Number(arg('conc', 1));
const OUT = arg('out', '');

/* The ids come from the command line, or from the bad list of a report. */
let ids = args.filter((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
if (!ids.length) {
  const from = arg('from', '');
  if (from) {
    const report = JSON.parse(fs.readFileSync(path.resolve(ROOT, from), 'utf8'));
    ids = report.bad || (report.results || []).filter((r) => !r.ok).map((r) => r.id);
  } else if (args.includes('--all')) {
    const cat = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'mirror', 'leqixiang', 'catalog.json'), 'utf8')
    );
    ids = cat.products.filter((p) => p.localInstalled).map((p) => p.id);
  }
}
if (!ids.length) {
  console.error('no courses given');
  process.exit(1);
}

const PROBE = `(() => {
  const d = document;
  const canvases = [...d.querySelectorAll('canvas')];
  const painted = canvases.filter(c => c.width > 0 && c.height > 0).length;
  const text = (d.body ? d.body.innerText : '').replace(/\\s+/g, ' ').trim();
  const frames = [];
  for (const f of d.querySelectorAll('iframe')) {
    let inner = null;
    try {
      const idoc = f.contentDocument;
      if (idoc) {
        const ic = [...idoc.querySelectorAll('canvas')];
        inner = {
          nodes: idoc.querySelectorAll('*').length,
          painted: ic.filter(c => c.width > 0 && c.height > 0).length,
          textLen: (idoc.body ? idoc.body.innerText : '').replace(/\\s+/g, ' ').trim().length,
        };
      }
    } catch (e) {}
    frames.push(inner);
  }
  return {
    title: d.title,
    nodes: d.querySelectorAll('*').length,
    canvases: canvases.length,
    painted,
    textLen: text.length,
    head: text.slice(0, 90),
    frames,
  };
})()`;

const alive = (p) => {
  if (!p) return false;
  let painted = p.painted || 0;
  let nodes = p.nodes || 0;
  let text = p.textLen || 0;
  for (const f of p.frames || []) {
    painted += f?.painted || 0;
    nodes += f?.nodes || 0;
    text += f?.textLen || 0;
  }
  return painted > 0 || nodes > 40 || text > 120;
};

const results = [];
let cursor = 0;
let done = 0;

/*
 * Each course gets a tab of its own, so a course that wedges its renderer
 * cannot make the next one look broken.  Several of those tabs can be open
 * at once, which is what makes a sweep over the whole library finish in
 * minutes instead of hours.
 */
async function worker() {
  while (cursor < ids.length) {
    const id = ids[cursor++];
    /*
     * The browser behind the debugging port may be busy, or it may have
     * been closed by something else.  That should not end the sweep.
     */
    let p = null;
    for (let tries = 0; tries < 3 && !p; tries++) {
      try {
        p = await connect(CDP);
      } catch (e) {
        await sleep(1500);
      }
    }
    if (!p) {
      results.push({ id, ok: false, probe: { error: 'no browser' }, failed: [] });
      done++;
      console.log(`BAD ${id}  no browser on ${CDP}`);
      continue;
    }
    let probe = null;
    let failed = [];
    try {
      await p.goto(`http://localhost:${PORT}/courseware/${id}.html`);
      await sleep(WAIT);
      probe = await p.evaluate(PROBE).catch((e) => ({ error: e.message }));
      const reqs = p.events
        .filter((e) => e.method === 'Network.responseReceived')
        .map((e) => e.params.response);
      failed = [
        ...new Set(
          reqs
            .filter((r) => r.status >= 400)
            .map(
              (r) =>
                `${r.status} ${r.url.replace(`http://localhost:${PORT}`, '').slice(0, 160)}`
            )
        ),
      ].slice(0, 6);
    } catch (e) {
      probe = { error: e.message };
    } finally {
      await p.close();
    }
    const rep = { id, ok: alive(probe) && failed.length === 0, probe, failed };
    results.push(rep);
    done++;
    if (!rep.ok) {
      console.log(
        `BAD ${id}  title=${probe?.title || ''}  nodes=${probe?.nodes} painted=${probe?.painted} text=${probe?.textLen}  failed=${failed.length} ${probe?.error || ''}`
      );
    }
    if (done % 50 === 0) {
      const bad = results.filter((r) => !r.ok).length;
      console.log(`[${done}/${ids.length}] bad=${bad}`);
    }
  }
}

await Promise.all(Array.from({ length: CONC }, () => worker()));

const bad = results.filter((r) => !r.ok);
console.log(`\n${results.length - bad.length}/${results.length} ok`);
if (bad.length) console.log('bad:', bad.map((b) => b.id).join(' '));

if (OUT) {
  fs.writeFileSync(
    path.resolve(ROOT, OUT),
    JSON.stringify({ results, bad: bad.map((b) => b.id) }, null, 1)
  );
}
