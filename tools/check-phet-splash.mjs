#!/usr/bin/env node
/*
 * Looks at the loading screen of every simulation of PhET.
 *
 * A simulation holds the picture of the screen it shows while it loads.
 * That picture used to carry the name and the mark of the house the
 * simulation came from.  Ours is in its place now, and this makes sure
 * that it is really there, that it is ours, and that the old one is
 * gone from every corner of the file.
 *
 *   node tools/check-phet-splash.mjs [--dir mirror/leqixiang/courseware]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const DIR = path.resolve(ROOT, arg('dir', 'mirror/leqixiang/courseware'));

/* the picture the upstream house leaves behind */
const UPSTREAM = 'PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgi';

let missing = 0;
let doubled = 0;
let wrong = 0;
let upstreamFound = 0;
let total = 0;

for (const file of fs.readdirSync(DIR).filter((f) => f.startsWith('phet-') && f.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(DIR, file), 'utf8');
  total++;
  const all = html.match(/window\.PHET_SPLASH_DATA_URI\s*=\s*"([^"]*)"/g) || [];
  if (!all.length) {
    missing++;
    console.log(`  缺加载画面：${file}`);
    continue;
  }
  if (all.length !== 1) {
    doubled++;
    console.log(`  加载画面不止一份：${file}`);
    continue;
  }
  const b64 = all[0].match(/base64,([A-Za-z0-9+/=]+)/)[1];
  const svg = Buffer.from(b64, 'base64').toString('utf8');
  if (!/xlink:href="data:image\/png/.test(svg)) {
    wrong++;
    console.log(`  加载画面里没有我们的图形：${file}`);
  }
  if (/PhET|University of Colorado/i.test(svg)) {
    upstreamFound++;
    console.log(`  加载画面里还有别家的名字：${file}`);
  }
  if (html.includes(UPSTREAM)) {
    upstreamFound++;
    console.log(`  文件里还留着别家那张图：${file}`);
  }
}

console.log(
  `模拟 ${total} 份：缺加载画面 ${missing}，不止一份 ${doubled}，画不对 ${wrong}，还有别家的 ${upstreamFound}`
);
if (missing || doubled || wrong || upstreamFound) process.exitCode = 1;
