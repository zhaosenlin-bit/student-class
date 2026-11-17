#!/usr/bin/env node
/*
 * Opens every mirrored block-programming game and reports what is really
 * there: the work area with its blocks, the language the page speaks and
 * whether the page reached for the network.
 *
 *   node tools/check-blockly-offline.mjs [--cdp 9222] [--port 4173]
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
const PORT = Number(arg('port', 4173));

const catalog = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'mirror', 'blocklygames', 'catalog.json'), 'utf8')
);

const PROBE = `(() => {
  const d = document;
  const blocks = d.querySelectorAll('.blocklyDraggable').length;
  const workspace = d.querySelectorAll('.blocklyWorkspace').length;
  const svg = d.querySelectorAll('svg.blocklySvg').length;
  const text = (d.body ? d.body.innerText : '').replace(/\\s+/g, ' ').trim();
  const lang = window.BlocklyGamesLang || '';
  const msg = Object.keys(window.BlocklyGamesMsg || {}).length;
  return {
    title: d.title,
    textLen: text.length,
    head: text.slice(0, 90),
    blocks, workspace, svg, lang, msg,
    canvases: d.querySelectorAll('canvas').length,
    cjk: (text.match(/[\u4e00-\u9fff]/g) || []).length,
    brand: text.indexOf('\u4e50\u542f\u4eab') >= 0,
  };
})()`;

const client = await connect(CDP);
await client.send('Page.enable');
await client.send('Runtime.enable');
await client.send('Network.enable');

const results = [];
let errors = [];
let external = [];
client.on((e) => {
  if (e.method === 'Runtime.exceptionThrown') {
    errors.push(
      e.params.exceptionDetails?.exception?.description ||
        e.params.exceptionDetails?.text ||
        'exception'
    );
  }
  if (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error') {
    errors.push(
      (e.params.args || []).map((a) => a.value || a.description || '').join(' ').slice(0, 180)
    );
  }
  if (e.method === 'Network.requestWillBeSent') {
    const u = e.params.request?.url || '';
    if (!u.startsWith('http://localhost') && !u.startsWith('data:')) external.push(u);
  }
});

for (const game of catalog) {
  const id = `blocklygames-${game.slug}`;
  errors = [];
  external = [];
  client.events.length = 0;
  await client.send('Page.navigate', {
    url: `http://localhost:${PORT}/courseware/${id}.html`,
  });
  await sleep(3500);
  let probe = null;
  try {
    probe = await client.evaluate(PROBE);
  } catch (e) {
    errors.push('probe: ' + e.message);
  }
  /* Switching a sound off while it is still starting up is the game's own
     habit, not a fault of the local copy. */
  const softErrors = errors.filter((e) =>
    /AbortError: The play\(\) request was interrupted/i.test(e)
  );
  const hardErrors = errors.filter(
    (e) => !/AbortError: The play\(\) request was interrupted/i.test(e)
  );
  const r = {
    id,
    title: game.title,
    ok: !!(
      probe &&
      probe.workspace > 0 &&
      probe.svg > 0 &&
      probe.lang === 'zh-hans' &&
      probe.msg > 20 &&
      probe.cjk > 10 &&
      probe.brand &&
      !hardErrors.length &&
      !external.length
    ),
    probe,
    errors: hardErrors.slice(0, 3),
    softErrors: softErrors.slice(0, 3),
    external: [...new Set(external)].slice(0, 4),
  };
  results.push(r);
  console.log(
    `${r.ok ? 'ok  ' : 'BAD '} ${id}  blocks=${probe ? probe.blocks : '-'} ` +
      `ws=${probe ? probe.workspace : '-'} lang=${probe ? probe.lang : '-'} ` +
      `cjk=${probe ? probe.cjk : '-'} brand=${probe ? probe.brand : '-'}` +
      (r.errors.length ? `  err=${r.errors[0].slice(0, 100)}` : '') +
      (r.external.length ? `  ext=${r.external[0].slice(0, 80)}` : '')
  );
}

client.close();
const good = results.filter((r) => r.ok).length;
console.log(`ok: ${good}/${results.length}`);
fs.writeFileSync(
  path.join(ROOT, 'recon', 'scratch', 'blockly-offline-check.json'),
  JSON.stringify(results, null, 2)
);
