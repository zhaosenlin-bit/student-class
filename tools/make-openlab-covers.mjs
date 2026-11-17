#!/usr/bin/env node
/*
 * Draw a cover for every open lesson.
 *
 * The mirrored courses keep the picture the platform gave them.  The open
 * lessons have none, so they get one that is drawn here: a line motif
 * for the topic, the Chinese title, and the 乐启享 mark.  Everything is
 * vector, so the cards stay sharp on any screen.
 *
 *   node tools/make-openlab-covers.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CATALOG = path.join(ROOT, 'mirror', 'openlab', 'catalog.json');
const OUT = path.join(ROOT, 'mirror', 'leqixiang', 'brand', 'openlab');

const catalogue = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));

/* One line drawing per topic.  Every motif is drawn in the same two
   strokes so a shelf of cards reads as one series. */
const MOTIFS = {
  'simple-pendulum': (c) => `
    <path d="M470 120 L470 250" />
    <path d="M470 250 m-34 0 a34 34 0 1 0 68 0 a34 34 0 1 0 -68 0" />
    <path d="M300 330 L560 300" />`,
  'simple-oscillations': (c) => `
    <path d="M300 250 q60 -110 120 0 t120 0" />
    <path d="M300 300 q60 -110 120 0 t120 0" opacity=".5" />`,
  'projectile-motion': (c) => `
    <path d="M290 320 q120 -180 290 -190" stroke-dasharray="8 10" />
    <path d="M290 320 L290 130" opacity=".45" />
    <path d="M290 320 L580 130" opacity=".45" />`,
  'work-energy-principle': (c) => `
    <path d="M300 180 L470 180" />
    <path d="M470 180 L560 300 L470 300 Z" />`,
  'conservation-of-energy': (c) => `
    <circle cx="440" cy="230" r="78" />
    <path d="M440 152 L440 308 M362 230 L518 230" opacity=".4" />`,
  'conservation-of-momentum': (c) => `
    <circle cx="380" cy="230" r="46" />
    <circle cx="530" cy="230" r="34" />
    <path d="M426 230 L496 230" />
    <path d="M486 222 L498 230 L486 238" />`,
  'newtons-laws-of-motion': (c) => `
    <rect x="300" y="180" width="120" height="120" rx="6" />
    <path d="M420 240 L570 240" />
    <path d="M560 232 L578 240 L560 248" />`,
  'orbital-mechanics': (c) => `
    <ellipse cx="440" cy="240" rx="150" ry="66" />
    <circle cx="440" cy="240" r="26" />
    <circle cx="590" cy="240" r="13" />`,
  'gravitational-waves': (c) => `
    <path d="M280 240 q40 -70 80 0 t80 0 t80 0" />
    <path d="M280 300 q40 -70 80 0 t80 0 t80 0" opacity=".45" />`,
  'rotational-dynamics': (c) => `
    <circle cx="440" cy="240" r="86" />
    <path d="M440 240 L500 190" />
    <path d="M494 186 L508 188 L506 202" />`,
  'wave-equation': (c) => `
    <path d="M280 240 q45 -80 90 0 t90 0 t90 0" />
    <path d="M280 300 q45 -50 90 0 t90 0 t90 0" opacity=".45" />`,
  'wave-interference': (c) => `
    <path d="M290 200 q45 -60 90 0 t90 0" opacity=".7" />
    <path d="M290 280 q45 -60 90 0 t90 0" opacity=".7" />
    <path d="M470 240 q45 -60 90 0" />`,
  diffraction: (c) => `
    <path d="M290 150 L440 240" />
    <path d="M290 330 L440 240" />
    <path d="M440 240 q80 -40 140 0" opacity=".6" />`,
  'double-slit-experiment': (c) => `
    <path d="M280 240 L400 240" />
    <path d="M400 190 L400 290" />
    <path d="M400 215 L560 215" />
    <path d="M400 265 L560 265" />`,
  'polarization-of-waves': (c) => `
    <path d="M280 200 L300 280 M330 200 L350 280 M380 200 L400 280 M430 200 L450 280 M480 200 L500 280 M530 200 L550 280" />
    <path d="M280 320 L560 320" opacity=".5" />`,
  'electric-fields': (c) => `
    <path d="M300 320 L300 160 M300 240 m-10 0 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0" />
    <path d="M390 320 L390 160 M390 240 m-10 0 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0" />
    <path d="M480 320 L480 160 M480 240 m-10 0 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0" />`,
  'magnetic-fields': (c) => `
    <path d="M300 240 m-46 0 a46 46 0 1 0 92 0 a46 46 0 1 0 -92 0" />
    <path d="M440 240 m-46 0 a46 46 0 1 0 92 0 a46 46 0 1 0 -92 0" />
    <path d="M346 240 L394 240 M486 240 L534 240" />`,
  'special-relativity': (c) => `
    <path d="M300 300 L470 300 L540 180 L370 180 Z" />
    <path d="M420 240 m-22 0 a22 22 0 1 0 44 0 a22 22 0 1 0 -44 0" />`,
  'chaos-and-nonlinear-dynamics': (c) => `
    <path d="M300 300 q70 -170 140 -60 t130 -120" stroke-dasharray="7 9" />
    <circle cx="440" cy="240" r="60" opacity=".35" />`,
  'lagrangian-hamiltonian-mechanics': (c) => `
    <ellipse cx="440" cy="240" rx="140" ry="80" />
    <ellipse cx="440" cy="240" rx="70" ry="140" />
    <circle cx="440" cy="240" r="12" />`,
  'noethers-theorem': (c) => `
    <path d="M440 150 L540 300 L340 300 Z" />
    <circle cx="440" cy="245" r="16" />`,
  'principle-of-least-action': (c) => `
    <path d="M290 300 Q440 110 580 300" />
    <path d="M290 300 L580 300" opacity=".4" />
    <path d="M430 300 L440 236 L450 300" />`,
};

