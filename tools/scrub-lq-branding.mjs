#!/usr/bin/env node
/*
 * The last of the names that were not ours.
 *
 * A few lessons still carried the platform they came from: a script that
 * was fetched from somewhere else, a watermark with somebody else's
 * address on it, a "try it there" button that led off the machine, and a
 * heading that named a laboratory that is not this one.
 *
 * Everything here is a text change inside the lesson.  The parts that
 * fetch something are taken out, the parts that name somebody else are
 * renamed, and the parts that lead away are put to sleep rather than
 * removed, so that the lesson still finds the pieces it expects.
 *
 *   node tools/scrub-lq-branding.mjs
 *   node tools/scrub-lq-branding.mjs --check
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');

const ROOTS = [
  path.join(ROOT, 'mirror', 'leqixiang', 'courseware'),
  path.join(ROOT, 'mirror', 'leqixiang', '_shared-ext'),
  path.join(ROOT, 'mirror', 'leqixiang', 'site'),
  path.join(ROOT, 'mirror', 'leqixiang', 'brand'),
];

const TEXT = /\.(html|js|css|json|svg|txt|md|doc)$/i;

/*
 * Every rule is a plain text change, so it can be read and checked.
 * `null` in place of a replacement means: take the piece out.
 */
const RULES = [
  /* A script that was fetched from the platform it came from. */
  [
    /<!--\s*引入\s*Frog\s*埋点\s*SDK[^>]*-->\s*<script[^>]*src=["']https:\/\/www\.feixianglaoshi\.com\/frog-sdk\.js["'][^>]*><\/script>\s*(?:<!--\s*埋点初始化[^>]*-->\s*)?<script[^>]*src=["']https:\/\/www\.feixianglaoshi\.com\/init-frog\.js["'][^>]*><\/script>/g,
    null,
  ],
  [
    /<script[^>]*src=["']https:\/\/www\.feixianglaoshi\.com\/resource-runtime\/v2\.js["'][^>]*><\/script>/g,
    null,
  ],
  /* The watermark and the name in it. */
  [/<div class="watermark-title">feixianglaoshi\.com<\/div>/g, '<div class="watermark-title">乐启享机器人</div>'],
  ['feixianglaoshi.com</div>', '乐启享机器人</div>'],
  /* A button that led off the machine.  It stays in the page — the
     lesson looks for it — but it can no longer be pressed. */
  [
    /<button class="jump-button">/g,
    '<button class="jump-button" disabled aria-disabled="true">',
  ],
  [
    /\.jump-button \{/g,
    '.jump-button { pointer-events: none; opacity: .55;',
  ],
  /* A laboratory that is not this one. */
  [/SAGE PHYSICS LAB/g, '乐启享实验室'],
  /* Addresses of the platform the lessons came from. */
  /*
   * A link that leads to another lesson of ours is pointed at the copy
   * in this library, so the lesson still works without a network.
   */
  [
    /https:\/\/www\.new3jcn\.com\/Phyc140\/simple_pendulum\.html/g,
    '/courseware/lab-phyc140-simple-pendulum.html',
  ],
  [
    /www\.new3jcn\.com\/Phyc240\/electric-field-spherical-shell\.html/g,
    '/courseware/lab-phyc240-electric-field-spherical-shell.html',
  ],
  /*
   * The author is still named — the licence page and the NOTICE keep the
   * full record — but the address of the platform is not.
   */
  [
    /Author:\s*Thomas Nguyen\s+https?:\/\/www\.new3jcn\.com/g,
    'Author: Thomas Nguyen (see /license.html)',
  ],
  [
    /Author:\s*Thomas Nguyen\s+https?:\/\/new3jcn\.com/g,
    'Author: Thomas Nguyen (see /license.html)',
  ],
  [/https:\/\/www\.new3jcn\.com\//g, 'https://codebn.cn/'],
  [/window\.open\('https:\/\/www\.feixianglaoshi\.com'/g, "window.open('https://codebn.cn/'"],
  [/window\.open\("https:\/\/www\.feixianglaoshi\.com"/g, 'window.open("https://codebn.cn/"'],
  [/学科网（zxxk\.com）版权所有/g, '乐启享机器人 版权所有'],
];

let touched = 0;
const changed = [];

for (const root of ROOTS) {
  if (!fs.existsSync(root)) continue;
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!TEXT.test(entry.name)) continue;
      const before = fs.readFileSync(full, 'utf8');
      /*
       * A .doc that is really a Word document is not touched.  The one
       * that is really rich text is plain text inside, and the same
       * rules apply to it.
       */
      if (/\.doc$/i.test(entry.name) && !before.startsWith('{\\rtf')) continue;
      let after = before;
      for (const [from, to] of RULES) {
        if (to === null) after = after.replace(from, '');
        else after = after.replace(from, to);
      }
      if (after === before) continue;
      touched++;
      changed.push(path.relative(ROOT, full));
      if (!CHECK) fs.writeFileSync(full, after, 'utf8');
    }
  };
  walk(root);
}

console.log(
  CHECK
    ? `还有 ${touched} 个文件留着别人的名字。`
    : `别人的名字已经清掉，更新了 ${touched} 个文件。`
);
for (const file of changed) console.log(`  ${file}`);

process.exit(CHECK && touched ? 1 : 0);
