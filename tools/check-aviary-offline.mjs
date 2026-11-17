#!/usr/bin/env node
/*
 * Opens every mirrored program of The Physics Aviary from the disk and
 * reports what is really there: the words of the program, the canvases it
 * draws on, whether those canvases hold any paint, and whether the page
 * asked the network for anything.
 *
 * A program that opens without a word on the canvas is reported as empty,
 * so a broken mirror cannot pass for a working one.
 *
 *   node tools/check-aviary-offline.mjs --only slug,slug [--cdp 9222]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, sleep } from './cdpx.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CW = path.join(ROOT, 'mirror', 'aviary', 'courseware');
const SCRATCH = path.join(ROOT, 'recon', 'scratch');

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const CDP = Number(arg('cdp', 9222));
const ONLY = arg('only', '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const LIMIT = Number(arg('limit', 0));
const SHOTS = arg('shots', '');

const PROBE = `(() => {
  const d = document;
  const text = (d.body ? d.body.innerText : '').replace(/\\s+/g, ' ').trim();
  const canvases = [...d.querySelectorAll('canvas')];
  const painted = canvases.map((c) => {
    try {
      const g = c.getContext('2d');
      if (!g) return { w: c.width, h: c.height, colors: -1 };
      const w = Math.min(c.width, 240), h = Math.min(c.height, 240);
      const px = g.getImageData(0, 0, w, h).data;
      const colors = new Set();
      for (let i = 0; i < px.length; i += 4) {
        colors.add(px[i] + ',' + px[i + 1] + ',' + px[i + 2]);
      }
      return { w: c.width, h: c.height, colors: colors.size };
    } catch (e) {
      return { w: c.width, h: c.height, colors: -2 };
    }
  });
  const missing = [...d.querySelectorAll('img')].filter((i) => !i.complete || i.naturalWidth === 0)
    .map((i) => i.getAttribute('src')).slice(0, 5);
  return {
    title: d.title,
    textLen: text.length,
    head: text.slice(0, 120),
    canvases: painted.length,
    painted,
    images: d.querySelectorAll('img').length,
    missingImages: missing,
    scriptTags: d.querySelectorAll('script').length,
  };
})()`;

const files = fs
  .readdirSync(CW)
  .filter((f) => f.endsWith('.html'))
  .filter((f) => !ONLY.length || ONLY.includes(f.replace(/\.html$/, '')));
const list = LIMIT ? files.slice(0, LIMIT) : files;
console.log(`checking ${list.length} programs`);

const client = await connect(CDP);
await client.send('Page.enable');
await client.send('Runtime.enable');
await client.send('Network.enable');
await client.send('Network.setBlockedURLs', {
  urls: ['*://*'],
});

const results = [];
let errors = [];
let netRequests = [];
let failedFiles = [];
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
      (e.params.args || [])
        .map((a) => a.value || a.description || '')
        .join(' ')
        .slice(0, 200)
    );
  }
  if (e.method === 'Network.requestWillBeSent') {
    const u = e.params.request?.url || '';
    if (!u.startsWith('file://') && !u.startsWith('data:')) netRequests.push(u);
  }
  if (e.method === 'Network.loadingFailed') {
    const u = e.params.request?.url || '';
    /* A file of the program that could not be read is a hole in the
       mirror, whether it is asked for by a tag or by the code. */
    if (u.startsWith('file://')) failedFiles.push(u);
  }
});

for (const file of list) {
  const url = 'file:///' + path.join(CW, file).replace(/\\/g, '/');
  /* A program that draws with the dom instead of a canvas is not
     missing its canvas. */
  const wantsCanvas = /<canvas/i.test(fs.readFileSync(path.join(CW, file), 'utf8'));
  errors = [];
  netRequests = [];
  failedFiles = [];
  client.events.length = 0;
  await client.send('Page.navigate', { url });
  await sleep(2600);
  let probe = null;
  try {
    probe = await client.evaluate(PROBE);
  } catch (e) {
    errors.push('probe: ' + e.message);
  }
  const r = {
    slug: file.replace(/\.html$/, ''),
    ok: !!(
      probe &&
      probe.textLen > 0 &&
      (probe.canvases > 0 || !wantsCanvas) &&
      !probe.missingImages.length &&
      !errors.length &&
      !failedFiles.length
    ),
    textLen: probe ? probe.textLen : 0,
    canvases: probe ? probe.canvases : 0,
    painted: probe ? probe.painted.map((p) => p.colors) : [],
    images: probe ? probe.images : 0,
    missingImages: probe ? probe.missingImages.length : 0,
    errors,
    failedFiles: [...new Set(failedFiles)].slice(0, 6),
    netRequests: [...new Set(netRequests)].slice(0, 5),
  };
  results.push(r);
  if (!r.ok) {
    console.log(
      `  ! ${r.slug}  text=${r.textLen} canvases=${r.canvases} missingImg=${r.missingImages}` +
        (r.errors.length ? `  err=${r.errors[0].slice(0, 120)}` : '') +
        (r.failedFiles.length ? `  nofile=${r.failedFiles[0].split('/').pop()}` : '')
    );
  }
  if (SHOTS && r.ok) {
    const shot = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.mkdirSync(path.join(SCRATCH, 'aviary-shots'), { recursive: true });
    fs.writeFileSync(
      path.join(SCRATCH, 'aviary-shots', `${r.slug}.png`),
      Buffer.from(shot.data, 'base64')
    );
  }
}

client.close();
const good = results.filter((r) => r.ok).length;
console.log(`ok: ${good}/${results.length}`);
fs.writeFileSync(
  path.join(SCRATCH, 'aviary-offline-check.json'),
  JSON.stringify(results, null, 2)
);
