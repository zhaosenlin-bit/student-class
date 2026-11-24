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
 *   node tools/verify-lq-courses.mjs lq-180 lq-470
 *   node tools/verify-lq-courses.mjs --from work/lq-audit-final.json
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
if (!ids.length && arg('ids-file', '')) {
  /* A long list does not fit on one command line; a file does. */
  ids = fs
    .readFileSync(path.resolve(ROOT, arg('ids-file', '')), 'utf8')
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
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
  const fields = d.querySelectorAll('input,select,textarea,button').length;
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
          fields: idoc.querySelectorAll('input,select,textarea,button').length,
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
    fields,
    head: text.slice(0, 90),
    frames,
  };
})()`;

/*
 * A lesson has come up when it shows something: a drawing, words, a
 * field to fill in, or a page of markup.
 */
const hasContent = (p) => {
  if (!p) return false;
  let painted = p.painted || 0;
  let nodes = p.nodes || 0;
  let text = p.textLen || 0;
  let fields = p.fields || 0;
  for (const f of p.frames || []) {
    painted += f?.painted || 0;
    nodes += f?.nodes || 0;
    text += f?.textLen || 0;
    fields += f?.fields || 0;
  }
  return painted > 0 || nodes > 40 || text > 40 || fields > 0;
};

const alive = (p) => {
  if (!p) return false;
  /*
   * A lesson does not have to draw anything.  A roll-call sheet or a
   * code sheet is a page of words and fields, and it is a real lesson
   * all the same.
   *
   * What tells a dead page apart is the sentence it says — and only
   * that sentence.  A lesson that talks about something not existing
   * is a lesson, so a loose word like "不存在" must not be taken for
   * a missing file; the wording of the missing-file page is named
   * exactly instead.
   */
  const words = p.head || '';
  const dead =
    /本机还没有这份课件|本地没有安装这份课件|没有收进本地课件库|404 Not Found/.test(words);
  if (dead) return false;
  return hasContent(p);
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
    let ms = 0;
    try {
      const started = Date.now();
      await p.goto(`http://localhost:${PORT}/courseware/${id}.html`);
      /*
       * The lesson is watched until it shows something.  A lesson that
       * takes its time is not broken, but it is worth knowing which ones
       * take the longest, so the wait is measured rather than guessed.
       */
      for (;;) {
        const seen = await p.evaluate(PROBE).catch(() => null);
        if (hasContent(seen)) {
          ms = Date.now() - started;
          break;
        }
        if (Date.now() - started > WAIT) break;
        await sleep(300);
      }
      /* Give a lesson a moment to say something wrong, and notice it. */
      await sleep(Math.max(300, Math.min(1500, WAIT - (Date.now() - started))));
      probe = await p.evaluate(PROBE).catch((e) => ({ error: e.message }));
      const reqs = p.events
        .filter((e) => e.method === 'Network.responseReceived')
        .map((e) => e.params.response);
      /* A lesson that opens but throws is not a lesson that works. */
      const errors = p.events
        .filter((e) => e.method === 'Runtime.exceptionThrown')
        .map((e) => {
          const d = e.params.exceptionDetails;
          const text = d.exception?.description || d.text || 'error';
          return text.replace(/\s+/g, ' ').slice(0, 200);
        });
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
      if (errors.length) failed.push(...errors.map((e) => `js ${e}`));
    } catch (e) {
      probe = { error: e.message };
    } finally {
      await p.close();
    }
    /*
     * A handful of lessons freeze themselves when the network is being
     * watched — they read the extra work on their own requests as a
     * debugger sitting next to them and lock up the tab.  A teacher
     * never sees that, so the lesson is opened a second time without
     * the watcher before it is written off as broken.
     */
    if (/timeout/i.test(probe?.error || '')) {
      let q = null;
      try {
        q = await connect(CDP, null, { quiet: true });
        await q.goto(`http://localhost:${PORT}/courseware/${id}.html`);
        await sleep(WAIT);
        probe = await q.evaluate(PROBE).catch((e) => ({ error: e.message }));
      } catch (e) {
        probe = { error: e.message };
      } finally {
        await q?.close();
      }
    }
    const rep = { id, ok: alive(probe) && failed.length === 0, ms, probe, failed };
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

/*
 * The lessons that take the longest to come up.  A lesson that needs
 * many seconds is a lesson a teacher waits for.
 */
const slow = results
  .filter((r) => r.ok && r.ms > 2500)
  .sort((a, b) => b.ms - a.ms)
  .slice(0, 25);
if (slow.length) {
  console.log('\nslowest to come up:');
  for (const s of slow) console.log(`  ${(s.ms / 1000).toFixed(1)}s  ${s.id}`);
}

if (OUT) {
  fs.writeFileSync(
    path.resolve(ROOT, OUT),
    JSON.stringify(
      {
        results,
        bad: bad.map((b) => b.id),
        slow: results
          .filter((r) => r.ok)
          .sort((a, b) => b.ms - a.ms)
          .slice(0, 60)
          .map((r) => ({ id: r.id, ms: r.ms })),
      },
      null,
      1
    )
  );
}
