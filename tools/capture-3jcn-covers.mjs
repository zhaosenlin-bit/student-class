#!/usr/bin/env node
/*
 * Takes a picture of every 3D physics laboratory of 3JCN, so the
 * library shows a picture of the laboratory instead of a grey square.
 *
 * Several tabs work at once: each simulation draws into a canvas and
 * takes a few seconds to wake up, so one tab at a time would spend
 * most of the night waiting.
 *
 *   node tools/capture-3jcn-covers.mjs [--cdp 9222] [--port 4173] [--conc 5]
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
const CONC = Number(arg('conc', 5));

const OUT = path.join(ROOT, 'mirror', '3jcn', 'brand');
fs.mkdirSync(OUT, { recursive: true });

const catalog = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'mirror', '3jcn', 'catalog.json'), 'utf8')
);

/* The library only carries the courses that passed the quality gate. */
const decisionsPath = path.join(ROOT, 'mirror', 'leqixiang', 'quality-decisions.json');
const dropped = new Set(
  fs.existsSync(decisionsPath)
    ? Object.keys(JSON.parse(fs.readFileSync(decisionsPath, 'utf8')).drop || {})
    : []
);

const todo = catalog
  .map((lesson) => lesson.slug)
  .filter((slug) => !dropped.has(`lab-${slug.replace(/^3jcn-/, '')}`));

const BOX = `(() => {
  const el = document.querySelector('canvas') || document.querySelector('iframe');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 60 || r.height < 60) return null;
  return {
    x: Math.max(0, r.x),
    y: Math.max(0, r.y),
    width: Math.min(r.width, window.innerWidth - Math.max(0, r.x)),
    height: Math.min(r.height, window.innerHeight - Math.max(0, r.y)),
  };
})()`;

let cursor = 0;
let done = 0;
let painted = 0;
let whole = 0;

const worker = async () => {
  const client = await connect(CDP);
  try {
    await client.send('Page.enable');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1200,
      height: 750,
      deviceScaleFactor: 1,
      mobile: false,
    });
    while (cursor < todo.length) {
      const slug = todo[cursor++];
      const file = path.join(OUT, `${slug}.png`);
      if (fs.existsSync(file) && fs.statSync(file).size > 2000) {
        done++;
        continue;
      }
      client.send('Page.navigate', {
        url: `http://localhost:${PORT}/courseware/lab-${slug.replace(/^3jcn-/, '')}.html`,
      }).catch(() => {});
      /*
       * The laboratory draws into a canvas.  The picture is taken once
       * the canvas is there and has had a moment to draw.
       */
      let box = null;
      for (let i = 0; i < 14; i++) {
        await sleep(170);
        box = await client.evaluate(BOX).catch(() => null);
        if (box) break;
      }
      await sleep(500);
      let shot = null;
      if (box) {
        shot = await client.send('Page.captureScreenshot', {
          format: 'png',
          clip: { ...box, scale: 1 },
        });
        painted++;
      } else {
        /* No canvas: the picture of the whole page is better than none. */
        shot = await client.send('Page.captureScreenshot', { format: 'png' });
        whole++;
      }
      if (shot?.data) {
        fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
      }
      done++;
      if (done % 25 === 0) console.log(`${done}/${todo.length} covers`);
    }
  } finally {
    await client.close();
  }
};

await Promise.all(Array.from({ length: CONC }, () => worker()));
console.log(
  `done: ${done} covers（${painted} 取自画布，${whole} 取自整页），共 ${todo.length} 门`
);
