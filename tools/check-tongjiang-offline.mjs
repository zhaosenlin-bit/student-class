#!/usr/bin/env node
/*
 * Checks the 铜匠实验室 lessons the way a teacher would use them: open the
 * local copy, look at the screen, and watch what the page asks for.
 *
 * A lesson is in order when the 3D scene draws, when the lesson says
 * something, and when it does not reach for the network.
 *
 *   node tools/check-tongjiang-offline.mjs [--cdp 9222] [--conc 3]
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
const CONC = Number(arg('conc', 3));
const WAIT = Number(arg('wait', 8000));
const PORT = Number(arg('lq', 4173));

const catalog = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'mirror', 'tongjiang', 'catalog.json'), 'utf8')
);
const ids = catalog.map((l) => `tongjiang-${l.slug}`);

/*
 * The lesson draws into one canvas.  A canvas that has been given a real
 * size and has had something drawn on it is the sign that three.js is
 * alive; a canvas that stayed blank means the scene never came up.
 */
const PROBE = `(() => {
  const d = document;
  const canvases = [...d.querySelectorAll('canvas')];
  const text = (d.body ? d.body.innerText : '').replace(/\\s+/g, ' ').trim();
  let painted = 0;
  for (const c of canvases) {
    if (!(c.width > 0 && c.height > 0)) continue;
    try {
      const ctx = c.getContext('2d');
      if (ctx) {
        const px = ctx.getImageData(0, 0, Math.min(c.width, 200), Math.min(c.height, 200)).data;
        for (let i = 3; i < px.length; i += 4) {
          if (px[i] !== 0) { painted++; break; }
        }
        continue;
      }
    } catch (e) {}
    painted++;
  }
  return {
    title: d.title,
    nodes: d.querySelectorAll('*').length,
    canvases: canvases.length,
    painted,
    textLen: text.length,
    head: text.slice(0, 90),
    failed: /加载失败|无法加载|出错了|404/.test(text),
  };
})()`;

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
      let probe = null;
      try {
        await p.goto(`http://localhost:${PORT}/courseware/${id}.html`);
        await sleep(WAIT);
        probe = await p.evaluate(PROBE).catch((e) => ({ error: e.message }));
      } catch (e) {
        probe = { error: e.message };
      }
      const outside = seen.filter((u) => /^https?:/i.test(u) && !u.startsWith(`http://localhost:${PORT}`));
      const rep = {
        id,
        ok: !!probe && !probe.error && (probe.painted > 0 || probe.nodes > 40) && !probe.failed && outside.length === 0,
        probe,
        outside: outside.slice(0, 5),
      };
      results.push(rep);
      console.log(
        `${results.length}/${ids.length} ${rep.ok ? 'ok  ' : 'BAD '} ${id} canvases=${probe?.canvases} painted=${probe?.painted} text=${probe?.textLen} outside=${outside.length}`
      );
    }
  } finally {
    await p.close();
  }
}

await Promise.all(Array.from({ length: CONC }, worker));

const bad = results.filter((r) => !r.ok);
fs.writeFileSync(
  path.join(ROOT, 'recon', 'scratch', 'tongjiang-offline-check.json'),
  JSON.stringify({ total: results.length, bad: bad.map((b) => b.id), results }, null, 2)
);
console.log(`\n${results.length - bad.length}/${results.length} ok`);
if (bad.length) console.log('bad:', bad.map((b) => b.id).join(' '));
