#!/usr/bin/env node
/*
 * Opens a downloaded copy the way a teacher does: unzipped, opened with
 * the launcher that came with it, with the network cut off.
 *
 * The archive is fetched from the local server and unpacked into a
 * folder.  Some courses are written as modules, and some read a file
 * with XHR; a browser refuses both from the disk, so the archive ships
 * a small launcher that hands the folder out over the local address.
 * The test therefore opens the page the way the launcher does — over
 * http://127.0.0.1 — and cuts every other address.  A page that paints
 * and asks nothing of the outside world is whole.
 *
 *   node tools/check-lq-zip-offline.mjs --ids id,id [--limit 5]
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { connect, sleep } from './cdpx.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const PORT = Number(arg('port', 4173));
const LIMIT = Number(arg('limit', 0));
const OUT = path.join(ROOT, 'recon', 'scratch', 'zip-offline');

const catalog = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'mirror', 'leqixiang', 'catalog.json'), 'utf8')
);
const products = catalog.products || catalog;

const ids = arg('ids', '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const list = ids.length
  ? products.filter((p) => ids.includes(p.id)).map((p) => p.id)
  : products
      .filter((p) => p.id.startsWith('lab-'))
      .map((p) => p.id);
const run = LIMIT ? list.slice(0, LIMIT) : list;

fs.mkdirSync(OUT, { recursive: true });

const client = await connect(Number(arg('cdp', 9222)));
await client.send('Page.enable');
await client.send('Runtime.enable');
await client.send('Network.enable');
await client.send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });

/*
 * The launcher that comes with the archive: it hands the folder out over
 * the local address.  The test uses the same shape, without opening a
 * browser window.
 */
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.mp4': 'video/mp4',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.typeface.json': 'application/json; charset=utf-8',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
};
let served = '';
const local = http.createServer((req, res) => {
  let rel = decodeURIComponent((req.url || '/').split('?')[0]);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.join(served, rel);
  if (!file.startsWith(served)) {
    res.writeHead(403).end('forbidden');
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type':
        TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
});
const LOCAL_PORT = 8741;
await new Promise((resolve) => local.listen(LOCAL_PORT, '127.0.0.1', resolve));

let blocked = 0;
const blockedUrls = [];
client.on(async (e) => {
  if (e.method !== 'Fetch.requestPaused') return;
  const url = e.params.request?.url || '';
  const ours =
    url.startsWith('file://') ||
    url.startsWith('data:') ||
    url.startsWith('blob:') ||
    url.startsWith('about:') ||
    url.startsWith(`http://127.0.0.1:${LOCAL_PORT}/`);
  try {
    if (ours) {
      await client.send('Fetch.continueRequest', { requestId: e.params.requestId });
    } else {
      blocked++;
      blockedUrls.push(url);
      await client.send('Fetch.failRequest', {
        requestId: e.params.requestId,
        errorReason: 'ConnectionFailed',
      });
    }
  } catch {
    /* The page moved on. */
  }
});

let errors = [];
let failed = [];
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
  if (e.method === 'Network.loadingFailed') {
    const u = e.params.request?.url || '';
    if (u.startsWith('file://') || u.startsWith(`http://127.0.0.1:${LOCAL_PORT}/`)) {
      failed.push(u);
    }
  }
});

const results = [];
for (const id of run) {
  const res = await fetch(`http://127.0.0.1:${PORT}/api/downloads/file/${id}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const isZip = buffer.slice(0, 2).toString() === 'PK';
  if (!isZip) {
    results.push({ id, ok: false, why: `not a zip (${res.status})` });
    continue;
  }
  const dir = path.join(OUT, id);
  fs.mkdirSync(dir, { recursive: true });
  const zip = path.join(OUT, `${id}.zip`);
  fs.writeFileSync(zip, buffer);
  /* Unpacking by hand: the archive holds few files and no folders. */
  const { execFileSync } = await import('node:child_process');
  try {
    execFileSync('powershell', [
      '-NoProfile',
      '-Command',
      `Expand-Archive -LiteralPath '${zip.replace(/'/g, "''")}' -DestinationPath '${dir.replace(/'/g, "''")}' -Force`,
    ]);
  } catch (err) {
    results.push({ id, ok: false, why: 'unpack failed' });
    continue;
  }
  const html = fs
    .readdirSync(dir)
    .find((f) => f.endsWith('.html'));
  if (!html) {
    results.push({ id, ok: false, why: 'no html inside' });
    continue;
  }
  errors = [];
  failed = [];
  blockedUrls.length = 0;
  served = dir;
  const url = `http://127.0.0.1:${LOCAL_PORT}/${encodeURIComponent(html)}`;
  await client.send('Page.navigate', { url });
  await sleep(5200);
  let probe = null;
  try {
    probe = await client.evaluate(`(() => {
      /*
       * A course may show its work in a frame of its own — the map
       * courses do — so the frame is read as well.  The teacher sees
       * what is inside it.
       */
      const pick = (d) => {
        const canvases = [...d.querySelectorAll('canvas')];
        const text = (d.body ? d.body.innerText : '').replace(/\\s+/g, ' ').trim();
        return {
          title: d.title,
          textLen: text.length,
          canvases: canvases.length,
          sized: canvases.filter((c) => c.width > 0 && c.height > 0).length,
          nodes: d.querySelectorAll('*').length,
        };
      };
      const frames = [...document.querySelectorAll('iframe')]
        .map((f) => f.contentDocument)
        .filter(Boolean);
      return [pick(document), ...frames.map(pick)];
    })()`);
  } catch (e) {
    errors.push('probe: ' + e.message);
  }
  const parts = probe || [];
  const canvases = parts.reduce((a, p) => a + p.canvases, 0);
  const sized = parts.reduce((a, p) => a + p.sized, 0);
  const nodes = parts.reduce((a, p) => a + p.nodes, 0);
  const textLen = parts.reduce((a, p) => a + p.textLen, 0);
  /*
   * A course that draws on a canvas is whole when the canvas is painted;
   * a course that works with sliders and text is whole when it says
   * something.  What is not allowed either way is an error, or a file
   * of the archive that could not be read.
   */
  const ok = !!(
    parts.length &&
    (sized > 0 || textLen > 60) &&
    nodes > 20 &&
    !errors.length &&
    !failed.length
  );
  results.push({
    id,
    ok,
    bytes: buffer.length,
    canvases,
    sized,
    textLen,
    nodes,
    errors: errors.slice(0, 3),
    failed: [...new Set(failed)].slice(0, 4),
    blocked: [...new Set(blockedUrls)].slice(0, 3),
  });
  if (!ok) {
    console.log(
      `  ! ${id}  canvas=${results[results.length - 1].sized}/${probe?.canvases || 0}` +
        (errors.length ? `  err=${String(errors[0]).slice(0, 110)}` : '') +
        (failed.length ? `  miss=${[...new Set(failed)][0].split('/').pop()}` : '')
    );
  }
  if (results.length % 10 === 0) console.log(`${results.length}/${run.length}`);
}

client.close();
local.close();
const good = results.filter((r) => r.ok).length;
console.log(`whole: ${good}/${results.length}, requests cut: ${blocked}`);
fs.writeFileSync(
  path.join(ROOT, 'recon', 'scratch', 'zip-offline-check.json'),
  JSON.stringify(results, null, 1)
);
