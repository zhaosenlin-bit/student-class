#!/usr/bin/env node
/*
 * Draws the wordmark of the library as a picture.
 *
 * The simulations of PhET keep the mark of their own maker in the
 * corner of the screen.  That mark is replaced by the wordmark of
 * 乐启享, so the picture has to be a picture and not a drawing in the
 * page.  This renders the SVG with a browser and writes the PNG.
 *
 *   node tools/render-brand-png.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, sleep } from './cdpx.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BRAND = path.join(ROOT, 'mirror', 'leqixiang', 'brand');
const CDP = Number(process.argv.includes('--cdp') ? process.argv[process.argv.indexOf('--cdp') + 1] : 9222);

const svg = fs.readFileSync(path.join(BRAND, 'brand-wordmark.svg'), 'utf8');
const b64 = Buffer.from(svg, 'utf8').toString('base64');

const client = await connect(CDP);
/* The mark sits on screens of every colour, so it is drawn on paper
   that is not there. */
await client.send('Emulation.setDefaultBackgroundColorOverride', {
  color: { r: 0, g: 0, b: 0, a: 0 },
});
await client.send('Emulation.setDeviceMetricsOverride', {
  width: 546,
  height: 216,
  deviceScaleFactor: 1,
  mobile: false,
});
const page =
  `<body style="margin:0;background:transparent">` +
  `<img src="data:image/svg+xml;base64,${b64}" width="546" height="216"></body>`;
await client.send('Page.navigate', {
  url: `data:text/html;base64,${Buffer.from(page, 'utf8').toString('base64')}`,
});
await sleep(900);
const shot = await client.send('Page.captureScreenshot', {
  format: 'png',
  captureBeyondViewport: true,
  omitBackground: true,
  clip: { x: 0, y: 0, width: 546, height: 216, scale: 1 },
});
fs.writeFileSync(path.join(BRAND, 'brand-wordmark.png'), Buffer.from(shot.data, 'base64'));
client.close();
console.log('brand-wordmark.png 已生成');
