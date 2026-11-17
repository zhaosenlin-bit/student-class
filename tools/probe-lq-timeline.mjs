#!/usr/bin/env node
/*
 * Watches one course as it comes up: how much of the page exists after one
 * second, after five, after ten.  A course that hangs says so here — the
 * answer stops coming at some point instead of at the end.
 *
 *   node tools/probe-lq-timeline.mjs afe-180
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
const id = args.find((a) => !a.startsWith('--') && !args[args.indexOf(a) - 1]?.startsWith('--'));

const PROBE = `(() => ({
  n: document.querySelectorAll('*').length,
  title: document.title,
  vis: document.body ? document.body.style.visibility : '',
  head: (document.body ? document.body.innerText : '').replace(/\\s+/g, ' ').trim().slice(0, 80),
}))()`;

const p = await connect(CDP);
await p.goto(`http://localhost:${PORT}/courseware/${id}.html`);

let elapsed = 0;
for (const mark of [1000, 3000, 5000, 10000, 20000]) {
  await sleep(mark - elapsed);
  elapsed = mark;
  const r = await Promise.race([
    p.evaluate(PROBE).catch((e) => ({ error: e.message })),
    new Promise((res) => setTimeout(() => res({ error: 'no answer in 4s' }), 4000)),
  ]);
  console.log(`${mark}ms  ${JSON.stringify(r)}`);
}

try {
  const shot = path.join(ROOT, 'recon', 'scratch', `timeline-${id}.png`);
  await p.shot(shot);
  console.log('shot:', shot);
} catch (e) {
  console.log('shot failed:', e.message);
}
await p.close();
