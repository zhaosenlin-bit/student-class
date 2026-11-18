#!/usr/bin/env node
/*
 * Cuts the pieces of the logo of 乐启享 out of the one picture that the
 * house has, and writes them where the library needs them:
 *
 *   brand/brand-mark.png        the little creature on its own, for the
 *                               header, the footer and the about sheet
 *   brand/brand-mark-small.png  the same creature, small, for the loading
 *                               screen of the simulations
 *   brand/lq-splash.svg         the loading screen of 乐启享
 *   brand/brand-wordmark.svg    the mark of the house, for the corner of
 *                               a simulation
 *   brand/brand-wordmark-on-dark.svg   the same mark for a dark screen
 *
 * The picture of the logo is the truth here, so it is cut and never
 * drawn again by hand.
 *
 *   node tools/make-brand-art.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { decodePNG } from './png.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BRAND = path.join(ROOT, 'mirror', 'leqixiang', 'brand');

/* the rows and columns of the creature inside the picture of the logo */
const MARK = { x: 164, y: 101, w: 426, h: 345 };
const SMALL_SCALE = 0.27;
const SMALL_COLOURS = 16;

/* --------------------------------------------------------------- the png --- */

function crcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
}
const CRC = crcTable();

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  let crc = 0xffffffff;
  for (const b of body) crc = CRC[(crc ^ b) & 0xff] ^ (crc >>> 8);
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([len, body, tail]);
}

function writePNG(file, width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  fs.writeFileSync(
    file,
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', ihdr),
      chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
      chunk('IEND', Buffer.alloc(0)),
    ])
  );
}

/* The region of the logo is taken as it is, pixel for pixel. */
function cut(png) {
  const ch = png.channels;
  const out = Buffer.alloc(MARK.w * MARK.h * 4);
  for (let y = 0; y < MARK.h; y++) {
    for (let x = 0; x < MARK.w; x++) {
      const sx = Math.min(png.width - 1, MARK.x + x);
      const sy = Math.min(png.height - 1, MARK.y + y);
      const si = (sy * png.width + sx) * ch;
      const di = (y * MARK.w + x) * 4;
      out[di] = png.data[si];
      out[di + 1] = png.data[si + 1];
      out[di + 2] = png.data[si + 2];
      out[di + 3] = ch === 4 ? png.data[si + 3] : 255;
    }
  }
  return out;
}

/* A box filter keeps the edges of the mark soft when it grows smaller. */
function shrink(rgba, w, h, scale) {
  const ow = Math.round(w * scale);
  const oh = Math.round(h * scale);
  const out = Buffer.alloc(ow * oh * 4);
  for (let y = 0; y < oh; y++) {
    const ys = Math.floor((y * h) / oh);
    const ye = Math.max(ys + 1, Math.floor(((y + 1) * h) / oh));
    for (let x = 0; x < ow; x++) {
      const xs = Math.floor((x * w) / ow);
      const xe = Math.max(xs + 1, Math.floor(((x + 1) * w) / ow));
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let n = 0;
      for (let sy = ys; sy < ye; sy++) {
        for (let sx = xs; sx < xe; sx++) {
          const si = (sy * w + sx) * 4;
          const sa = rgba[si + 3];
          r += rgba[si] * sa;
          g += rgba[si + 1] * sa;
          b += rgba[si + 2] * sa;
          a += sa;
          n++;
        }
      }
      const di = (y * ow + x) * 4;
      if (a > 0) {
        out[di] = Math.round(r / a);
        out[di + 1] = Math.round(g / a);
        out[di + 2] = Math.round(b / a);
      }
      out[di + 3] = Math.round(a / n);
    }
  }
  return { data: out, width: ow, height: oh };
}

/*
 * The artwork carries a soft gradient, so a small copy of it holds
 * hundreds of shades.  The copy that goes into the loading screen keeps
 * the colours that are seen most often and leaves the transparency of
 * every pixel alone, which keeps the edges of the mark soft.
 */
function reduceColours(rgba, count) {
  const seen = new Map();
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3] < 8) continue;
    const k = (rgba[i] << 16) | (rgba[i + 1] << 8) | rgba[i + 2];
    seen.set(k, (seen.get(k) || 0) + 1);
  }
  const keys = [...seen.entries()].sort((a, b) => b[1] - a[1]).map((e) => e[0]);
  const pal = [];
  for (const k of keys) {
    if (pal.length >= count) break;
    const r = (k >> 16) & 255;
    const g = (k >> 8) & 255;
    const b = k & 255;
    const near = pal.some((p) => {
      const dr = p[0] - r;
      const dg = p[1] - g;
      const db = p[2] - b;
      return dr * dr + dg * dg + db * db < 900;
    });
    if (!near) pal.push([r, g, b]);
  }
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3] < 8) continue;
    let best = 0;
    let bestD = Infinity;
    for (let p = 0; p < pal.length; p++) {
      const dr = rgba[i] - pal[p][0];
      const dg = rgba[i + 1] - pal[p][1];
      const db = rgba[i + 2] - pal[p][2];
      const d = dr * dr + dg * dg + db * db;
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    rgba[i] = pal[best][0];
    rgba[i + 1] = pal[best][1];
    rgba[i + 2] = pal[best][2];
  }
}

