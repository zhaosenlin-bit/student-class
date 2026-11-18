#!/usr/bin/env node
/*
 * Repaint the daylight palette with the colours of the 乐启享 logo.
 *
 * The daylight sheet was written with a family of warm greys: every
 * surface, every hair line and every shade of text came from one grey
 * ramp.  A grey ramp is what made the light theme look tired, so the
 * ramp is rebuilt here — the lightness of every colour is kept exactly
 * as it was, and only the hue and the saturation move to the indigo of
 * the logo.  Nothing about the layout changes; only the paint does.
 *
 *   node tools/repaint-day-palette.mjs <file> [<file> ...]
 *
 * Colours that carry a meaning of their own (the amber of the logo,
 * the blue of a chart) are left alone: only the greys are repainted.
 */
import fs from 'node:fs';

/* The hue and the saturation of the house colour, band by lightness. */
const BANDS = [
  { from: 0.86, h: 222, s: 0.26 }, /* the surfaces */
  { from: 0.72, h: 222, s: 0.26 }, /* the raised panels */
  { from: 0.56, h: 224, s: 0.22 }, /* the strong lines */
  { from: 0.42, h: 226, s: 0.18 }, /* the quiet text */
  { from: 0.26, h: 228, s: 0.20 }, /* the secondary text */
  { from: 0.0, h: 230, s: 0.3 }, /* the ink */
];

function expand(hex) {
  if (hex.length === 3 || hex.length === 4) {
    return hex.split('').map((c) => c + c).join('');
  }
  return hex;
}

function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

function repaint(hex) {
  const full = expand(hex);
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const alpha = full.length === 8 ? full.slice(6, 8) : '';
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  /* A colour that says something of its own keeps its own hue. */
  if (max - min > 30) return null;
  const l = (max + min) / 2 / 255;
  const band = BANDS.find((x) => l >= x.from);
  const [nr, ng, nb] = hslToRgb(band.h, band.s, l);
  const out = [nr, ng, nb].map((v) => v.toString(16).padStart(2, '0')).join('');
  return '#' + out + alpha;
}

let changed = 0;
let kept = 0;

for (const file of process.argv.slice(2)) {
  let text = fs.readFileSync(file, 'utf8');
  const before = text;
  text = text.replace(/#([0-9a-fA-F]{3,8})\b/g, (full, hex) => {
    const next = repaint(hex);
    if (!next) {
      kept++;
      return full;
    }
    if (next.toLowerCase() === full.toLowerCase()) return full;
    changed++;
    return next;
  });
  if (text !== before) {
    fs.writeFileSync(file, text);
    console.log(`${file}: ${changed} colours repainted, ${kept} kept`);
  } else {
    console.log(`${file}: nothing left to repaint`);
  }
}