/* The palette.  Each topic gets its own pair so a row of cards is easy
   to tell apart, and none of them is a single hue across the set. */
const PALETTE = [
  ['#245c40', '#c9dfba', '#f2f6ef'],
  ['#1d4e6f', '#bcd6e6', '#eef4f7'],
  ['#7a3b2e', '#eccfc2', '#faf1ec'],
  ['#4a3a7a', '#cfc6e6', '#f2f0f8'],
  ['#7a5a12', '#ecdfb4', '#fbf6e8'],
  ['#285c52', '#b9dcd4', '#eef6f4'],
  ['#8a2f4a', '#eec6d2', '#f9eff3'],
  ['#3c5a2a', '#cddcc0', '#f1f6ec'],
];

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function cover(entry, index) {
  const [ink, tint, paper] = PALETTE[index % PALETTE.length];
  const motif = MOTIFS[entry.slug];
  const title = esc(entry.title);
  const titleSize = title.length > 8 ? 46 : 56;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 405" width="720" height="405" role="img" aria-label="${title} 乐启享课件封面">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${paper}"/>
      <stop offset="1" stop-color="#fffefa"/>
    </linearGradient>
  </defs>
  <rect width="720" height="405" fill="url(#bg)"/>
  <rect x="0" y="0" width="720" height="405" fill="${tint}" opacity=".38"/>
  <g fill="none" stroke="${ink}" stroke-opacity=".26" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    ${motif ? motif(ink) : ''}
  </g>
  <g fill="${ink}">
    <text x="48" y="300" font-family="'PingFang SC','Microsoft YaHei',sans-serif" font-size="${titleSize}" font-weight="700" letter-spacing="2">${title}</text>
    <text x="50" y="338" font-family="'PingFang SC','Microsoft YaHei',sans-serif" font-size="17" letter-spacing="2" opacity=".68">${esc(entry.tagline)}</text>
    <text x="48" y="86" font-family="'PingFang SC','Microsoft YaHei',sans-serif" font-size="20" font-weight="700" letter-spacing="5" opacity=".85">乐启享</text>
  </g>
</svg>
`;
}

fs.mkdirSync(OUT, { recursive: true });
catalogue.forEach((entry, index) => {
  fs.writeFileSync(path.join(OUT, `${entry.slug}.svg`), cover(entry, index));
});
console.log(`封面已生成：${catalogue.length} 张 → mirror/leqixiang/brand/openlab/`);
