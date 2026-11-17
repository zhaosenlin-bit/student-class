#!/usr/bin/env node
/*
 * Checks the mirrored simulations the way a teacher would use them: open
 * the local copy, look at the screen, and watch what the page asks for.
 *
 * A simulation is in order when it paints, when it says something, and
 * when it does not reach for the network.
 *
 *   node tools/check-phet-offline.mjs [--cdp 9222] [--conc 3]
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
const WAIT = Number(arg('wait', 7000));
const PORT = Number(arg('lq', 4173));

const catalog = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'mirror', 'leqixiang', 'catalog.json'), 'utf8')
);
const ids = catalog.products
  .filter((p) => p.source === 'phet')
  .map((p) => p.id);

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
    head: text.slice(0, 90),
    failed: /内容仅在授权平台运行|未授权的运行环境|加载失败|无法加载/.test(text),
  };
})()`;

// A simulation counts as working when the screen shows *something*: a painted
// canvas, a real DOM, or readable text. Pure-canvas labs have almost no text,
// so demanding a word count would call perfectly good labs broken.
const looksAlive = (p) =>
  !!p && !p.error && (p.painted > 0 || p.nodes > 40 || p.textLen > 120);

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
        ok: looksAlive(probe) && !probe.failed && outside.length === 0,
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