/* The mark on a dark screen is the same picture, lifted into the light. */
function lighten(rgba, amount) {
  const out = Buffer.from(rgba);
  for (let i = 0; i < out.length; i += 4) {
    if (out[i + 3] < 8) continue;
    for (let k = 0; k < 3; k++) {
      out[i + k] = Math.round(out[i + k] + (255 - out[i + k]) * amount);
    }
  }
  return out;
}

/* ------------------------------------------------------------ the splash --- */

function picture(file) {
  return `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`;
}

function splash(markPng) {
  const uri = picture(markPng);
  const w = 62;
  const h = 50;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 275 104" width="275" height="104" role="img" aria-label="乐启享机器人">
  <title>乐启享机器人</title>
  <defs>
    <radialGradient id="lqGlow" cx="50%" cy="40%" r="52%">
      <stop offset="0%" stop-color="#4356ad" stop-opacity="0.26"/>
      <stop offset="100%" stop-color="#4356ad" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <circle cx="137" cy="36" r="46" fill="url(#lqGlow)">
    <animate attributeName="r" values="43;48;43" dur="3.6s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0.8;1;0.8" dur="3.6s" repeatCount="indefinite"/>
  </circle>

  <!-- the creature of the logo, as the house drew it -->
  <image x="${(275 - w) / 2}" y="0" width="${w}" height="${h}" xlink:href="${uri}" href="${uri}">
    <animate attributeName="y" values="0;4;0" dur="4.4s" repeatCount="indefinite"/>
  </image>

  <text x="137" y="84" text-anchor="middle" font-family="'Microsoft YaHei','PingFang SC','Hiragino Sans GB',sans-serif" font-size="29" font-weight="700" letter-spacing="2">
    <tspan fill="#4356ad">乐</tspan><tspan fill="#f0a22e">启</tspan><tspan fill="#4356ad">享</tspan>
  </text>
  <text x="137" y="99" text-anchor="middle" font-family="'Helvetica Neue',Arial,sans-serif" font-size="8.5" letter-spacing="5.2" fill="#7d8698">LEQIXIANG</text>
</svg>
`;
}

/* ------------------------------------------------------- the corner mark --- */

function wordmark(markPng, dark) {
  const uri = picture(markPng);
  const w = 70;
  const h = 57;
  const ink = dark ? '#ffffff' : '#4356ad';
  const honey = dark ? '#f7b84b' : '#f0a22e';
  const quiet = dark ? '#b9c2d6' : '#7d8698';
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 273 108" width="273" height="108" role="img" aria-label="乐启享">
  <title>乐启享</title>

  <!-- the creature of the logo, as the house drew it -->
  <image x="14" y="12" width="${w}" height="${h}" xlink:href="${uri}" href="${uri}"/>

  <text x="92" y="60" font-family="'Microsoft YaHei','PingFang SC','Hiragino Sans GB',sans-serif" font-size="42" font-weight="700" letter-spacing="1">
    <tspan fill="${ink}">乐</tspan><tspan fill="${honey}">启</tspan><tspan fill="${ink}">享</tspan>
  </text>
  <text x="94" y="82" font-family="'Helvetica Neue',Arial,sans-serif" font-size="9" letter-spacing="5.4" fill="${quiet}">LEQIXIANG</text>
</svg>
`;
}

/* ------------------------------------------------------------------ run --- */

const logo = decodePNG(fs.readFileSync(path.join(BRAND, 'brand-logo.png')));
const full = cut(logo);
writePNG(path.join(BRAND, 'brand-mark.png'), MARK.w, MARK.h, full);

const small = shrink(full, MARK.w, MARK.h, SMALL_SCALE);
reduceColours(small.data, SMALL_COLOURS);
const smallFile = path.join(BRAND, 'brand-mark-small.png');
writePNG(smallFile, small.width, small.height, small.data);

const lightFile = path.join(BRAND, 'brand-mark-small-light.png');
writePNG(lightFile, small.width, small.height, lighten(small.data, 0.42));

fs.writeFileSync(path.join(BRAND, 'lq-splash.svg'), splash(smallFile));
fs.writeFileSync(path.join(BRAND, 'brand-wordmark.svg'), wordmark(smallFile, false));
fs.writeFileSync(path.join(BRAND, 'brand-wordmark-on-dark.svg'), wordmark(lightFile, true));

console.log(
  `品牌图形已生成：brand-mark.png ${MARK.w}x${MARK.h}，brand-mark-small.png ${small.width}x${small.height}`
);
