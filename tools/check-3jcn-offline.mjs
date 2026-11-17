#!/usr/bin/env node
/*
 * Checks the 3D physics laboratories of 3JCN the way a teacher meets
 * them: with the network cut off.
 *
 * Every page is opened through the local server, and every request that
 * would leave the machine is refused.  A laboratory that still draws is
 * whole; one that asks the network for a library is reported.
 *
 *   node tools/check-3jcn-offline.mjs [--conc 6] [--cdp 9222] [--port 4173]
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
const CONC = Number(arg('conc', 6));
const LIMIT = Number(arg('limit', 0));
const WAIT = Number(arg('wait', 4200));
const OUT = arg('out', 'recon/scratch/3jcn-offline-check.json');

const CW = path.join(ROOT, 'mirror', 'leqixiang', 'courseware');

/* What is left of the network in a page that was rewritten. */
const REMOTE = /(?:src|href)\s*=\s*["'](https?:\/\/[^"']+)|["'](https?:\/\/[^"']+\.js)["']|import\s*\(?\s*["'](https?:\/\/[^"']+)/gi;

function remoteRefs(html) {
  const out = new Set();
  REMOTE.lastIndex = 0;
  let m;
  while ((m = REMOTE.exec(html))) {
    const url = m[1] || m[2] || m[3];
    if (!url) continue;
    /* The pictures a page shows for itself are not part of the program. */
    if (/\/og:image|\/twitter:image|schema\.org/i.test(url)) continue;
    out.add(url);
  }
  return [...out];
}

const PROBE = `(() => {
  const d = document;
  const canvases = [...d.querySelectorAll('canvas')];
  const text = (d.body ? d.body.innerText : '').replace(/\\s+/g, ' ').trim();
  const gl = canvases.map((c) => {
    try {
      const g = c.getContext('webgl2') || c.getContext('webgl');
      return g ? (g.isContextLost() ? 'lost' : 'alive') : 'none';
    } catch (e) {
      return 'none';
    }
  });
  const missing = [...d.querySelectorAll('img')]
    .filter((i) => !i.complete || i.naturalWidth === 0)
    .map((i) => i.getAttribute('src'))
    .slice(0, 5);
  return {
    title: d.title,
    textLen: text.length,
    head: text.slice(0, 100),
    canvases: canvases.length,
    sized: canvases.filter((c) => c.width > 0 && c.height > 0).length,
    gl,
    missingImages: missing,
    scripts: d.querySelectorAll('script').length,
  };
})()`;

const files = fs
  .readdirSync(CW)
  .filter((f) => f.startsWith('lab-') && f.endsWith('.html'))
  .sort();
const list = LIMIT ? files.slice(0, LIMIT) : files;

/* 1. The static truth: what is still pointed at the network. */
const stillRemote = [];
for (const file of files) {
  const html = fs.readFileSync(path.join(CW, file), 'utf8');
  for (const url of remoteRefs(html)) {
    stillRemote.push({ id: file.replace(/\.html$/, ''), url });
  }
}
console.log(`pages: ${files.length}, addresses still pointing outward: ${stillRemote.length}`);
for (const r of stillRemote.slice(0, 15)) console.log(`  ${r.id}  ${r.url.slice(0, 110)}`);

/* 2. The runtime truth: the page is opened and the network is cut. */
let blocked = 0;

/*
 * Every worker gets a tab of its own.  One tab for all of them would
 * have six pages fighting over the same address bar, and the report
 * would blame the wrong page for what went wrong.
 */
const openTab = async () => {
  const client = await connect(CDP);
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('Network.enable');
  await client.send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });

  const state = { errors: [], failed: [] };
  client.on(async (e) => {
    if (e.method !== 'Fetch.requestPaused') return;
    const url = e.params.request?.url || '';
    const local =
      url.startsWith(`http://localhost:${PORT}`) ||
      url.startsWith(`http://127.0.0.1:${PORT}`) ||
      url.startsWith('data:') ||
      url.startsWith('blob:') ||
      url.startsWith('about:');
    try {
      if (local) {
        await client.send('Fetch.continueRequest', { requestId: e.params.requestId });
      } else {
        blocked++;
        await client.send('Fetch.failRequest', {
          requestId: e.params.requestId,
          errorReason: 'ConnectionFailed',
        });
      }
    } catch {
      /* The page moved on; nothing to do. */
    }
  });
  client.on((e) => {
    if (e.method === 'Runtime.exceptionThrown') {
      state.errors.push(
        e.params.exceptionDetails?.exception?.description ||
          e.params.exceptionDetails?.text ||
          'exception'
      );
    }
    if (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error') {
      state.errors.push(
        (e.params.args || []).map((a) => a.value || a.description || '').join(' ').slice(0, 200)
      );
    }
    if (e.method === 'Network.loadingFailed') {
      const u = e.params.request?.url || '';
      if (
        u.startsWith(`http://localhost:${PORT}`) ||
        u.startsWith(`http://127.0.0.1:${PORT}`)
      ) {
        state.failed.push(u);
      }
    }
  });
  return { client, state };
};

const results = [];
let cursor = 0;
async function worker() {
  const { client, state } = await openTab();
  for (;;) {
    const i = cursor++;
    if (i >= list.length) return;
    const file = list[i];
    const id = file.replace(/\.html$/, '');
    state.errors = [];
    state.failed = [];
    try {
      await client.send('Page.navigate', {
        url: `http://localhost:${PORT}/courseware/${file}`,
      });
    } catch {
      /* The tab may be busy; the report below says so. */
    }
    await sleep(WAIT);
    let probe = null;
    try {
      probe = await client.evaluate(PROBE);
    } catch (e) {
      state.errors.push('probe: ' + e.message);
    }
    const ok = !!(
      probe &&
      probe.sized > 0 &&
      !probe.missingImages.length &&
      !state.errors.length &&
      !state.failed.length
    );
    results.push({
      id,
      ok,
      canvases: probe ? probe.canvases : 0,
      sized: probe ? probe.sized : 0,
      gl: probe ? probe.gl : [],
      textLen: probe ? probe.textLen : 0,
      missingImages: probe ? probe.missingImages : [],
      errors: state.errors.slice(0, 4),
      failed: [...new Set(state.failed)].slice(0, 4),
    });
    if (!ok) {
      const r = results[results.length - 1];
      console.log(
        `  ! ${id}  canvas=${r.sized}/${r.canvases} text=${r.textLen}` +
          (r.errors.length ? `  err=${String(r.errors[0]).slice(0, 110)}` : '') +
          (r.failed.length ? `  miss=${r.failed[0].split('/').pop()}` : '')
      );
    }
    if (results.length % 25 === 0) console.log(`${results.length}/${list.length}`);
  }
  await client.close();
}

await Promise.all(Array.from({ length: CONC }, () => worker()));

const good = results.filter((r) => r.ok).length;
console.log(`whole: ${good}/${results.length}, requests cut: ${blocked}`);
fs.writeFileSync(
  path.join(ROOT, OUT),
  JSON.stringify({ stillRemote, results }, null, 1)
);
