#!/usr/bin/env node
/*
 * Checks the mirrored simulations the way a teacher would use them: open
 * the local copy, look at the screen, and watch what the page asks for.
 *
 * A simulation is in order when it paints, when it says something, and
 * when it does not reach for the network.
 *
 *   node tools/check-phet-offline.mjs [--cdp 9222] [--conc 1]
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
/*
 * One at a time.  A simulation is a few megabytes of program, and three
 * of them starting at once on one machine is enough to make a healthy
 * simulation look like it never came up.
 */
const CONC = Number(arg('conc', 1));
const WAIT = Number(arg('wait', 7000));
const PORT = Number(arg('lq', 4173));
const ONLY = arg('only', '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const catalog = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'mirror', 'leqixiang', 'catalog.json'), 'utf8')
);
const courses = catalog.products
  .filter((p) => p.source === 'phet')
  .filter((p) => !ONLY.length || ONLY.includes(p.id))
  .map((p) => {
    /*
     * The names the home screen of the simulation is known by: the name
     * this library gives it, the name it was published under, and the
     * name the simulation itself carries in its own title -- which is
     * the name the screen of the simulation shows.
     */
    const names = [p.title, p.tagline].filter(Boolean);
    const file = path.join(ROOT, 'mirror', 'leqixiang', 'courseware', `${p.id}.html`);
    if (fs.existsSync(file)) {
      const m = /<title>([\s\S]*?)<\/title>/i.exec(fs.readFileSync(file, 'utf8'));
      if (m) names.push(m[1].replace(/[\u202a-\u202e\u2066-\u2069]/g, '').trim());
    }
    return { id: p.id, names };
  });
const ids = courses.map((c) => c.id);

const PROBE = `(() => {
  const d = document;
  const canvases = [...d.querySelectorAll('canvas')];
  const text = (d.body ? d.body.innerText : '').replace(/\\s+/g, ' ').trim();
  return {
    title: d.title,
    nodes: d.querySelectorAll('*').length,
    canvases: canvases.length,
    painted: canvases.filter(c => c.width > 0 && c.height > 0).length,
    textLen: text.length,
    simEl: !!d.getElementById('sim'),
    svg: d.querySelectorAll('svg').length,
    head: text.slice(0, 90),
    bodyText: text.slice(0, 2000),
    failed: /内容仅在授权平台运行|未授权的运行环境|加载失败|无法加载/.test(text),
  };
})()`;

/*
 * A simulation counts as working when its own screen is on the glass.
 *
 * The loading screen of this library is drawn over the simulation while
 * it starts, and a simulation that never starts leaves only that
 * loading screen behind -- which is a picture, and looks like progress.
 * So the test is not "is something painted" but "is the simulation
 * itself there": its own element is in the document and its own screen
 * has been drawn.
 *
 * The name of the course on the screen is kept as a note rather than a
 * condition: a simulation that goes straight into a screen without a
 * home page never shows its own name, and that is not a fault.
 */
const looksAlive = (p) => {
  if (!p || p.error || p.failed) return false;
  if (!p.simEl) return false;
  if (p.nodes < 200) return false;
  return p.painted > 0 || p.textLen >= 30;
};

/* Whether the name of the course is written on the screen. */
const namesOnScreen = (p, course) => {
  if (!p || !course) return false;
  const hay = String(p.bodyText || '').replace(/\s+/g, '').toLowerCase();
  return course.names.some((n) => hay.includes(String(n).replace(/\s+/g, '').toLowerCase()));
};

const results = [];
let cursor = 0;

async function worker() {
  const p = await connect(CDP);
  const seen = [];
  p.on((m) => {
    if (m.method === 'Network.requestWillBeSent') seen.push(m.params.request.url);
  });
  try {
    for (;;) {
      const i = cursor++;
      if (i >= ids.length) return;
      const id = ids[i];
      seen.length = 0;
      const course = courses.find((c) => c.id === id);
      let probe = null;
      try {
        await p.goto(`http://localhost:${PORT}/courseware/${id}.html`);
        await sleep(WAIT);
        probe = await p.evaluate(PROBE).catch((e) => ({ error: e.message }));
        /*
         * A simulation is a few megabytes of program, and on a busy
         * machine it may still be starting when the first look happens.
         * A simulation that is not up yet gets a second look before it
         * is called broken.
         */
        if (!looksAlive(probe)) {
          await sleep(WAIT);
          probe = await p.evaluate(PROBE).catch((e) => ({ error: e.message }));
        }
      } catch (e) {
        probe = { error: e.message };
      }
      const outside = seen.filter((u) => /^https?:/i.test(u) && !u.startsWith(`http://localhost:${PORT}`));
      const rep = {
        id,
        ok: looksAlive(probe) && outside.length === 0,
        named: namesOnScreen(probe, course),
        probe,
        outside: outside.slice(0, 5),
      };
      results.push(rep);
      console.log(
        `${results.length}/${ids.length} ${rep.ok ? 'ok  ' : 'BAD '} ${id} nodes=${probe?.nodes} text=${probe?.textLen} outside=${outside.length}`
      );
    }
  } finally {
    await p.close();
  }
}

await Promise.all(Array.from({ length: CONC }, worker));

const bad = results.filter((r) => !r.ok);
fs.writeFileSync(
  path.join(ROOT, 'recon', 'scratch', 'phet-offline-check.json'),
  JSON.stringify({ total: results.length, bad: bad.map((b) => b.id), results }, null, 2)
);
console.log(`\n${results.length - bad.length}/${results.length} ok`);
if (bad.length) console.log('bad:', bad.map((b) => b.id).join(' '));
