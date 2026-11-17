#!/usr/bin/env node
/*
 * Draws the wordmark of this library as a picture.
 *
 * A simulation of somebody else's house carries that house's own mark
 * in the corner of its screen.  The mark of this library takes its
 * place there, and a simulation keeps the shape of the picture it
 * expects, so the corner does not shift.
 *
 *   node tools/make-wordmark.mjs [--cdp 9226]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, sleep } from './cdp2.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BRAND = path.join(ROOT, 'mirror', 'leqixiang', 'brand');
const CDP = Number(process.env.CDP_PORT || 9226);

/* The size the simulations of the house expect of their own mark. */
const W = 273;
const H = 108;

const JOBS = [
  { svg: 'brand-wordmark-on-dark.svg', png: 'brand-wordmark-on-dark.png' },
  { svg: 'brand-wordmark.svg', png: 'brand-wordmark-light.png' },
];

const browser = await connect(CDP);
/* A picture with no background of its own, so it sits on any screen. */
await browser.raw('Emulation.setDefaultBackgroundColorOverride', {
  color: { r: 0, g: 0, b: 0, a: 0 },
}, browser.pageSession);
await browser.raw(
  'Emulation.setDeviceMetricsOverride',
  { width: W, height: H, deviceScaleFactor: 1, mobile: false },
  browser.pageSession
);

for (const job of JOBS) {
  const svg = fs.readFileSync(path.join(BRAND, job.svg), 'utf8');
  const page =
    '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">' +
    '<style>html,body{margin:0;padding:0;background:transparent;overflow:hidden}</style>' +
    `</head><body>${svg}</body></html>`;
  await browser.goto('data:text/html;charset=utf-8,' + encodeURIComponent(page));
  await sleep(700);
  const file = path.join(BRAND, job.png);
  await browser.shot(file, { format: 'png', omitBackground: true });
  console.log(`${job.png}  ${fs.statSync(file).size} bytes`);
}

await browser.close();
