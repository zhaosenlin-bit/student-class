#!/usr/bin/env node
/*
 * Looks at one course the way a reader sees it and reports what the page
 * actually contains: the visible text, the elements, the errors, and a
 * picture of the screen.
 *
 *   node tools/probe-lq-page.mjs afe-470
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
const id = args.find((a) => !a.startsWith('--') && !args[args.indexOf(a) - 1]?.startsWith('--'));

const p = await connect(CDP);
await p.goto(`http://localhost:${PORT}/courseware/${id}.html`);
await sleep(WAIT);

const PROBE = `(() => {
  const d = document;
  const visible = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
  const all = [...d.querySelectorAll('*')];
  const shown = all.filter(visible);
  const text = (d.body ? d.body.innerText : '').replace(/\\s+/g, ' ').trim();
  const textContent = (d.body ? d.body.textContent : '').replace(/\\s+/g, ' ').trim();
  return {
    title: d.title,
    nodes: all.length,
    visibleNodes: shown.length,
    bodyHeight: d.body ? d.body.scrollHeight : 0,
    innerTextLen: text.length,
    textContentLen: textContent.length,
    innerTextHead: text.slice(0, 300),
    textContentHead: textContent.slice(0, 300),
    controls: d.querySelectorAll('input,textarea,select,button').length,
 };
})()`;

console.log(JSON.stringify(await p.evaluate(PROBE), null, 1));

const errs = p.events.filter(
  (e) =>
    e.method === 'Runtime.exceptionThrown' ||
    (e.method === 'Log.entryAdded' && e.params?.entry?.level === 'error')
);
console.log(
  'errors:',
  errs
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
);

const shot = path.join(ROOT, 'recon', 'scratch', `probe-${id}.png`);
await p.shot(shot);
console.log('shot:', shot);
await p.close();
